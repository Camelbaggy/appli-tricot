/** Pastille de couleur d'un coloris (grise à bordure pointillée si aucune couleur). */
export function ColorDot({ hex, size = 28 }: { hex?: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      data-testid="color-dot"
      className="inline-block shrink-0 rounded-full border border-stone-400 dark:border-stone-500"
      style={{
        width: size,
        height: size,
        background: hex ?? 'transparent',
        borderStyle: hex ? 'solid' : 'dashed',
      }}
    />
  );
}
