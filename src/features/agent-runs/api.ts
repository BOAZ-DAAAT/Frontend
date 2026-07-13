import { apiClient } from '@/lib/apiClient';

export type AgentRunResponse = {
  run_id: string;
  thread_id: string;
  status: string;
  query: string;
  session_id: string;
};

export function createAgentRun(sessionId: string, query: string) {
  return apiClient.post<AgentRunResponse>('/agent-runs', {
    session_id: sessionId,
    query,
  });
}
