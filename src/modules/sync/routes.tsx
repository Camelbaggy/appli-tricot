import type { RouteObject } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { EmptyState, PageHeader } from '../../components';

function ReglagesPage() {
  return (
    <>
      <PageHeader title="Réglages" />
      <EmptyState
        icon={<Settings size={40} />}
        title="Synchronisation et sauvegarde"
        description="La synchro Google Drive et la sauvegarde manuelle seront configurées ici."
      />
    </>
  );
}

export const routes: RouteObject[] = [{ path: '/reglages', element: <ReglagesPage /> }];
