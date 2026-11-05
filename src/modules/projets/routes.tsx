import type { RouteObject } from 'react-router-dom';
import { ProjetsPage } from './ProjetsPage';
import { ProjectDetailPage } from './ProjectDetailPage';

export const routes: RouteObject[] = [
  { path: '/projets', element: <ProjetsPage /> },
  { path: '/projets/:id', element: <ProjectDetailPage /> },
];
