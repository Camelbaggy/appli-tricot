import { useEffect, useState } from 'react';

/** Heure courante, rafraîchie régulièrement (pour les libellés « il y a X min »). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
