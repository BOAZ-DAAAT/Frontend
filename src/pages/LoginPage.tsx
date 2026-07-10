import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/AuthContext';

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // RequireAuth가 튕겨내며 넘겨준 원래 목적지. 없으면(직접 /login 접근) 기본 /connect
    const from = (location.state as { from?: string } | null)?.from ?? '/connect';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await login(username, password);
            navigate(from, { replace: true }); // replace: 로그인 화면이 뒤로가기 히스토리에 안 남게
        } catch (err) {
            setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // ConnectPage와 동일한 인풋 스타일 — 화면 톤 통일
    const inputClass =
        'mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-brand-500';

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
            <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <h1 className="text-lg font-semibold text-white">DAAAT 로그인</h1>
                <div className="mt-6 space-y-4">
                    <label className="block">
                        <span className="text-sm text-slate-300">아이디</span>
                        <input className={inputClass} value={username} autoFocus
                            onChange={(e) => setUsername(e.target.value)} />
                    </label>
                    <label className="block">
                        <span className="text-sm text-slate-300">비밀번호</span>
                        <input className={inputClass} type="password" value={password}
                            onChange={(e) => setPassword(e.target.value)} />
                    </label>
                    <button type="submit" disabled={loading || !username || !password}
                        className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50">
                        {loading ? '로그인 중...' : '로그인'}
                    </button>
                </div>
                {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            </form>
        </main>
    );
}