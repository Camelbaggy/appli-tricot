import type { RouteObject } from 'react-router-dom';
import { PatronsPage } from './PatronsPage';
import { PatternDetailPage } from './PatternDetailPage';

export const routes: RouteObject[] = [
  { path: '/patrons', element: <PatronsPage /> },
  { path: '/patrons/:id', element: <PatternDetailPage /> },
];
