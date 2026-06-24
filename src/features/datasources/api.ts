import { apiClient } from '@/lib/apiClient';

import type {
  DatasourceCreatePayload,
  DatasourceCredential,
  DatasourceSampleRows,
  DatasourceSchema,
  DatasourceSummary,
} from './types';

export function listDatasources() {
  return apiClient.get<DatasourceSummary[]>('/datasources');
}

export function createDatasource(payload: DatasourceCreatePayload) {
  return apiClient.post<DatasourceSummary>('/datasources', payload);
}

export function testDatasource(datasourceId: string, credential: DatasourceCredential) {
  return apiClient.post<{ connected: boolean }>(`/datasources/${datasourceId}/test`, { credential });
}

export function getDatasourceSchema(datasourceId: string, credential: DatasourceCredential) {
  return apiClient.post<DatasourceSchema>(`/datasources/${datasourceId}/schema`, { credential });
}

export function getDatasourceSampleRows(datasourceId: string, tableName: string, credential: DatasourceCredential, limit = 20) {
  return apiClient.post<DatasourceSampleRows>(`/datasources/${datasourceId}/tables/${tableName}/sample`, {
    credential,
    limit,
  });
}
