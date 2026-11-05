/** Applique un pas à un compteur : jamais en dessous de 0, entier. */
export function applyDelta(value: number, delta: number): number {
  return Math.max(0, Math.trunc(value) + Math.trunc(delta));
}

/** Nombre de rangs restants ; `undefined` sans objectif valide, jamais négatif. */
export function remaining(value: number, target?: number): number | undefined {
  if (target === undefined || !Number.isFinite(target) || target <= 0) return undefined;
  return Math.max(0, Math.trunc(target) - value);
}

/** « Rang 12 / 50 · 38 restants » ou « Rang 12 » sans objectif. */
export function counterSummary(value: number, target?: number): string {
  const left = remaining(value, target);
  return left === undefined ? `Rang ${value}` : `Rang ${value} / ${target} · ${left} restants`;
}

/** Analyse un champ numérique d'objectif : entier > 0, sinon undefined. */
export function parseTarget(raw: string): number | undefined {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Échange l'élément `index` avec son voisin ; renvoie les ids dans le nouvel ordre. */
export function moveId(ids: readonly string[], index: number, direction: -1 | 1): string[] {
  const target = index + direction;
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length) return [...ids];
  const next = [...ids];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}
