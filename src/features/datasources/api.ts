import { apiClient } from '@/lib/apiClient';

import type {
  DatabasesResponse,
  IngestResponse,
  MySQLConn,
  PreviewResponse,
  TablesResponse,
} from './types';

// ── 원격 MySQL 조회 (/mysql/*)

// 원격 서버의 DB 목록
export function listRemoteDatabases(conn: MySQLConn) {
  return apiClient.post<DatabasesResponse>('/mysql/databases', conn);
}

// 원격 DB의 테이블 목록
export function listRemoteTables(conn: MySQLConn, database: string) {
  return apiClient.post<TablesResponse>('/mysql/tables', { ...conn, database });
}

// 원격 테이블 데이터 미리보기
export function previewRemoteTable(conn: MySQLConn, database: string, table: string, limit = 50) {
  return apiClient.post<PreviewResponse>('/mysql/preview', { ...conn, database, table, limit });
}

// ── 적재 + 로컬 사본 조회 (/storage/*) ──

// 원격 DB 전체 테이블을 서버 로컬 저장소로 복사
export function ingestDatabase(conn: MySQLConn, database: string, targetDatabase?: string) {
  return apiClient.post<IngestResponse>('/storage/ingest', {
    ...conn,
    database,
    target_database: targetDatabase ?? null,
  });
}

// 적재된 사본 DB 목록
export function listLocalDatabases() {
  return apiClient.get<DatabasesResponse>('/storage/databases');
}

// 사본 DB의 테이블 목록
export function listLocalTables(database: string) {
  return apiClient.get<TablesResponse>(`/storage/${encodeURIComponent(database)}/tables`);
}

// 사본 테이블 데이터 미리보기
export function previewLocalTable(database: string, table: string, limit = 50) {
  return apiClient.get<PreviewResponse>(
    `/storage/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/preview?limit=${limit}`,
  );
}