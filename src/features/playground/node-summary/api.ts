import { apiClient } from '@/lib/apiClient';

import type { AgentNodeSummaryResponse } from './types';

export function getAgentNodeSummary(runId: string, nodeId: string) {
  return apiClient.get<AgentNodeSummaryResponse>(
    `/agent-runs/${encodeURIComponent(runId)}/nodes/${encodeURIComponent(nodeId)}/summary`,
  );
}
