import type { RouteObject } from 'react-router-dom';
import { FilothequePage } from './FilothequePage';
import { StashItemPage } from './StashItemPage';

export const routes: RouteObject[] = [
  { path: '/filotheque', element: <FilothequePage /> },
  { path: '/filotheque/:stashItemId', element: <StashItemPage /> },
];
