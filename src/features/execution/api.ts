import { apiClient } from '@/lib/apiClient';

import type { PythonExecutionPayload, SqlExecutionPayload, SqlExecutionResult } from './types';

export function runSql(payload: SqlExecutionPayload) {
  return apiClient.post<SqlExecutionResult>('/execution/sql', payload);
}

export function runPython(payload: PythonExecutionPayload) {
  return apiClient.post<unknown>('/execution/python', payload);
}
