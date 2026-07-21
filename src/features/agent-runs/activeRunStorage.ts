const ACTIVE_RUN_KEY = 'daaat.activeRunId';

// 새로고침해도 어떤 run을 보고 있었는지 복원하기 위한 저장
export function getStoredActiveRunId() {
  return localStorage.getItem(ACTIVE_RUN_KEY);
}

export function setStoredActiveRunId(runId: string) {
  localStorage.setItem(ACTIVE_RUN_KEY, runId);
}

export function clearStoredActiveRunId() {
  localStorage.removeItem(ACTIVE_RUN_KEY);
}
