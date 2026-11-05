import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DriveImportButton } from './DriveImportButton';
import { ReglagesPage } from './ReglagesPage';
import { SyncStatus } from './SyncStatus';

describe('page Réglages sans configuration Google', () => {
  it('explique que Drive n’est pas configuré et propose la sauvegarde', async () => {
    render(
      <MemoryRouter>
        <ReglagesPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Réglages' })).toBeInTheDocument();
    expect(screen.getByText(/n.est pas configurée/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Se connecter à Google/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Exporter une sauvegarde' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Restaurer une sauvegarde' })).toBeEnabled();
    expect(
      await screen.findByText(/Ce navigateur ne permet pas de gérer le stockage/),
    ).toBeInTheDocument();
  });

  it('SyncStatus affiche « Local seulement » et mène aux réglages', () => {
    render(
      <MemoryRouter>
        <SyncStatus />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /Local seulement/ });
    expect(link).toHaveAttribute('href', '/reglages');
  });

  it('DriveImportButton ne rend rien sans configuration', () => {
    const { container } = render(
      <MemoryRouter>
        <DriveImportButton onImported={() => undefined} />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
