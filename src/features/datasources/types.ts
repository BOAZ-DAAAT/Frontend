// 원격 MySQL 접속정보
export type MySQLConn = {
  host: string;
  port: number;
  user: string;
  password: string;
};

// POST /mysql/databases · GET /storage/databases 응답
export type DatabasesResponse = {
  databases: string[];
};

// POST /mysql/tables · GET /storage/{db}/tables 응답
export type TablesResponse = {
  tables: string[];
};

// POST /mysql/preview · GET /storage/{db}/tables/{t}/preview 응답
export type PreviewResponse = {
  columns: string[];
  rows: Array<Record<string, unknown>>;
};

// POST /storage/ingest 응답
export type IngestResponse = {
  target_database: string;
  tables: Record<string, number>;
};

// ── legacy: 옛 execution feature가 참조 중이라 임시 유지 (정리 예정) ──
export type DatasourceCredential = {
  [key: string]: unknown;
};
