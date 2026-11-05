import type { RouteObject } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { EmptyState, PageHeader } from '../../components';

function PatronsPage() {
  return (
    <>
      <PageHeader title="Patrons" />
      <EmptyState
        icon={<BookOpen size={40} />}
        title="Votre bibliothèque est vide"
        description="Importez vos patrons (PDF, images) pour les retrouver ici."
      />
    </>
  );
}

export const routes: RouteObject[] = [{ path: '/patrons', element: <PatronsPage /> }];
