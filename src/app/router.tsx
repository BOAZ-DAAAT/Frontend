import { createBrowserRouter, Navigate } from 'react-router-dom';

import { PlaygroundPage } from '@/pages/PlaygroundPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/playground" replace /> },
  { path: '/playground', element: <PlaygroundPage /> },
]);
