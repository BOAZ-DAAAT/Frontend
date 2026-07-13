import { useEffect, useRef, useState } from 'react';

import { BackendApiError } from '@/lib/apiClient';

import { getCurrentSessionId } from '@/features/session/currentSession';
import type { RunEvent, RunSummary } from '@/features/runs/types';

import { getAgentRun, listAgentRunEvents, startAgentRun } from './api';
import type { ExecutionState } from './types';

const POLL_INTERVAL_MS = 1500;

const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'cancelled']);

export function useExecution() {
  const [state, setState] = useState<ExecutionState>({
    query: '',
    run: null,
    events: [],
    isSubmitting: false,
    error: null,
  });
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const syncRunState = async (runId: string) => {
    const [run, events] = await Promise.all([getAgentRun(runId), listAgentRunEvents(runId)]);
    setState((current) => ({
      ...current,
      run,
      events,
      isSubmitting: false,
    }));
    if (!TERMINAL_STATUSES.has(run.status)) {
      pollTimerRef.current = window.setTimeout(() => {
        void syncRunState(runId);
      }, POLL_INTERVAL_MS);
    }
  };

  const submit = async () => {
    const sessionId = getCurrentSessionId();
    const query = state.query.trim();
    if (!sessionId) {
      setState((current) => ({ ...current, error: '먼저 세션을 선택하거나 생성해주세요.' }));
      return;
    }
    if (!query) {
      setState((current) => ({ ...current, error: '질문을 입력해주세요.' }));
      return;
    }

    stopPolling();
    setState((current) => ({
      ...current,
      isSubmitting: true,
      error: null,
      run: null,
      events: [],
    }));

    try {
      const created = await startAgentRun({ sessionId, query });
      const initialRun: RunSummary = {
        run_id: created.run_id,
        thread_id: created.thread_id,
        project_id: created.session_id,
        status: created.status,
        metadata: { query: created.query, session_id: created.session_id },
      };
      setState((current) => ({
        ...current,
        run: initialRun,
      }));
      await syncRunState(created.run_id);
    } catch (error) {
      const message = error instanceof BackendApiError ? error.message : '실행을 시작하지 못했습니다.';
      setState((current) => ({
        ...current,
        isSubmitting: false,
        error: message,
      }));
    }
  };

  const setQuery = (query: string) => {
    setState((current) => ({ ...current, query, error: null }));
  };

  return {
    ...state,
    setQuery,
    submit,
    isRunning: Boolean(state.run && !TERMINAL_STATUSES.has(state.run.status)),
  };
}
