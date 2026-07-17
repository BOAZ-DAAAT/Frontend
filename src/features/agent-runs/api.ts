import { apiClient } from '@/lib/apiClient';

import type { RunEvent, RunStatus, RunSummary } from '@/features/runs/types';

export type AgentRunResponse = {
  run_id: string;
  thread_id: string;
  status: RunStatus;
  query: string;
  session_id: string;
};

export function createAgentRun(sessionId: string, query: string) {
  return apiClient.post<AgentRunResponse>('/agent-runs', {
    session_id: sessionId,
    query,
  });
}

export function getAgentRun(runId: string) {
  return apiClient.get<RunSummary>(`/agent-runs/${encodeURIComponent(runId)}`);
}

export function listAgentRunEvents(runId: string) {
  return apiClient.get<RunEvent[]>(`/agent-runs/${encodeURIComponent(runId)}/events`);
}
