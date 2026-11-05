import { describe, expect, it } from 'vitest';
import type { Consumption, StashItem, Yarn } from '../../db';
import {
  ballsToGrams,
  computeMaterialCost,
  costOfGrams,
  formatBalls,
  formatStock,
  gramsToBalls,
  gramsToMeters,
  metersToGrams,
  parseDecimal,
  remainingG,
  roundTo,
} from './calc';

const spec = { ballWeightG: 50, ballLengthM: 110 };
const base = { createdAt: 0, updatedAt: 0 };
const yarn: Yarn = {
  ...base,
  id: 'y1',
  brand: 'Drops',
  line: 'Alpaca',
  weight: 'fingering',
  fiber: '100 % alpaga',
  ...spec,
};
const item = (id: string, price?: number): StashItem => ({
  ...base,
  id,
  yarnId: 'y1',
  colorway: 'Rose',
  initialQuantityG: 200,
  pricePerBall: price,
});
const cons = (stashItemId: string, quantityG: number): Consumption => ({
  ...base,
  id: `${stashItemId}-${quantityG}`,
  projectId: 'p1',
  stashItemId,
  quantityG,
});

describe('conversions', () => {
  it('g -> m, pelotes', () => {
    expect(gramsToMeters(120, spec)).toBeCloseTo(264);
    expect(gramsToBalls(120, spec)).toBeCloseTo(2.4);
  });
  it('m -> g, pelotes -> g', () => {
    expect(metersToGrams(264, spec)).toBeCloseTo(120);
    expect(ballsToGrams(2.4, spec)).toBeCloseTo(120);
  });
  it('gère les divisions par zéro', () => {
    const zero = { ballWeightG: 0, ballLengthM: 0 };
    expect(gramsToMeters(100, zero)).toBe(0);
    expect(metersToGrams(100, zero)).toBe(0);
    expect(gramsToBalls(100, zero)).toBe(0);
    expect(ballsToGrams(2, zero)).toBe(0);
    expect(costOfGrams(100, 5, 0)).toBe(0);
  });
  it('arrondit', () => {
    expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
    expect(roundTo(NaN)).toBe(0);
    expect(roundTo(2.25, 1)).toBe(2.3);
  });
});

describe('restant', () => {
  it('initial - somme des consommations', () => {
    expect(remainingG(200, [{ quantityG: 50 }, { quantityG: 30.5 }])).toBe(119.5);
  });
  it('sans consommation, tout reste', () => {
    expect(remainingG(200, [])).toBe(200);
  });
  it('peut devenir négatif (dépassement)', () => {
    expect(remainingG(100, [{ quantityG: 130 }])).toBe(-30);
  });
  it('évite les erreurs flottantes', () => {
    expect(remainingG(1, [{ quantityG: 0.1 }, { quantityG: 0.2 }])).toBe(0.7);
  });
});

describe('coût matière', () => {
  it('somme quantité × prix / poids pelote', () => {
    const r = computeMaterialCost(
      [cons('a', 100), cons('b', 25)],
      [item('a', 6), item('b', 8)],
      [yarn],
    );
    expect(r.totalG).toBe(125);
    expect(r.totalM).toBe(275);
    expect(r.totalCost).toBe(16); // 12 + 4
    expect(r.hasUnpriced).toBe(false);
  });
  it('signale les prix manquants et ignore les orphelines', () => {
    const r = computeMaterialCost([cons('a', 50), cons('zz', 10)], [item('a')], [yarn]);
    expect(r.totalCost).toBe(0);
    expect(r.hasUnpriced).toBe(true);
    expect(r.totalG).toBe(60);
    expect(r.totalM).toBe(110);
  });
  it('liste vide', () => {
    expect(computeMaterialCost([], [], [])).toEqual({
      totalG: 0,
      totalM: 0,
      totalCost: 0,
      hasUnpriced: false,
    });
  });
});

describe('affichage', () => {
  it('formatStock', () => {
    expect(formatStock(120, spec)).toBe('2,4 pelotes · 120 g · 264 m');
  });
  it('singulier sous 2 pelotes', () => {
    expect(formatBalls(1)).toBe('1 pelote');
    expect(formatBalls(1.5)).toBe('1,5 pelote');
  });
  it('parseDecimal', () => {
    expect(parseDecimal('2,5')).toBe(2.5);
    expect(parseDecimal(' 3.25 ')).toBe(3.25);
    expect(parseDecimal('')).toBeUndefined();
    expect(parseDecimal('abc')).toBeUndefined();
  });
});
