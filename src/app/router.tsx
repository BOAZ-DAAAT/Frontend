import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { ArtifactsPage } from '@/pages/ArtifactsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DatasourcesPage } from '@/pages/DatasourcesPage';
import { RunsPage } from '@/pages/RunsPage';
import { WorkspacePage } from '@/pages/WorkspacePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'datasources', element: <DatasourcesPage /> },
      { path: 'workspace', element: <WorkspacePage /> },
      { path: 'runs', element: <RunsPage /> },
      { path: 'artifacts', element: <ArtifactsPage /> },
    ],
  },
]);
