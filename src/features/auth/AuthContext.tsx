import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { login as loginApi } from './api';
import type { AuthUser, StoredAuth } from './types';

const STORAGE_KEY = 'daaat.auth';

// 새로고침 시 로그인 상태를 복원하기 위해 localStorage에서 읽어온다
function readStored(): StoredAuth | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as StoredAuth) : null;
    } catch {
        return null;
    }
}

type AuthContextValue = {
    user: AuthUser | null;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    // 초기값을 함수로 넘겨 컴포넌트가 처음 만들어질 때 딱 한 번만 localStorage를 읽는다
    const [auth, setAuth] = useState<StoredAuth | null>(() => readStored());

    const login = useCallback(async (username: string, password: string) => {
        const res = await loginApi(username, password); // 실패 시 예외를 그대로 던짐 — 화면 표시는 호출부(LoginPage) 책임
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res)); // 새로고침해도 로그인 유지되게 영속화
        setAuth(res); // React 상태도 갱신해서 화면이 즉시 반응하게 함
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setAuth(null);
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({ user: auth?.user ?? null, isAuthenticated: !!auth?.token, login, logout }),
        [auth, login, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider'); // Provider 밖에서 잘못 쓰면 바로 드러나게 함
    return ctx;
}