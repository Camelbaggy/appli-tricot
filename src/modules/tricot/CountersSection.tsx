import { useState } from 'react';
import { ArrowDown, ArrowUp, Minus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button, Card, Input, Sheet } from '../../components';
import { create, db, softDelete, update, useActive } from '../../db';
import type { Counter } from '../../db';
import { ConfirmSheet } from './ConfirmSheet';
import { stepCounter } from './counterActions';
import { counterSummary, moveId, parseTarget } from './counters';

/** Compteurs actifs d'un projet, triés par `order`. */
export function useProjectCounters(projectId: string): Counter[] {
  const all = useActive(db.counters);
  return (all ?? []).filter((c) => c.projectId === projectId).sort((a, b) => a.order - b.order);
}

export function CountersSection({ projectId }: { projectId: string }) {
  const counters = useProjectCounters(projectId);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [target, setTarget] = useState('');
  const [resetting, setResetting] = useState<Counter | null>(null);
  const [deleting, setDeleting] = useState<Counter | null>(null);

  async function add() {
    const order = counters.reduce((m, c) => Math.max(m, c.order), -1) + 1;
    await create(db.counters, {
      projectId,
      label: label.trim() || 'Compteur',
      value: 0,
      target: parseTarget(target),
      order,
    });
    setLabel('');
    setTarget('');
    setAdding(false);
  }

  async function move(index: number, direction: -1 | 1) {
    const ids = moveId(
      counters.map((c) => c.id),
      index,
      direction,
    );
    await Promise.all(
      ids.map((id, order) =>
        counters.find((c) => c.id === id)!.order === order
          ? undefined
          : update(db.counters, id, { order }),
      ),
    );
  }

  return (
    <Card aria-label="Compte-rangs" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Compte-rangs</h3>
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus aria-hidden size={20} /> Compteur
        </Button>
      </div>
      {counters.length === 0 && (
        <p className="text-sm text-stone-600 dark:text-stone-400">Aucun compteur pour l’instant.</p>
      )}
      {counters.map((c, i) => {
        return (
          <div
            key={c.id}
            role="group"
            aria-label={`Compteur ${c.label}`}
            className="flex flex-col gap-2 rounded-2xl bg-stone-100 p-3 dark:bg-stone-900"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-medium">{c.label}</span>
              <div className="flex">
                <Button
                  variant="ghost"
                  aria-label={`Monter ${c.label}`}
                  disabled={i === 0}
                  onClick={() => void move(i, -1)}
                >
                  <ArrowUp aria-hidden size={20} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Descendre ${c.label}`}
                  disabled={i === counters.length - 1}
                  onClick={() => void move(i, 1)}
                >
                  <ArrowDown aria-hidden size={20} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Remettre ${c.label} à zéro`}
                  onClick={() => setResetting(c)}
                >
                  <RotateCcw aria-hidden size={20} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Supprimer ${c.label}`}
                  onClick={() => setDeleting(c)}
                >
                  <Trash2 aria-hidden size={20} />
                </Button>
              </div>
            </div>
            <p className="text-center text-2xl font-bold tabular-nums" data-testid="counter-value">
              {counterSummary(c.value, c.target)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="min-h-[5rem] flex-1"
                aria-label={`Moins un, ${c.label}`}
                onClick={() => void stepCounter(c.id, -1)}
              >
                <Minus aria-hidden size={36} />
              </Button>
              <Button
                className="min-h-[5rem] flex-[2]"
                aria-label={`Plus un, ${c.label}`}
                onClick={() => void stepCounter(c.id, 1)}
              >
                <Plus aria-hidden size={40} />
              </Button>
            </div>
          </div>
        );
      })}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Nouveau compteur">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <Input
            label="Libellé"
            placeholder="Manche gauche"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Input
            label="Objectif (nombre de rangs, facultatif)"
            inputMode="numeric"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <Button type="submit">Ajouter</Button>
        </form>
      </Sheet>
      <ConfirmSheet
        open={resetting !== null}
        title="Remettre à zéro ?"
        message={`Le compteur « ${resetting?.label ?? ''} » repassera à 0.`}
        confirmLabel="Remettre à zéro"
        onClose={() => setResetting(null)}
        onConfirm={() => resetting && void update(db.counters, resetting.id, { value: 0 })}
      />
      <ConfirmSheet
        open={deleting !== null}
        title="Supprimer le compteur ?"
        message={`« ${deleting?.label ?? ''} » sera supprimé.`}
        confirmLabel="Supprimer"
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && void softDelete(db.counters, deleting.id)}
      />
    </Card>
  );
}
