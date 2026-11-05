import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { create, db } from '../../db';
import { PatronsPage } from './PatronsPage';

describe('PatronsPage', () => {
  beforeEach(async () => {
    await db.projects.clear();
    await db.patterns.clear();
  });

  it('filtre par recherche, catégorie et déjà tricoté', async () => {
    const base = { tags: [], fileIds: [] };
    await create(db.patterns, {
      ...base,
      title: 'Pull Marin',
      designer: 'Élodie',
      category: 'femme',
    });
    await create(db.patterns, { ...base, title: 'Bonnet', category: 'accessoire', knitted: true });
    const plaid = await create(db.patterns, { ...base, title: 'Plaid', category: 'maison' });
    await create(db.projects, {
      name: 'Mon plaid',
      status: 'termine',
      recipientType: 'soi',
      isPro: false,
      patternId: plaid.id,
    });

    render(
      <MemoryRouter>
        <PatronsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Pull Marin')).toBeInTheDocument();
    expect(screen.getByText('Bonnet')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Pas encore' }));
    expect(screen.getByText('Pull Marin')).toBeInTheDocument();
    expect(screen.queryByText('Plaid')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Déjà tricoté' }));
    expect(await screen.findByText('Plaid')).toBeInTheDocument();
    expect(screen.queryByText('Pull Marin')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tous' }));
    await userEvent.click(screen.getByRole('button', { name: 'Maison' }));
    expect(screen.queryByText('Bonnet')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Toutes' }));
    await userEvent.type(screen.getByRole('searchbox'), 'elodie');
    expect(screen.queryByText('Plaid')).not.toBeInTheDocument();
    expect(screen.getByText('Pull Marin')).toBeInTheDocument();
  });
});
