import { apiClient } from '@/lib/apiClient';

import type { AgentNodeReportResponse, AgentReportListResponse } from './types';

export function createAgentNodeReport(runId: string, nodeId: string) {
  return apiClient.post<AgentNodeReportResponse>(
    `/agent-runs/${encodeURIComponent(runId)}/nodes/${encodeURIComponent(nodeId)}/report`,
    {},
  );
}

export function listAgentReports(sessionId: string) {
  const query = new URLSearchParams({ session_id: sessionId });
  return apiClient.get<AgentReportListResponse>(`/agent-runs/reports?${query}`);
}
