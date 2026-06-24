import { apiClient } from '@/lib/apiClient';

import type { ArtifactLineage, ArtifactPreview, ArtifactSummary } from './types';

export function listArtifacts(runId?: string) {
  return apiClient.post<ArtifactSummary[]>('/artifacts/list', { run_id: runId });
}

export function getArtifact(artifactId: string) {
  return apiClient.post<ArtifactSummary>('/artifacts/get', { artifact_id: artifactId });
}

export function previewArtifact(artifactId: string) {
  return apiClient.post<ArtifactPreview>('/artifacts/preview', { artifact_id: artifactId });
}

export function getArtifactLineage(artifactId: string) {
  return apiClient.post<ArtifactLineage>('/artifacts/lineage', { artifact_id: artifactId });
}
