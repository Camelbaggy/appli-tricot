import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { create, db } from '../../db';
import { ProjetsPage } from './ProjetsPage';

describe('ProjetsPage', () => {
  beforeEach(async () => {
    await db.projects.clear();
    await db.patterns.clear();
  });

  it('affiche les compteurs, change d’onglet et crée un projet', async () => {
    const base = { recipientType: 'soi' as const, isPro: false };
    await create(db.projects, { ...base, name: 'Pull', status: 'en_cours' });
    await create(db.projects, { ...base, name: 'Bonnet', status: 'a_venir' });
    await create(db.projects, { ...base, name: 'Écharpe', status: 'termine' });

    render(
      <MemoryRouter>
        <ProjetsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('tab', { name: 'En cours (1)' })).toBeInTheDocument();
    expect(await screen.findByText('Pull')).toBeInTheDocument();
    expect(screen.queryByText('Bonnet')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'À venir (1)' }));
    expect(screen.getByText('Bonnet')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Nouveau projet' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Nom du projet'), 'Cardigan');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Cardigan')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'À venir (2)' })).toBeInTheDocument();
  });
});
