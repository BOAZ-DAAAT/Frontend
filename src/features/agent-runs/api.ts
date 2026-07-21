import { apiClient } from '@/lib/apiClient';

import type { RunStatus, RunSummary } from '@/features/runs/types';

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

export function createAgentRun(sessionId: string, query: string) {
  return apiClient.post<AgentRunResponse>('/agent-runs', {
    session_id: sessionId,
    query,
  });
}

export function getAgentRun(runId: string) {
  return apiClient.get<RunSummary>(`/agent-runs/${encodeURIComponent(runId)}`);
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
