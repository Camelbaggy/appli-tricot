import type { RouteObject } from 'react-router-dom';
import { FolderKanban } from 'lucide-react';
import { EmptyState, PageHeader } from '../../components';

function ProjetsPage() {
  return (
    <>
      <PageHeader title="Projets" />
      <EmptyState
        icon={<FolderKanban size={40} />}
        title="Aucun projet pour l’instant"
        description="Vos projets à venir, en cours et terminés apparaîtront ici."
      />
    </>
  );
}

export const routes: RouteObject[] = [{ path: '/projets', element: <ProjetsPage /> }];
