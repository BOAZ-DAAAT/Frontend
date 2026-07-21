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

export function branchAgentRun(runId: string, startStage: BranchStage, instruction: string) {
  return apiClient.post<AgentRunBranchResponse>(
    `/agent-runs/${encodeURIComponent(runId)}/branch`,
    {
      start_stage: startStage,
      instruction,
    },
  );
}
