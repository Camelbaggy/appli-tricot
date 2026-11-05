import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { routes as projets } from '../modules/projets/routes';
import { routes as patrons } from '../modules/patrons/routes';
import { routes as filotheque } from '../modules/filotheque/routes';
import { routes as tricot } from '../modules/tricot/routes';
import { routes as sync } from '../modules/sync/routes';

// Pour ajouter un module : importer ses routes ci-dessus et les ajouter à ce tableau.
const moduleRoutes: RouteObject[] = [...projets, ...patrons, ...filotheque, ...tricot, ...sync];

export const appRoutes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/projets" replace /> },
      ...moduleRoutes,
      { path: '*', element: <Navigate to="/projets" replace /> },
    ],
  },
];
