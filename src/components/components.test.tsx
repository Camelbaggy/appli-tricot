import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, EmptyState, Fab, Input, Select, Sheet } from '.';

describe('composants partagés', () => {
  it('Button déclenche onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Ajouter</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('Input associe label et message d’erreur', () => {
    render(<Input label="Nom" error="Obligatoire" />);
    const input = screen.getByLabelText('Nom');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Obligatoire');
  });

  it('Select affiche ses options', () => {
    render(<Select label="Statut" options={[{ value: 'a', label: 'À venir' }]} />);
    expect(screen.getByRole('combobox', { name: 'Statut' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'À venir' })).toBeInTheDocument();
  });

  it('Sheet est fermée par Échap et masquée si open=false', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Sheet open onClose={onClose} title="Nouveau">
        contenu
      </Sheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Nouveau' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
    rerender(
      <Sheet open={false} onClose={onClose} title="Nouveau">
        contenu
      </Sheet>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Fab et EmptyState sont accessibles', () => {
    render(
      <>
        <Fab label="Nouveau projet" icon="+" />
        <EmptyState title="Rien ici" description="Ajoutez un élément." />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Nouveau projet' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rien ici' })).toBeInTheDocument();
  });
});
