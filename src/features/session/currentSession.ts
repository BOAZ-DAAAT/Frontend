const CURRENT_SESSION_KEY = 'daaat.sessionId';
const LEGACY_SESSION_DB_KEY = 'daaat.sessionDb';

// 현재 선택된 세션 id 조회
export function getCurrentSessionId() {
    return localStorage.getItem(CURRENT_SESSION_KEY);
}

// 세션 생성 시 id 저장
export function setCurrentSessionId(sessionId: string) {
    localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
}

// 연결 해제 또는 세션 종료 시 초기화
export function clearCurrentSession() {
    localStorage.removeItem(CURRENT_SESSION_KEY);
    localStorage.removeItem(LEGACY_SESSION_DB_KEY);
}