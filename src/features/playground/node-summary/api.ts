import { apiClient } from '@/lib/apiClient';

import type { AgentNodeSummaryResponse } from './types';

export function getAgentNodeSummary(runId: string, nodeId: string) {
  return apiClient.get<AgentNodeSummaryResponse>(
    `/agent-runs/${encodeURIComponent(runId)}/nodes/${encodeURIComponent(nodeId)}/summary`,
  );
}

export function getAgentRunArtifactContent(runId: string, artifactId: string) {
  return apiClient.blob(
    `/agent-runs/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(artifactId)}/content`,
  );
}
