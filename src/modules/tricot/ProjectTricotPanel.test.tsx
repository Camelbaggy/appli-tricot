import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { create, db, getActive } from '../../db';
import { ProjectTricotPanel } from './index';
import { TricotDashboard } from './TricotDashboard';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('ProjectTricotPanel', () => {
  it('démarre et arrête le chrono, une seule session ouverte', async () => {
    const user = userEvent.setup();
    await create(db.workSessions, { projectId: 'autre', startedAt: Date.now() - 60_000 });
    render(<ProjectTricotPanel projectId="p1" />);
    await user.click(await screen.findByRole('button', { name: 'Démarrer le chronomètre' }));
    expect(await screen.findByRole('button', { name: 'Pause' })).toBeInTheDocument();
    const open = (await getActive(db.workSessions)).filter((s) => s.endedAt === undefined);
    expect(open).toHaveLength(1);
    expect(open[0]!.projectId).toBe('p1');
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(await screen.findByRole('button', { name: 'Démarrer le chronomètre' })).toBeVisible();
  });

  it('gère un compteur avec objectif, bornes et remise à zéro confirmée', async () => {
    const user = userEvent.setup();
    render(<ProjectTricotPanel projectId="p1" />);
    await user.click(await screen.findByRole('button', { name: /Compteur/ }));
    await user.type(screen.getByLabelText('Libellé'), 'Manche');
    await user.type(screen.getByLabelText(/Objectif/), '50');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    const group = await screen.findByRole('group', { name: 'Compteur Manche' });
    expect(within(group).getByTestId('counter-value')).toHaveTextContent(
      'Rang 0 / 50 · 50 restants',
    );
    await user.click(within(group).getByRole('button', { name: 'Moins un, Manche' }));
    await user.click(within(group).getByRole('button', { name: 'Plus un, Manche' }));
    await user.click(within(group).getByRole('button', { name: 'Plus un, Manche' }));
    expect(await within(group).findByText('Rang 2 / 50 · 48 restants')).toBeInTheDocument();

    await user.click(within(group).getByRole('button', { name: /Remettre Manche à zéro/ }));
    await user.click(screen.getByRole('button', { name: 'Remettre à zéro' }));
    expect(await within(group).findByText('Rang 0 / 50 · 50 restants')).toBeInTheDocument();
  });

  it('ajoute une note de journal', async () => {
    const user = userEvent.setup();
    render(<ProjectTricotPanel projectId="p1" />);
    await user.click(await screen.findByRole('button', { name: /Note/ }));
    await user.type(screen.getByLabelText('Note'), 'Jersey terminé');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Jersey terminé')).toBeInTheDocument();
  });
});

describe('TricotDashboard', () => {
  it('liste les projets en cours et le chrono en marche', async () => {
    const user = userEvent.setup();
    const p = await create(db.projects, {
      name: 'Pull test',
      status: 'en_cours',
      recipientType: 'soi',
      isPro: false,
    });
    await create(db.projects, {
      name: 'Écharpe terminée',
      status: 'termine',
      recipientType: 'soi',
      isPro: false,
    });
    render(
      <MemoryRouter>
        <TricotDashboard />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Pull test')).toBeInTheDocument();
    expect(screen.queryByText('Écharpe terminée')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Pull test/ })[0]).toHaveAttribute(
      'href',
      `/projets/${p.id}`,
    );
    await user.click(screen.getByRole('button', { name: 'Démarrer : Pull test' }));
    expect(
      await screen.findByRole('status', { name: 'Chronomètre en marche' }),
    ).toBeInTheDocument();
  });
});
