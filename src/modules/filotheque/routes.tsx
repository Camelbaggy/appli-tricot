import type { RouteObject } from 'react-router-dom';
import { Package } from 'lucide-react';
import { EmptyState, PageHeader } from '../../components';

function FilothequePage() {
  return (
    <>
      <PageHeader title="Laine" />
      <EmptyState
        icon={<Package size={40} />}
        title="Aucune pelote en stock"
        description="Votre filothèque (marques, coloris, métrages) apparaîtra ici."
      />
    </>
  );
}

export const routes: RouteObject[] = [{ path: '/filotheque', element: <FilothequePage /> }];
