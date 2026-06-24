export type ArtifactType = 'dataset' | 'chart' | 'report' | 'model' | 'file';

export type ArtifactSummary = {
  artifact_id: string;
  type: ArtifactType;
  name?: string;
  run_id?: string;
  metadata?: Record<string, unknown>;
};

export type ArtifactPreview = {
  artifact_id: string;
  content: unknown;
};

export type ArtifactLineage = {
  artifact_id: string;
  parent_artifact_ids: string[];
  child_artifact_ids: string[];
};
