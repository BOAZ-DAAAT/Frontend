import { apiClient } from '@/lib/apiClient';

import type { RunEvent, RunSummary } from '@/features/runs/types';

import type { AgentRunCreatePayload, AgentRunCreateResult } from './types';

export function startAgentRun(payload: AgentRunCreatePayload) {
  return apiClient.post<AgentRunCreateResult>('/agent-runs', {
    session_id: payload.sessionId,
    query: payload.query,
  });
}

export function getAgentRun(runId: string) {
  return apiClient.get<RunSummary>(`/agent-runs/${encodeURIComponent(runId)}`);
}

export function listAgentRunEvents(runId: string) {
  return apiClient.get<RunEvent[]>(`/agent-runs/${encodeURIComponent(runId)}/events`);
}
