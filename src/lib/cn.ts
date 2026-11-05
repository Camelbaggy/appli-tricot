/** Concatène des noms de classes en ignorant les valeurs vides. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
