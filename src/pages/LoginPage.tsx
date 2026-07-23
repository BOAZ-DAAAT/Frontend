import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, UserRound } from 'lucide-react';

import daaatLogo from '@/assets/daaat-logo.svg';
import { useAuth } from '@/features/auth/AuthContext';

import { BlobOrb } from './BlobPage';
import styles from './LoginPage.module.css';

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isExiting, setIsExiting] = useState(false);
    const [nextPath, setNextPath] = useState<string | null>(null);

    // RequireAuth가 튕겨내며 넘겨준 원래 목적지. 없으면(직접 /login 접근) 기본 /connect
    const from = (location.state as { from?: string } | null)?.from ?? '/sessions';

    useEffect(() => {
        if (!isExiting || !nextPath) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const timer = window.setTimeout(() => {
            navigate(nextPath, { replace: true });
        }, reduceMotion ? 0 : 520);

        return () => window.clearTimeout(timer);
    }, [isExiting, navigate, nextPath]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading || isExiting) return;

        setLoading(true);
        setError(null);
        try {
            await login(username, password);
            setNextPath(from);
            setIsExiting(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
            setLoading(false);
        }
    };

    return (
        <main className={`${styles.page} ${isExiting ? styles.pageExiting : ''}`}>
            <div className={styles.loginLayer}>
                <form onSubmit={handleSubmit} className={styles.panel}>
                    <div className={styles.surface}>
                        <header className={styles.intro}>
                            <h1 className={styles.visuallyHidden}>DAAAT</h1>
                            <img className={styles.brandLogo} src={daaatLogo} alt="DAAAT" />
                        </header>

                        <div className={styles.fields}>
                            <div className={styles.field}>
                                <div className={styles.inputWrap}>
                                    <UserRound aria-hidden />
                                    <input
                                        value={username}
                                        autoFocus
                                        autoComplete="username"
                                        aria-label="아이디"
                                        placeholder="ID"
                                        onChange={(event) => setUsername(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className={styles.field}>
                                <div className={styles.inputWrap}>
                                    <LockKeyhole aria-hidden />
                                    <input
                                        type="password"
                                        value={password}
                                        autoComplete="current-password"
                                        aria-label="비밀번호"
                                        placeholder="Password"
                                        onChange={(event) => setPassword(event.target.value)}
                                    />
                                    <button type="button" className={styles.forgotButton}>
                                        비밀번호 찾기
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error ? <p className={styles.error} role="alert">{error}</p> : null}

                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={loading || isExiting}
                            aria-busy={loading || isExiting}
                        >
                            <span>{loading ? '로그인 중...' : '로그인'}</span>
                        </button>

                        <p className={styles.signupPrompt}>
                            <span>계정이 없으신가요?</span>
                            <button type="button" className={styles.textButton}>회원가입</button>
                        </p>
                    </div>
                </form>

                <div className={styles.visualFrame} aria-hidden>
                    <div className={styles.visualPanel}>
                        <div className={styles.blobStage}>
                            <BlobOrb
                                active={false}
                                motion={0.48}
                                speed={0.42}
                                label="잔잔하고 느리게 흐르는 비활성 컬러 유체 블롭"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
