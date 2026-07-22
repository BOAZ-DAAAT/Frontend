import { apiClient } from '@/lib/apiClient';

import type {
    Session,
    SessionCreatePayload,
    SessionCreateResponse,
    SessionListResponse,
    SessionTablePreviewParams,
    SessionTablePreviewResponse,
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

// 테이블 선택 시 정렬된 페이지 조회
export function previewSessionTable({
    sessionId,
    table,
    limit = 50,
    sortBy,
    sortOrder = 'asc',
    cursor,
    signal,
}: SessionTablePreviewParams) {
    const query = new URLSearchParams({ limit: String(limit) });
    if (sortBy) {
        query.set('sort_by', sortBy);
        query.set('sort_order', sortOrder);
    }
    if (cursor) query.set('cursor', cursor);

    return apiClient.get<SessionTablePreviewResponse>(
        `/sessions/${encodeURIComponent(sessionId)}/tables/${encodeURIComponent(table)}/preview?${query}`,
        { signal },
    );
}

export function downloadSessionTableCsv({
    sessionId,
    table,
    sortBy,
    sortOrder = 'asc',
}: Pick<SessionTablePreviewParams, 'sessionId' | 'table' | 'sortBy' | 'sortOrder'>) {
    const query = new URLSearchParams();
    if (sortBy) {
        query.set('sort_by', sortBy);
        query.set('sort_order', sortOrder);
    }
    const suffix = query.size > 0 ? `?${query}` : '';

    return apiClient.blob(
        `/sessions/${encodeURIComponent(sessionId)}/tables/${encodeURIComponent(table)}/export.csv${suffix}`,
    );
}

// 데이터 마트 초기화 
export function resetSessionMart(sessionId: string) {
    return apiClient.post<Session>(`/sessions/${encodeURIComponent(sessionId)}/reset`, {});
}
