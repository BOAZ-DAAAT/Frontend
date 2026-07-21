import { useEffect, useState } from 'react';

import type { RunEvent, RunSummary } from '@/features/runs/types';
import { BackendApiError } from '@/lib/apiClient';

import { getAgentRun } from './api';
import { streamAgentRunEvents } from './eventStream';

const RECONNECT_DELAY_MS = 1500;

type UseAgentRunStreamOptions = {
  enabled?: boolean;
};

type AgentRunStreamState = {
  run: RunSummary | null;
  events: RunEvent[];
  isStreaming: boolean;
  error: string | null;
};

function appendEvent(events: RunEvent[], nextEvent: RunEvent): RunEvent[] {
  const index = events.findIndex((event) => event.event_id === nextEvent.event_id);
  if (index === -1) return [...events, nextEvent];
  return events.map((event, eventIndex) => (
    eventIndex === index ? nextEvent : event
  ));
}

function statusFromEvent(event: RunEvent): RunSummary['status'] | null {
  if (event.event_type === 'human_input.required') return 'waiting_input';
  if (event.event_type === 'human_input.resumed') return 'running';
  return null;
}

function reconnectDelay(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, RECONNECT_DELAY_MS);
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

export function useAgentRunStream(
  runId: string | null,
  { enabled = true }: UseAgentRunStreamOptions = {},
): AgentRunStreamState {
  const [state, setState] = useState<AgentRunStreamState>({
    run: null,
    events: [],
    isStreaming: false,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    if (!runId || !enabled) {
      setState({ run: null, events: [], isStreaming: false, error: null });
      return () => controller.abort();
    }

    let lastEventId: string | undefined;

    const connect = async () => {
      try {
        const run = await getAgentRun(runId);
        if (controller.signal.aborted) return;
        setState({ run, events: [], isStreaming: true, error: null });

        while (!controller.signal.aborted) {
          try {
            for await (const message of streamAgentRunEvents(runId, {
              signal: controller.signal,
              lastEventId,
            })) {
              if (controller.signal.aborted) return;

              if (message.type === 'run.event') {
                lastEventId = message.id;
                const nextStatus = statusFromEvent(message.data);
                setState((current) => ({
                  ...current,
                  run: current.run && nextStatus
                    ? {
                        ...current.run,
                        status: nextStatus,
                        metadata: {
                          ...current.run.metadata,
                          ...message.data.metadata,
                        },
                      }
                    : current.run,
                  events: appendEvent(current.events, message.data),
                  isStreaming: true,
                  error: null,
                }));
              } else {
                setState((current) => ({
                  ...current,
                  run: current.run
                    ? { ...current.run, status: message.data.status }
                    : current.run,
                  isStreaming: false,
                  error: null,
                }));
                return;
              }
            }
          } catch (error) {
            if (controller.signal.aborted) return;
            if (error instanceof BackendApiError && error.status < 500) {
              throw error;
            }
            setState((current) => ({
              ...current,
              isStreaming: false,
              error: '실시간 연결이 끊어져 다시 연결하고 있습니다.',
            }));
          }

          await reconnectDelay(controller.signal);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof BackendApiError
          ? error.message
          : '실행 상태를 불러오지 못했습니다.';
        setState((current) => ({
          ...current,
          isStreaming: false,
          error: message,
        }));
      }
    };

    void connect();
    return () => controller.abort();
  }, [enabled, runId]);

  return state;
}
