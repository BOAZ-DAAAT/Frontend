import type { DatasourceCredential } from '@/features/datasources/types';

export type SqlExecutionPayload = {
  query: string;
  run_id: string;
  datasource_id: string;
  credential: DatasourceCredential;
  row_limit?: number;
};

export type PythonExecutionPayload = {
  code: string;
  run_id: string;
  input_artifact_ids?: string[];
};

export type SqlExecutionResult = {
  columns?: string[];
  rows?: Array<Record<string, unknown>>;
  artifact_id?: string;
};
