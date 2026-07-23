import { apiClient } from '@/lib/apiClient';

import type { RunEvent, RunStatus, RunSummary } from '@/features/runs/types';

export type AgentRunResponse = {
  run_id: string;
  thread_id: string;
  status: RunStatus;
  query: string;
  session_id: string;
};

export type AgentRunResumeResponse = {
  run_id: string;
  thread_id: string;
  status: 'running';
  resume_type: 'clarification' | 'analysis_review' | 'approval';
};

export type BranchStage = 'sql' | 'eda' | 'analysis' | 'insight';

export type AgentRunBranchResponse = {
  run_id: string;
  thread_id: string;
  status: 'created';
  start_stage: BranchStage;
  source_run_id: string;
};

export type AgentRunDeleteResponse = {
  run_id: string;
  deleted_event_count: number;
  deleted_artifact_count: number;
};

export type AgentRunCancelResponse = {
  run_id: string;
  status: 'cancelled';
  discarded_node_id: string | null;
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

export function deleteAgentRun(runId: string) {
  return apiClient.delete<AgentRunDeleteResponse>(`/agent-runs/${encodeURIComponent(runId)}`);
}

export function cancelAgentRun(runId: string) {
  return apiClient.post<AgentRunCancelResponse>(
    `/agent-runs/${encodeURIComponent(runId)}/cancel`,
    {},
  );
}

export function listAgentRunEvents(runId: string) {
  return apiClient.get<RunEvent[]>(`/agent-runs/${encodeURIComponent(runId)}/events`);
}

export function listAgentRunRelatedEvents(runId: string) {
  return apiClient.get<RunEvent[]>(`/agent-runs/${encodeURIComponent(runId)}/related-events`);
}

export function listAgentSessionEvents(sessionId: string) {
  return apiClient.get<RunEvent[]>(
    `/agent-runs/session-events?session_id=${encodeURIComponent(sessionId)}`,
  );
}

export function resumeAgentRun(runId: string, answer: string) {
  return apiClient.post<AgentRunResumeResponse>(
    `/agent-runs/${encodeURIComponent(runId)}/resume`,
    {
      type: 'clarification',
      answer,
    },
  );
}

export function resumeAgentRunApproval(runId: string, approved: boolean, reason?: string) {
  return apiClient.post<AgentRunResumeResponse>(
    `/agent-runs/${encodeURIComponent(runId)}/resume`,
    {
      type: 'approval',
      approved,
      ...(reason ? { reason } : {}),
    },
  );
}

export function branchAgentRun(
  runId: string,
  startStage: BranchStage,
  instruction: string,
  parentNodeId?: string | null,
) {
  return apiClient.post<AgentRunBranchResponse>(
    `/agent-runs/${encodeURIComponent(runId)}/branch`,
    {
      start_stage: startStage,
      instruction,
      ...(parentNodeId ? { parent_node_id: parentNodeId } : {}),
    },
  );
}
