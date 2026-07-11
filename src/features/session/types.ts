import type { MySQLConn, PreviewResponse, TablesResponse } from '@/features/datasources/types';

export type Session = {
    id: string;
    username: string;
    title: string;
    source_host: string;
    source_port: number;
    source_user: string;
    source_database: string;
    session_db: string;
    mart_db: string;
    status: string;
    created_at: string | null;
    updated_at: string | null;
    last_opened_at: string | null;
};

export type SessionCreatePayload = MySQLConn & {
    database: string;
    title?: string | null;
};

export type SessionCreateResponse = {
    session: Session;
    tables: Record<string, number>;
};

export type SessionListResponse = {
    sessions: Session[];
};

export type { PreviewResponse, TablesResponse };