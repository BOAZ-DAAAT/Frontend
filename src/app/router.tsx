import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShell } from '@/app/AppShell';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { BlobPage } from '@/pages/BlobPage';
import { ComposerPage } from '@/pages/ComposerPage';
import { ConnectPage } from '@/pages/ConnectPage';
import { LoginPage } from '@/pages/LoginPage';
import { MockupPage } from '@/pages/MockupPage';
import { NodePage } from '@/pages/NodePage';
import { PlaygroundPage } from '@/pages/PlaygroundPage';
import { PlaygroundTestPage } from '@/pages/PlaygroundTestPage';

export const router = createBrowserRouter([{
  element: <AppShell />,
  children: [
    { path: '/', element: <Navigate to="/sessions" replace /> },
    { path: '/login', element: <LoginPage /> }, // 보호 안 함 — 로그인 자체를 막으면 안 됨
    { path: '/blob', element: <BlobPage /> },
    { path: '/composer', element: <ComposerPage /> },
    { path: '/node', element: <NodePage /> },
    { path: '/sessions', element: <RequireAuth><PlaygroundPage initialView="sessions" /></RequireAuth> },
    { path: '/connect', element: <RequireAuth><ConnectPage /></RequireAuth> },
    { path: '/playground', element: <RequireAuth><PlaygroundPage /></RequireAuth> },
    { path: '/mockup', element: <MockupPage /> },
    { path: '/playground-test', element: <PlaygroundTestPage /> },
  ],
},
]);
