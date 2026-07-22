import { createBrowserRouter, Navigate } from 'react-router-dom';

import { RequireAuth } from '@/features/auth/RequireAuth';
import { ConnectPage } from '@/pages/ConnectPage';
import { BlobPage } from '@/pages/BlobPage';
import { LoginPage } from '@/pages/LoginPage';
import { PlaygroundPage } from '@/pages/PlaygroundPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/sessions" replace /> },
  { path: '/login', element: <LoginPage /> }, // 보호 안 함 — 로그인 자체를 막으면 안 됨
  { path: '/blob', element: <BlobPage /> },
  { path: '/sessions', element: <RequireAuth><PlaygroundPage initialView="sessions" /></RequireAuth> },
  { path: '/connect', element: <RequireAuth><ConnectPage /></RequireAuth> },
  { path: '/playground', element: <RequireAuth><PlaygroundPage /></RequireAuth> },
]);
