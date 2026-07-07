import { createBrowserRouter, Navigate } from 'react-router-dom';

import { ConnectPage } from '@/pages/ConnectPage';
import { PlaygroundPage } from '@/pages/PlaygroundPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/connect" replace /> },
  { path: '/connect', element: <ConnectPage /> },
  { path: '/playground', element: <PlaygroundPage /> },
]);