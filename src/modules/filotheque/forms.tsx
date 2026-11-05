import { useState, type FormEvent } from 'react';
import { Button, Input, Select } from '../../components';
import type { StashItem, Yarn, YarnWeight } from '../../db';
import { WEIGHT_LABELS, WEIGHT_ORDER, parseDecimal, type BallSpec } from './calc';
import { QuantityField } from './QuantityField';

export type NewYarnData = Omit<Yarn, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type NewStashData = Omit<StashItem, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export const weightOptions = WEIGHT_ORDER.map((w) => ({ value: w, label: WEIGHT_LABELS[w] }));

// ------------------------------------------------------------------ fil

export interface YarnFormProps {
  submitLabel: string;
  onSubmit: (yarn: NewYarnData) => void;
  onCancel: () => void;
}

/** Création d'une référence de fil (marque, gamme, grosseur, composition, pelote). */
export function YarnForm({ submitLabel, onSubmit, onCancel }: YarnFormProps) {
  const [brand, setBrand] = useState('');
  const [line, setLine] = useState('');
  const [weight, setWeight] = useState<YarnWeight>('dk');
  const [fiber, setFiber] = useState('');
  const [ballWeight, setBallWeight] = useState('50');
  const [ballLength, setBallLength] = useState('');
  const [needle, setNeedle] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const w = parseDecimal(ballWeight);
    const l = parseDecimal(ballLength);
    const n = parseDecimal(needle);
    const next: Record<string, string> = {};
    if (!brand.trim()) next.brand = 'La marque est requise.';
    if (!w || w <= 0) next.ballWeight = 'Indiquez un poids supérieur à 0.';
    if (!l || l <= 0) next.ballLength = 'Indiquez un métrage supérieur à 0.';
    if (needle.trim() && (n === undefined || n <= 0)) next.needle = 'Taille invalide.';
    setErrors(next);
    if (Object.keys(next).length > 0 || !w || !l) return;
    onSubmit({
      brand: brand.trim(),
      line: line.trim(),
      weight,
      fiber: fiber.trim(),
      ballWeightG: w,
      ballLengthM: l,
      needleSizeMm: n,
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <Input
        label="Marque"
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
        error={errors.brand}
      />
      <Input label="Gamme" value={line} onChange={(e) => setLine(e.target.value)} />
      <Select
        label="Grosseur"
        value={weight}
        options={weightOptions}
        onChange={(e) => setWeight(e.target.value as YarnWeight)}
      />
      <Input
        label="Composition"
        value={fiber}
        placeholder="ex. 100 % laine mérinos"
        onChange={(e) => setFiber(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Poids pelote (g)"
          inputMode="decimal"
          value={ballWeight}
          onChange={(e) => setBallWeight(e.target.value)}
          error={errors.ballWeight}
        />
        <Input
          label="Métrage pelote (m)"
          inputMode="decimal"
          value={ballLength}
          onChange={(e) => setBallLength(e.target.value)}
          error={errors.ballLength}
        />
      </div>
      <Input
        label="Aiguilles conseillées (mm)"
        inputMode="decimal"
        value={needle}
        onChange={(e) => setNeedle(e.target.value)}
        error={errors.needle}
      />
      <div className="flex gap-2 pt-1">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" className="flex-1">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ pelote

export interface StashItemFormProps {
  /** caractéristiques de la pelote du fil choisi (conversion g ↔ pelotes) */
  spec: BallSpec;
  initial?: Partial<NewStashData>;
  yarnId: string;
  submitLabel: string;
  onSubmit: (data: NewStashData) => void;
  onCancel: () => void;
}

/** Saisie d'une pelote possédée : coloris, couleur, bain, quantité, prix, emplacement, notes. */
export function StashItemForm({
  spec,
  initial,
  yarnId,
  submitLabel,
  onSubmit,
  onCancel,
}: StashItemFormProps) {
  const [colorway, setColorway] = useState(initial?.colorway ?? '');
  const [colorHex, setColorHex] = useState<string | undefined>(initial?.colorHex);
  const [dyeLot, setDyeLot] = useState(initial?.dyeLot ?? '');
  const [grams, setGrams] = useState<number | undefined>(initial?.initialQuantityG);
  const [price, setPrice] = useState(
    initial?.pricePerBall !== undefined ? String(initial.pricePerBall) : '',
  );
  const [location, setLocation] = useState(initial?.location ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const p = parseDecimal(price);
    const next: Record<string, string> = {};
    if (!colorway.trim()) next.colorway = 'Le coloris est requis.';
    if (grams === undefined || grams <= 0) next.quantity = 'Indiquez une quantité supérieure à 0.';
    if (price.trim() && (p === undefined || p < 0)) next.price = 'Prix invalide.';
    setErrors(next);
    if (Object.keys(next).length > 0 || grams === undefined) return;
    onSubmit({
      yarnId,
      colorway: colorway.trim(),
      colorHex,
      dyeLot: dyeLot.trim() || undefined,
      initialQuantityG: grams,
      pricePerBall: p,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <Input
        label="Coloris"
        value={colorway}
        onChange={(e) => setColorway(e.target.value)}
        error={errors.colorway}
      />
      <div className="flex flex-col gap-1">
        <label
          htmlFor="stash-color"
          className="text-sm font-medium text-stone-700 dark:text-stone-300"
        >
          Couleur (facultatif)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="stash-color"
            type="color"
            value={colorHex ?? '#cccccc'}
            onChange={(e) => setColorHex(e.target.value)}
            className="h-12 w-16 cursor-pointer rounded-xl border border-stone-300 bg-white p-1 dark:border-stone-600 dark:bg-stone-900"
          />
          <span className="flex-1 text-sm text-stone-600 dark:text-stone-400">
            {colorHex ?? 'Aucune couleur'}
          </span>
          {colorHex && (
            <Button variant="ghost" onClick={() => setColorHex(undefined)}>
              Retirer
            </Button>
          )}
        </div>
      </div>
      <Input label="Bain" value={dyeLot} onChange={(e) => setDyeLot(e.target.value)} />
      <QuantityField
        label="Quantité"
        spec={spec}
        initialG={initial?.initialQuantityG}
        onChange={setGrams}
        error={errors.quantity}
      />
      <Input
        label="Prix par pelote (€)"
        inputMode="decimal"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        error={errors.price}
      />
      <Input
        label="Emplacement"
        value={location}
        placeholder="ex. bac bleu, étagère 2"
        onChange={(e) => setLocation(e.target.value)}
      />
      <div className="flex flex-col gap-1">
        <label
          htmlFor="stash-notes"
          className="text-sm font-medium text-stone-700 dark:text-stone-300"
        >
          Notes
        </label>
        <textarea
          id="stash-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" className="flex-1">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
