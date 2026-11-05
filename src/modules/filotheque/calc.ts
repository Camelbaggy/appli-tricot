/** Calculs purs de la filothèque : conversions g ↔ m ↔ pelotes, restant, coût matière. */
import type { Consumption, StashItem, Yarn, YarnWeight } from '../../db';

/** Caractéristiques d'une pelote d'un fil. */
export interface BallSpec {
  ballWeightG: number;
  ballLengthM: number;
}

/** Arrondi à `digits` décimales (corrige aussi les erreurs de virgule flottante). */
export function roundTo(value: number, digits = 1): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON * Math.sign(value)) * f) / f;
}

export function gramsToMeters(g: number, spec: BallSpec): number {
  if (!(spec.ballWeightG > 0) || !(spec.ballLengthM > 0)) return 0;
  return (g / spec.ballWeightG) * spec.ballLengthM;
}

export function metersToGrams(m: number, spec: BallSpec): number {
  if (!(spec.ballWeightG > 0) || !(spec.ballLengthM > 0)) return 0;
  return (m / spec.ballLengthM) * spec.ballWeightG;
}

export function gramsToBalls(g: number, spec: Pick<BallSpec, 'ballWeightG'>): number {
  if (!(spec.ballWeightG > 0)) return 0;
  return g / spec.ballWeightG;
}

export function ballsToGrams(balls: number, spec: Pick<BallSpec, 'ballWeightG'>): number {
  if (!(spec.ballWeightG > 0)) return 0;
  return balls * spec.ballWeightG;
}

/** Somme des quantités consommées (en g), arrondie à 0,01 g. */
export function sumConsumedG(consumptions: readonly Pick<Consumption, 'quantityG'>[]): number {
  return roundTo(
    consumptions.reduce((s, c) => s + (Number.isFinite(c.quantityG) ? c.quantityG : 0), 0),
    2,
  );
}

/** Restant = quantité initiale − consommations. Peut être négatif (dépassement). */
export function remainingG(
  initialQuantityG: number,
  consumptions: readonly Pick<Consumption, 'quantityG'>[],
): number {
  return roundTo(initialQuantityG - sumConsumedG(consumptions), 2);
}

/** Coût d'une quantité (g) d'un fil acheté `pricePerBall` la pelote. 0 si prix/poids inconnus. */
export function costOfGrams(
  g: number,
  pricePerBall: number | undefined,
  ballWeightG: number,
): number {
  if (pricePerBall === undefined || !(pricePerBall > 0) || !(ballWeightG > 0)) return 0;
  return (g / ballWeightG) * pricePerBall;
}

export interface MaterialCost {
  totalG: number;
  totalM: number;
  /** coût matière en euros, arrondi au centime */
  totalCost: number;
  /** au moins une consommation sans prix connu (coût sous-estimé) */
  hasUnpriced: boolean;
}

/** Totaux (g, m, coût) d'un ensemble de consommations. Les lignes orphelines comptent en g seulement. */
export function computeMaterialCost(
  consumptions: readonly Consumption[],
  stashItems: readonly StashItem[],
  yarns: readonly Yarn[],
): MaterialCost {
  const items = new Map(stashItems.map((s) => [s.id, s]));
  const yarnById = new Map(yarns.map((y) => [y.id, y]));
  let totalG = 0;
  let totalM = 0;
  let cost = 0;
  let hasUnpriced = false;
  for (const c of consumptions) {
    totalG += c.quantityG;
    const item = items.get(c.stashItemId);
    const yarn = item ? yarnById.get(item.yarnId) : undefined;
    if (!item || !yarn) continue;
    totalM += gramsToMeters(c.quantityG, yarn);
    if (item.pricePerBall === undefined) hasUnpriced = true;
    cost += costOfGrams(c.quantityG, item.pricePerBall, yarn.ballWeightG);
  }
  return {
    totalG: roundTo(totalG, 1),
    totalM: Math.round(totalM),
    totalCost: roundTo(cost, 2),
    hasUnpriced,
  };
}

// ------------------------------------------------------------------ saisie / affichage

/** Lit un nombre saisi (virgule ou point). `undefined` si vide ou invalide. */
export function parseDecimal(text: string): number | undefined {
  const t = text.trim().replace(',', '.');
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

const nf = (max: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: max });
const nfG = nf(1);
const nfM = nf(0);
const nfB = nf(1);
const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export const formatG = (g: number) => `${nfG.format(roundTo(g, 1))} g`;
export const formatM = (m: number) => `${nfM.format(Math.round(m))} m`;
export const formatEuro = (v: number) => eur.format(v);
export function formatBalls(balls: number): string {
  const r = roundTo(balls, 1);
  return `${nfB.format(r)} ${Math.abs(r) < 2 ? 'pelote' : 'pelotes'}`;
}

/** Ex. « 2,4 pelotes · 120 g · 264 m ». */
export function formatStock(g: number, spec: BallSpec): string {
  return [formatBalls(gramsToBalls(g, spec)), formatG(g), formatM(gramsToMeters(g, spec))].join(
    ' · ',
  );
}

export const WEIGHT_LABELS: Record<YarnWeight, string> = {
  lace: 'Lace (dentelle)',
  fingering: 'Fingering (chaussettes)',
  sport: 'Sport',
  dk: 'DK (double knitting)',
  worsted: 'Worsted',
  aran: 'Aran',
  bulky: 'Bulky (épais)',
  super_bulky: 'Super bulky (très épais)',
};

export const WEIGHT_ORDER: YarnWeight[] = [
  'lace',
  'fingering',
  'sport',
  'dk',
  'worsted',
  'aran',
  'bulky',
  'super_bulky',
];

export function yarnTitle(yarn: Pick<Yarn, 'brand' | 'line'>): string {
  return `${yarn.brand} ${yarn.line}`.trim();
}
