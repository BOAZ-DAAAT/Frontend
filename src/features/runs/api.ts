import { apiClient } from '@/lib/apiClient';

import type { RunCreatePayload, RunEvent, RunSummary } from './types';

export function createRun(payload: RunCreatePayload) {
  return apiClient.post<RunSummary>('/runs/create', payload);
}

export function listRuns() {
  return apiClient.post<RunSummary[]>('/runs/list', {});
}

export function getRun(runId: string) {
  return apiClient.post<RunSummary>('/runs/get', { run_id: runId });
}

export function listRunEvents(runId: string) {
  return apiClient.post<RunEvent[]>('/runs/events/list', { run_id: runId });
}
