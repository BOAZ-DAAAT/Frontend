import { useEffect, useRef, useState } from 'react';

import { BackendApiError } from '@/lib/apiClient';
import type { RunEvent, RunSummary } from '@/features/runs/types';

import { getAgentRun, listAgentRunEvents } from './api';

const POLL_INTERVAL_MS = 1500;
const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'cancelled']);

type UseAgentRunPollingOptions = {
  enabled?: boolean;
};

type AgentRunPollingState = {
  run: RunSummary | null;
  events: RunEvent[];
  isPolling: boolean;
  error: string | null;
};

export function useAgentRunPolling(
  runId: string | null,
  { enabled = true }: UseAgentRunPollingOptions = {},
): AgentRunPollingState {
  const [state, setState] = useState<AgentRunPollingState>({
    run: null,
    events: [],
    isPolling: false,
    error: null,
  });
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const stopPolling = () => {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    if (!runId || !enabled) {
      stopPolling();
      setState({ run: null, events: [], isPolling: false, error: null });
      return stopPolling;
    }

    const syncRunState = async () => {
      setState((current) => ({ ...current, isPolling: true, error: null }));
      try {
        const [run, events] = await Promise.all([
          getAgentRun(runId),
          listAgentRunEvents(runId),
        ]);
        if (cancelled) return;

        const shouldContinue = !TERMINAL_STATUSES.has(run.status);
        setState({ run, events, isPolling: shouldContinue, error: null });
        if (shouldContinue) {
          pollTimerRef.current = window.setTimeout(() => {
            void syncRunState();
          }, POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof BackendApiError
          ? error.message
          : '실행 상태를 불러오지 못했습니다.';
        setState((current) => ({ ...current, isPolling: false, error: message }));
      }
    };

    void syncRunState();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [enabled, runId]);

  return state;
}
