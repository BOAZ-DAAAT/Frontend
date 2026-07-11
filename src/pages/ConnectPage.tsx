import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { listRemoteDatabases } from '@/features/datasources/api';
import type { MySQLConn } from '@/features/datasources/types';
import { createSession } from '@/features/session/api';
import { setCurrentSessionId } from '@/features/session/currentSession';
import type { SessionCreateResponse } from '@/features/session/types';

// 서비스 진입 화면: 원격 MySQL 접속 → DB 선택·적재 → playground 이동
export function ConnectPage() {
    const navigate = useNavigate();

    // 접속 폼 입력값
    const [host, setHost] = useState('');
    const [port, setPort] = useState(3306);
    const [user, setUser] = useState('');
    const [password, setPassword] = useState('');

    // 진행 상태 (null = 아직 그 단계 전)
    const [databases, setDatabases] = useState<string[] | null>(null);
    const [selectedDb, setSelectedDb] = useState('');
    const [sessionResult, setSessionResult] = useState<SessionCreateResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const conn: MySQLConn = { host, port, user, password };

    // 1단계: 연결 → 원격 DB 목록 받기
    const handleConnect = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await listRemoteDatabases(conn);
            setDatabases(res.databases);
            setSelectedDb(res.databases[0] ?? '');
        } catch (e) {
            setError(e instanceof Error ? e.message : '연결에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 2단계: 선택한 DB를 서버 저장소로 적재
    const handleIngest = async () => {
        if (!selectedDb) return;
        setLoading(true);
        setError(null);
        try {
            const res = await createSession({
                ...conn,
                database: selectedDb,
            });
            setCurrentSessionId(res.session.id);
            setSessionResult(res);
        } catch (e) {
            setError(e instanceof Error ? e.message : '연결에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        'mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-brand-500';

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <h1 className="text-lg font-semibold text-white">원격 MySQL 연결</h1>

                {/* ── 1단계: 접속 폼 (연결 전에만) ── */}
                {databases === null && (
                    <div className="mt-6 space-y-4">
                        <label className="block">
                            <span className="text-sm text-slate-300">Host</span>
                            <input className={inputClass} placeholder="ex. 1.2.3.4" value={host}
                                onChange={(e) => setHost(e.target.value)} />
                        </label>
                        <label className="block">
                            <span className="text-sm text-slate-300">Port</span>
                            <input className={inputClass} type="number" value={port}
                                onChange={(e) => setPort(Number(e.target.value))} />
                        </label>
                        <label className="block">
                            <span className="text-sm text-slate-300">User</span>
                            <input className={inputClass} placeholder="ex. root" value={user}
                                onChange={(e) => setUser(e.target.value)} />
                        </label>
                        <label className="block">
                            <span className="text-sm text-slate-300">Password</span>
                            <input className={inputClass} type="password" value={password}
                                onChange={(e) => setPassword(e.target.value)} />
                        </label>
                        <button
                            className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                            onClick={handleConnect} disabled={loading}>
                            {loading ? '연결 중...' : '연결'}
                        </button>
                    </div>
                )}

                {/* ── 2단계: DB 선택 + 적재 (연결 후, 적재 전) ── */}
                {databases !== null && sessionResult === null && (
                    <div className="mt-6 space-y-4">
                        <p className="text-sm text-slate-300">분석할 데이터베이스를 선택하세요.</p>
                        <select className={inputClass} value={selectedDb}
                            onChange={(e) => setSelectedDb(e.target.value)}>
                            {databases.map((db) => (
                                <option key={db} value={db}>{db}</option>
                            ))}
                        </select>
                        <button
                            className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                            onClick={handleIngest} disabled={loading || !selectedDb}>
                            {loading ? '적재 중... (데이터 양에 따라 시간이 걸립니다)' : '이 DB로 분석 시작 (적재)'}
                        </button>
                    </div>
                )}

                {/* ── 3단계: 적재 결과 + 이동 ── */}
                {sessionResult !== null && (
                    <div className="mt-6 space-y-4">
                        <p className="text-sm text-emerald-400">
                            세션 생성 완료: {sessionResult.session.title}
                        </p>
                        <ul className="space-y-1 text-sm text-slate-300">
                            {Object.entries(sessionResult.tables).map(([table, count]) => (
                                <li key={table}>{table} — {count.toLocaleString()}행</li>
                            ))}
                        </ul>
                        <button
                            className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
                            onClick={() => navigate('/playground')}>
                            Playground로 이동
                        </button>
                    </div>
                )}

                {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            </div>
        </main>
    );
}