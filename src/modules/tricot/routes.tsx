import type { RouteObject } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { EmptyState, PageHeader } from '../../components';

function TricotPage() {
  return (
    <>
      <PageHeader title="Outils" />
      <EmptyState
        icon={<Wrench size={40} />}
        title="Boîte à outils"
        description="Chronomètre, compte-rangs, journal de bord et liseuse de grilles arriveront ici."
      />
    </>
  );
}

export const routes: RouteObject[] = [{ path: '/tricot', element: <TricotPage /> }];
