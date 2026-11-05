import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App', () => {
  it('affiche la navigation, l’indicateur de synchro et navigue entre les modules', async () => {
    window.location.hash = '';
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Projets' })).toBeInTheDocument();
    expect(screen.getByText('Hors-ligne / local')).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(nav.querySelectorAll('a')).toHaveLength(4);

    await userEvent.click(screen.getByRole('link', { name: 'Patrons' }));
    expect(await screen.findByRole('heading', { name: 'Patrons' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: /Synchronisation/ }));
    expect(await screen.findByRole('heading', { name: 'Réglages' })).toBeInTheDocument();
  });
});
