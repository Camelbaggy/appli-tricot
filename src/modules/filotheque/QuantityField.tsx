import { useState } from 'react';
import { Input } from '../../components';
import { cn } from '../../lib/cn';
import {
  ballsToGrams,
  formatM,
  formatG,
  gramsToBalls,
  gramsToMeters,
  parseDecimal,
  roundTo,
  type BallSpec,
} from './calc';

type Unit = 'g' | 'pelotes';

export interface QuantityFieldProps {
  label: string;
  spec: BallSpec;
  /** valeur initiale en grammes */
  initialG?: number;
  /** appelé à chaque saisie avec la quantité en grammes (undefined si vide/invalide) */
  onChange: (grams: number | undefined) => void;
  error?: string;
}

/** Saisie d'une quantité en grammes OU en nombre de pelotes, restituée en grammes. */
export function QuantityField({ label, spec, initialG, onChange, error }: QuantityFieldProps) {
  const [unit, setUnit] = useState<Unit>('g');
  const [text, setText] = useState(initialG !== undefined ? String(roundTo(initialG, 1)) : '');

  const toGrams = (t: string, u: Unit): number | undefined => {
    const n = parseDecimal(t);
    if (n === undefined) return undefined;
    return u === 'g' ? n : roundTo(ballsToGrams(n, spec), 1);
  };
  const grams = toGrams(text, unit);

  const switchUnit = (u: Unit) => {
    if (u === unit) return;
    const g = toGrams(text, unit);
    setUnit(u);
    if (g === undefined) return;
    setText(String(u === 'g' ? roundTo(g, 1) : roundTo(gramsToBalls(g, spec), 2)));
  };

  return (
    <div className="flex flex-col gap-1">
      <Input
        label={`${label} (${unit === 'g' ? 'en grammes' : 'en pelotes'})`}
        inputMode="decimal"
        value={text}
        error={error}
        onChange={(e) => {
          setText(e.target.value);
          onChange(toGrams(e.target.value, unit));
        }}
      />
      <div role="group" aria-label="Unité" className="flex gap-2">
        {(['g', 'pelotes'] as const).map((u) => (
          <button
            key={u}
            type="button"
            aria-pressed={unit === u}
            onClick={() => {
              switchUnit(u);
              const g = toGrams(text, unit);
              onChange(g);
            }}
            className={cn(
              'min-h-touch flex-1 rounded-xl border px-3 text-base font-medium',
              unit === u
                ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-stone-700 dark:text-brand-100'
                : 'border-stone-300 text-stone-700 dark:border-stone-600 dark:text-stone-300',
            )}
          >
            {u === 'g' ? 'Grammes' : 'Pelotes'}
          </button>
        ))}
      </div>
      {grams !== undefined && grams > 0 && (
        <p className="text-sm text-stone-600 dark:text-stone-400">
          = {formatG(grams)} · {formatM(gramsToMeters(grams, spec))}
        </p>
      )}
    </div>
  );
}
