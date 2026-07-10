import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from './AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    const location = useLocation(); // 로그인 후 원래 가려던 경로로 되돌리기 위해 현재 위치를 기억해둔다

    if (!isAuthenticated) {
        // replace: true로 이동해야 뒤로가기 눌러도 보호된 페이지로 안 돌아옴
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return <>{children}</>;
}