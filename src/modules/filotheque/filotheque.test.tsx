import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TABLE_NAMES, create, db, softDelete } from '../../db';
import { ProjectYarnPanel, projectMaterialCost } from './index';
import { FilothequePage } from './FilothequePage';
import { StashItemPage } from './StashItemPage';

async function seed() {
  const yarn = await create(db.yarns, {
    brand: 'Drops',
    line: 'Alpaca',
    weight: 'fingering',
    fiber: '100 % alpaga',
    ballWeightG: 50,
    ballLengthM: 110,
  });
  const other = await create(db.yarns, {
    brand: 'Woolly',
    line: 'Chunky',
    weight: 'bulky',
    fiber: 'laine',
    ballWeightG: 100,
    ballLengthM: 100,
  });
  const rose = await create(db.stashItems, {
    yarnId: yarn.id,
    colorway: 'Rose poudré',
    colorHex: '#e8a0b0',
    dyeLot: 'B42',
    initialQuantityG: 200,
    pricePerBall: 5,
  });
  await create(db.stashItems, { yarnId: other.id, colorway: 'Anthracite', initialQuantityG: 100 });
  const project = await create(db.projects, {
    name: 'Pull test',
    status: 'en_cours',
    recipientType: 'soi',
    isPro: false,
  });
  await create(db.consumptions, { projectId: project.id, stashItemId: rose.id, quantityG: 80 });
  return { yarn, rose, project };
}

beforeEach(async () => {
  await Promise.all(TABLE_NAMES.map((t) => db.table(t).clear()));
});

describe('écran Laine', () => {
  it('affiche l’état vide', async () => {
    render(
      <MemoryRouter>
        <FilothequePage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Aucune pelote en stock')).toBeInTheDocument();
  });

  it('groupe par fil, calcule le restant, filtre par recherche et grosseur', async () => {
    await seed();
    render(
      <MemoryRouter>
        <FilothequePage />
      </MemoryRouter>,
    );
    // 200 g - 80 g = 120 g = 2,4 pelotes = 264 m
    expect(await screen.findByText('2,4 pelotes · 120 g · 264 m')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Drops Alpaca' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Woolly Chunky' })).toBeInTheDocument();
    expect(screen.getByText(/bain B42/)).toBeInTheDocument();
    expect(screen.getByLabelText('Total du stock')).toHaveTextContent('220 g');

    await userEvent.type(screen.getByLabelText('Recherche'), 'anthra');
    expect(screen.queryByRole('heading', { name: 'Drops Alpaca' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Woolly Chunky' })).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Recherche'));
    await userEvent.selectOptions(screen.getByLabelText('Grosseur'), 'fingering');
    expect(screen.getByRole('heading', { name: 'Drops Alpaca' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Woolly Chunky' })).not.toBeInTheDocument();
  });

  it('ajoute une pelote en deux temps avec un nouveau fil, quantité en pelotes', async () => {
    render(
      <MemoryRouter>
        <FilothequePage />
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Ajouter une pelote' }));
    await userEvent.type(screen.getByLabelText('Marque'), 'Rowan');
    await userEvent.type(screen.getByLabelText('Gamme'), 'Felted Tweed');
    await userEvent.type(screen.getByLabelText('Métrage pelote (m)'), '175');
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));

    await userEvent.type(screen.getByLabelText('Coloris'), 'Vert mousse');
    await userEvent.click(screen.getByRole('button', { name: 'Pelotes' }));
    await userEvent.type(screen.getByLabelText(/Quantité/), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter au stock' }));

    expect(await screen.findByRole('link', { name: /Vert mousse/ })).toHaveTextContent(
      '3 pelotes · 150 g · 525 m',
    );
    const items = await db.stashItems.toArray();
    expect(items).toHaveLength(1);
    expect(items[0]?.initialQuantityG).toBe(150);
    expect(items[0]?.colorHex).toBeUndefined();
  });
});

describe('fiche pelote', () => {
  it('liste les consommations avec lien projet puis supprime logiquement', async () => {
    const { rose, project } = await seed();
    render(
      <MemoryRouter initialEntries={[`/filotheque/${rose.id}`]}>
        <Routes>
          <Route path="/filotheque/:stashItemId" element={<StashItemPage />} />
          <Route path="/filotheque" element={<p>liste</p>} />
        </Routes>
      </MemoryRouter>,
    );
    const link = await screen.findByRole('link', { name: 'Pull test' });
    expect(link).toHaveAttribute('href', `/projets/${project.id}`);
    expect(screen.getByText('80 g · 176 m')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }));
    expect(await screen.findByText('liste')).toBeInTheDocument();
    expect((await db.stashItems.get(rose.id))?.deletedAt).toBeDefined();
  });
});

describe('ProjectYarnPanel', () => {
  it('liste, totalise (g, m, coût), avertit en cas de dépassement et enregistre', async () => {
    const { project, rose } = await seed();
    render(
      <MemoryRouter>
        <ProjectYarnPanel projectId={project.id} />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Drops Alpaca')).toBeInTheDocument();
    // 80 g à 5 € / 50 g = 8 €
    expect(screen.getByTestId('yarn-total')).toHaveTextContent(/80 g · 176 m · coût matière 8,00/);

    await userEvent.click(screen.getByRole('button', { name: /Ajouter une consommation/ }));
    await userEvent.selectOptions(screen.getByLabelText('Pelote'), rose.id);
    await userEvent.type(screen.getByLabelText(/Quantité utilisée/), '150'); // restant 120
    expect(await screen.findByRole('alert')).toHaveTextContent(/dépasse le restant/);
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(screen.getByTestId('yarn-total')).toHaveTextContent(/230 g/));
    const cost = await projectMaterialCost(project.id);
    expect(cost).toMatchObject({ totalG: 230, totalM: 506, totalCost: 23 });
  });

  it('supprime une consommation (le stock est restitué)', async () => {
    const { project } = await seed();
    render(
      <MemoryRouter>
        <ProjectYarnPanel projectId={project.id} />
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /Supprimer la consommation/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }));
    expect(await screen.findByText(/Aucune laine renseignée/)).toBeInTheDocument();
    const [c] = await db.consumptions.toArray();
    expect(c?.deletedAt).toBeDefined();
    expect(await projectMaterialCost(project.id)).toMatchObject({ totalG: 0, totalCost: 0 });
  });
});

describe('projectMaterialCost', () => {
  it('compte encore le prix d’une pelote supprimée logiquement', async () => {
    const { project, rose } = await seed();
    await softDelete(db.stashItems, rose.id);
    expect(await projectMaterialCost(project.id)).toMatchObject({ totalG: 80, totalCost: 8 });
  });
});
