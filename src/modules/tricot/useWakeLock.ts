import { useEffect, useState } from 'react';

export type WakeLockStatus = 'active' | 'inactive' | 'unsupported';

interface WakeLockSentinelLike {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}
interface WakeLockApi {
  request(type: 'screen'): Promise<WakeLockSentinelLike>;
}

/**
 * Garde l'écran allumé tant que le composant est monté (Screen Wake Lock API).
 * Réacquis au retour de visibilité ; dégradation silencieuse si non supporté ou refusé.
 */
export function useWakeLock(): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>(() =>
    typeof navigator !== 'undefined' && 'wakeLock' in navigator ? 'inactive' : 'unsupported',
  );

  useEffect(() => {
    const api = (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock;
    if (!api) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let disposed = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const s = await api.request('screen');
        if (disposed) {
          void s.release().catch(() => undefined);
          return;
        }
        sentinel = s;
        setStatus('active');
        s.addEventListener('release', () => {
          if (sentinel === s) {
            sentinel = null;
            if (!disposed) setStatus('inactive');
          }
        });
      } catch {
        if (!disposed) setStatus('inactive');
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !sentinel) void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisible);
      const s = sentinel;
      sentinel = null;
      if (s) void s.release().catch(() => undefined);
    };
  }, []);

  return status;
}
