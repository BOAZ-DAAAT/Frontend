import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { listSessions } from '@/features/session/api';
import { setCurrentSessionId } from '@/features/session/currentSession';
import type { Session } from '@/features/session/types';

function formatDate(value: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
}

export function SessionsPage() {
    const navigate = useNavigate();

    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const res = await listSessions();
                if (!cancelled) setSessions(res.sessions);
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : '세션 목록을 불러오지 못했습니다.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    const openSession = (session: Session) => {
        setCurrentSessionId(session.id);
        navigate('/playground');
    };

    return (
        <main className="min-h-screen bg-slate-950 p-6 text-white">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">분석 세션</h1>
                        <p className="mt-1 text-sm text-slate-400">
                            이전에 연결한 데이터베이스를 다시 열거나 새 분석 세션을 시작하세요.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
                        onClick={() => navigate('/connect')}
                    >
                        새 세션 만들기
                    </button>
                </header>

                {loading && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-slate-400">
                        세션 목록을 불러오는 중...
                    </div>
                )}

                {error && (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
                        {error}
                    </div>
                )}

                {!loading && !error && sessions.length === 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                        <h2 className="text-base font-semibold">아직 세션이 없습니다</h2>
                        <p className="mt-2 text-sm text-slate-400">
                            원격 MySQL 데이터베이스를 연결해 첫 분석 세션을 만들어 보세요.
                        </p>
                        <button
                            type="button"
                            className="mt-5 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
                            onClick={() => navigate('/connect')}
                        >
                            새 세션 만들기
                        </button>
                    </div>
                )}

                {!loading && !error && sessions.length > 0 && (
                    <div className="grid gap-3">
                        {sessions.map((session) => (
                            <button
                                key={session.id}
                                type="button"
                                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-brand-500/70 hover:bg-white/[0.07]"
                                onClick={() => openSession(session)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-base font-semibold text-white">
                                            {session.title}
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-400">
                                            원본 DB: {session.source_database}
                                        </p>
                                    </div>

                                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                                        {session.status}
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                                    <span>Host: {session.source_host}</span>
                                    <span>생성: {formatDate(session.created_at)}</span>
                                    <span>최근 열람: {formatDate(session.last_opened_at)}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}