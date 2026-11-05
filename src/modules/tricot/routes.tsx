import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { TricotDashboard } from './TricotDashboard';

// La liseuse (et pdf.js) est chargée à la demande pour ne pas alourdir le démarrage.
const ReaderPage = lazy(() => import('./ReaderPage'));

export const routes: RouteObject[] = [
  { path: '/tricot', element: <TricotDashboard /> },
  {
    path: '/tricot/liseuse/:fileId',
    element: (
      <Suspense fallback={<p className="p-4">Chargement…</p>}>
        <ReaderPage />
      </Suspense>
    ),
  },
];
