import { apiClient } from '@/lib/apiClient';

import type {
    PreviewResponse,
    Session,
    SessionCreatePayload,
    SessionCreateResponse,
    SessionListResponse,
    TablesResponse,
} from './types';

// 원격 DB 선택 시 호출 되어 세션 생성
export function createSession(payload: SessionCreatePayload) {
    return apiClient.post<SessionCreateResponse>('/sessions', payload);
}

// 생성된 세션 목록 조회
export function listSessions() {
    return apiClient.get<SessionListResponse>('/sessions');
}

// 세션 선택 시 정보 조회
export function getSession(sessionId: string) {
    return apiClient.get<Session>(`/sessions/${encodeURIComponent(sessionId)}`);
}

// 세션이 가지고 있는 테이블 목록
export function listSessionTables(sessionId: string) {
    return apiClient.get<TablesResponse>(`/sessions/${encodeURIComponent(sessionId)}/tables`);
}

// 테이블 선택 시 샘플 조회
export function previewSessionTable(sessionId: string, table: string, limit = 50) {
    return apiClient.get<PreviewResponse>(
        `/sessions/${encodeURIComponent(sessionId)}/tables/${encodeURIComponent(table)}/preview?limit=${limit}`,
    );
}

// 데이터 마트 초기화 
export function resetSessionMart(sessionId: string) {
    return apiClient.post<Session>(`/sessions/${encodeURIComponent(sessionId)}/reset`, {});
}