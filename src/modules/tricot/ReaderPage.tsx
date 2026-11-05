import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Settings2,
  Sun,
  SunDim,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button, Input } from '../../components';
import { db, getActiveById } from '../../db';
import { cn } from '../../lib/cn';
import { ConfirmSheet } from './ConfirmSheet';
import { applyDelta, parseTarget, remaining } from './counters';
import { PdfCanvas } from './PdfCanvas';
import {
  DEFAULT_READER,
  loadPrefs,
  loadReaderState,
  savePrefs,
  saveReaderState,
  type PersistedReader,
  type ReaderPrefs,
} from './readerState';
import { useWakeLock } from './useWakeLock';
import {
  DOC_WIDTH,
  clamp,
  clampView,
  docToScreenY,
  nextRulerY,
  panToReveal,
  screenScale,
  zoomAround,
  type Size,
  type View,
} from './viewport';

const ZOOM_STEP = 1.25;

/** Liseuse plein écran d'un fichier (PDF ou image) de la table `files`. */
export default function ReaderPage() {
  const { fileId = '' } = useParams();
  const file = useLiveQuery(async () => (await getActiveById(db.files, fileId)) ?? null, [fileId]);

  const root = (
    <div className="fixed inset-0 z-[45] flex flex-col bg-stone-900 text-stone-100">
      {file === undefined && <Message>Chargement…</Message>}
      {file === null && (
        <Message>
          Fichier introuvable.
          <Link to="/tricot" className="mt-4 inline-flex min-h-touch items-center underline">
            Retour
          </Link>
        </Message>
      )}
      {file && (
        <Reader
          key={file.id}
          fileId={file.id}
          name={file.name}
          mimeType={file.mimeType}
          blob={file.blob}
        />
      )}
    </div>
  );
  return root;
}

function Message({ children }: { children: React.ReactNode }) {
  return <div className="m-auto p-6 text-center text-lg">{children}</div>;
}

/** Dernière valeur dans une ref, lisible depuis les gestionnaires d'événements. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

function Reader({
  fileId,
  name,
  mimeType,
  blob,
}: {
  fileId: string;
  name: string;
  mimeType: string;
  blob: Blob;
}) {
  const isPdf = mimeType === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
  const wake = useWakeLock();

  // --- document
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [aspect, setAspect] = useState(1.414);
  const [error, setError] = useState<string | null>(null);
  const handleError = useCallback((m: string) => setError(m), []);

  useEffect(() => {
    let cancelled = false;
    let task: { destroy(): Promise<void> } | null = null;
    let url: string | null = null;
    (async () => {
      if (isPdf) {
        const { pdfjs } = await import('./pdfjs');
        const data = new Uint8Array(await blob.arrayBuffer());
        const loading = pdfjs.getDocument({ data });
        task = loading;
        const doc = await loading.promise;
        if (!cancelled) setPdf(doc);
      } else {
        url = URL.createObjectURL(blob);
        setImageUrl(url);
      }
    })().catch(() => !cancelled && setError('Impossible d’ouvrir ce fichier.'));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      void task?.destroy();
    };
  }, [blob, isPdf]);

  const docHeight = DOC_WIDTH * aspect;
  const pageCount = pdf?.numPages ?? 1;

  // --- état persistant
  const [state, setState] = useState<PersistedReader>(DEFAULT_READER);
  const [view, setView] = useState<View>({ panX: 0, panY: 0, zoom: 1 });
  const [prefs, setPrefs] = useState<ReaderPrefs>(loadPrefs);
  const [ready, setReady] = useState(false);
  const rowId = useRef<string | undefined>(undefined);
  const viewRef = useLatest(view);

  // --- taille de l'écran
  const viewportRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const sizeRef = useLatest(size);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const docHeightRef = useLatest(docHeight);
  const applyView = useCallback(
    (next: View) => {
      const clamped = clampView(next, sizeRef.current, docHeightRef.current);
      viewRef.current = clamped;
      setView(clamped);
    },
    [docHeightRef, sizeRef, viewRef],
  );

  // chargement de l'état sauvegardé
  const saved = useRef<PersistedReader | null>(null);
  useEffect(() => {
    void loadReaderState(fileId).then((s) => {
      if (s) {
        rowId.current = s.id;
        saved.current = {
          page: s.page,
          zoom: s.zoom,
          rulerY: s.rulerY,
          currentRow: s.currentRow,
          totalRows: s.totalRows,
        };
      } else saved.current = DEFAULT_READER;
      setState(saved.current);
      setReady(true);
    });
  }, [fileId]);

  // placement initial : reprise là où on s'était arrêté
  const placed = useRef(false);
  const docKnown = isPdf ? pdf !== null : imageUrl !== null;
  useEffect(() => {
    if (placed.current || !ready || !docKnown || size.width === 0) return;
    placed.current = true;
    const s = saved.current ?? DEFAULT_READER;
    const zoom = clamp(s.zoom, 1, 6);
    const v: View = { zoom, panX: 0, panY: 0 };
    if (s.rulerY > 0) v.panY = panToReveal(s.rulerY, v, size);
    applyView(v);
    setState((st) => ({ ...st, page: clamp(s.page, 1, pageCount) }));
  }, [ready, docKnown, size, pageCount, applyView]);

  // reclamp quand le document ou l'écran change
  useEffect(() => {
    if (placed.current) applyView(viewRef.current);
  }, [docHeight, size, applyView, viewRef]);

  // sauvegarde différée + au démontage
  const latest = useRef<PersistedReader>(DEFAULT_READER);
  useEffect(() => {
    latest.current = { ...state, zoom: Math.round(view.zoom * 1000) / 1000 };
  }, [state, view.zoom]);
  useEffect(() => {
    if (!placed.current) return;
    const id = window.setTimeout(() => {
      void saveReaderState(fileId, latest.current, rowId.current).then((i) => (rowId.current = i));
    }, 400);
    return () => window.clearTimeout(id);
  }, [fileId, state, view.zoom]);
  useEffect(
    () => () => {
      if (placed.current) void saveReaderState(fileId, latest.current, rowId.current);
    },
    [fileId],
  );

  const updatePrefs = (p: Partial<ReaderPrefs>) =>
    setPrefs((cur) => {
      const next = { ...cur, ...p };
      savePrefs(next);
      return next;
    });

  // --- page
  const goPage = (p: number) => {
    const page = clamp(p, 1, pageCount);
    setState((s) => ({ ...s, page, rulerY: 0 }));
    applyView({ ...viewRef.current, panY: 0 });
  };

  // --- zoom
  const zoomBy = (factor: number) => {
    const v = viewRef.current;
    applyView(zoomAround(v, size.width / 2, size.height / 2, v.zoom * factor));
  };

  // --- gestes (pointer events)
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const mode = useRef<'pan' | 'ruler' | 'pinch'>('pan');
  const pinch = useRef({ dist: 0, cx: 0, cy: 0 });
  const rulerMax = Math.max(0, docHeight - prefs.rulerHeight);
  const rulerMaxRef = useLatest(rulerMax);

  const pinchMetrics = () => {
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return null;
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2) {
      mode.current = 'pinch';
      const m = pinchMetrics();
      if (m) pinch.current = m;
    } else {
      mode.current = (e.target as HTMLElement).closest('[data-ruler]') ? 'ruler' : 'pan';
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = viewRef.current;
    if (mode.current === 'pinch') {
      const m = pinchMetrics();
      if (!m) return;
      const zoomed = zoomAround(v, m.cx, m.cy, v.zoom * (m.dist / pinch.current.dist));
      applyView({
        ...zoomed,
        panX: zoomed.panX + (m.cx - pinch.current.cx),
        panY: zoomed.panY + (m.cy - pinch.current.cy),
      });
      pinch.current = m;
    } else if (mode.current === 'ruler') {
      const s = screenScale(size.width, v.zoom);
      setState((st) => ({ ...st, rulerY: clamp(st.rulerY + dy / s, 0, rulerMaxRef.current) }));
    } else {
      applyView({ ...v, panX: v.panX + dx, panY: v.panY + dy });
    }
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) mode.current = 'pan';
    if (pointers.current.size === 0) mode.current = 'pan';
  };

  // molette : Ctrl/⌘ = zoom, sinon défilement (confort sur ordinateur)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        applyView(
          zoomAround(
            v,
            e.clientX - rect.left,
            e.clientY - rect.top,
            v.zoom * Math.exp(-e.deltaY / 300),
          ),
        );
      } else applyView({ ...v, panX: v.panX - e.deltaX, panY: v.panY - e.deltaY });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyView, viewRef]);

  // --- compteur
  const [resetOpen, setResetOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const revealRuler = (rulerY: number) => {
    const v = viewRef.current;
    const top = docToScreenY(rulerY, v, size.width);
    const bottom = docToScreenY(rulerY + prefs.rulerHeight, v, size.width);
    if (top < 64 || bottom > size.height - 190)
      applyView({ ...v, panY: panToReveal(rulerY, v, size) });
  };

  const step = (delta: 1 | -1) => {
    const currentRow = applyDelta(state.currentRow, delta);
    if (currentRow === state.currentRow) return;
    let rulerY = state.rulerY;
    if (prefs.syncRuler) {
      rulerY = nextRulerY(
        rulerY,
        prefs.rulerHeight,
        (prefs.direction * delta) as 1 | -1,
        docHeight,
      );
      revealRuler(rulerY);
    }
    setState({ ...state, currentRow, rulerY });
  };

  const left = remaining(state.currentRow, state.totalRows);
  const pixelScale = useDebounced(
    Math.round(screenScale(size.width, view.zoom) * (window.devicePixelRatio || 1) * 4) / 4,
    250,
  );
  const s = screenScale(size.width, view.zoom);
  const rulerY = clamp(state.rulerY, 0, rulerMax);

  const layerStyle = useMemo(
    () => ({
      width: DOC_WIDTH,
      height: docHeight,
      transform: `translate(${view.panX}px, ${view.panY}px) scale(${s})`,
    }),
    [view.panX, view.panY, s, docHeight],
  );

  return (
    <>
      <div
        ref={viewportRef}
        data-testid="reader-viewport"
        className="relative flex-1 touch-none select-none overflow-hidden bg-stone-700"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <div
          data-testid="reader-doc"
          data-zoom={view.zoom.toFixed(3)}
          className="absolute left-0 top-0 origin-top-left will-change-transform"
          style={layerStyle}
        >
          {pdf && (
            <PdfCanvas
              pdf={pdf}
              page={state.page}
              pixelScale={pixelScale}
              docHeight={docHeight}
              onAspect={setAspect}
              onError={handleError}
            />
          )}
          {imageUrl && (
            <img
              src={imageUrl}
              alt={name}
              draggable={false}
              onLoad={(e) => {
                const i = e.currentTarget;
                if (i.naturalWidth > 0) setAspect(i.naturalHeight / i.naturalWidth);
              }}
              style={{ width: DOC_WIDTH, height: docHeight, display: 'block', background: '#fff' }}
            />
          )}
          <div
            data-ruler
            data-testid="ruler"
            data-ruler-y={rulerY.toFixed(1)}
            role="separator"
            aria-label="Barre de repérage"
            className="absolute left-0 right-0 cursor-grab border-y-2 border-brand-500 bg-brand-500/30"
            style={{ top: rulerY, height: prefs.rulerHeight }}
          />
        </div>
        {error && (
          <div
            role="alert"
            className="absolute inset-x-4 top-20 rounded-xl bg-red-900 p-3 text-center"
          >
            {error}
          </div>
        )}
      </div>

      {/* barre du haut */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-1 bg-gradient-to-b from-black/70 to-transparent px-2 pt-[env(safe-area-inset-top)]">
        <Link
          to="/tricot"
          aria-label="Fermer la liseuse"
          className="pointer-events-auto inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl bg-black/40"
        >
          <X aria-hidden />
        </Link>
        <span className="min-w-0 flex-1 truncate px-2 text-sm font-medium">{name}</span>
        <span
          role="status"
          aria-label={
            wake === 'active'
              ? 'Écran maintenu allumé'
              : wake === 'unsupported'
                ? 'Maintien de l’écran non disponible'
                : 'Écran non maintenu allumé'
          }
          title={wake === 'active' ? 'Écran maintenu allumé' : 'Écran non maintenu allumé'}
          data-wake={wake}
          className={cn('mr-1', wake === 'active' ? 'text-amber-300' : 'text-stone-500')}
        >
          {wake === 'active' ? <Sun size={18} aria-hidden /> : <SunDim size={18} aria-hidden />}
        </span>
        <IconBtn label="Dézoomer" onClick={() => zoomBy(1 / ZOOM_STEP)}>
          <ZoomOut aria-hidden />
        </IconBtn>
        <IconBtn label="Zoomer" onClick={() => zoomBy(ZOOM_STEP)}>
          <ZoomIn aria-hidden />
        </IconBtn>
      </div>

      {/* pastille de pages */}
      {pageCount > 1 && (
        <div className="pointer-events-auto absolute top-[calc(3.5rem+env(safe-area-inset-top))] right-2 flex items-center rounded-full bg-black/60">
          <IconBtn
            label="Page précédente"
            disabled={state.page <= 1}
            onClick={() => goPage(state.page - 1)}
          >
            <ChevronLeft aria-hidden />
          </IconBtn>
          <span
            className="min-w-[3.5rem] text-center text-sm tabular-nums"
            data-testid="page-indicator"
          >
            {state.page} / {pageCount}
          </span>
          <IconBtn
            label="Page suivante"
            disabled={state.page >= pageCount}
            onClick={() => goPage(state.page + 1)}
          >
            <ChevronRight aria-hidden />
          </IconBtn>
        </div>
      )}

      {/* double compteur */}
      <div className="bg-stone-950 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
        {optionsOpen && (
          <div className="mb-2 flex flex-col gap-3 rounded-xl bg-stone-800 p-3 [&_input:not([type=checkbox])]:border-stone-600 [&_input:not([type=checkbox])]:bg-stone-900 [&_input:not([type=checkbox])]:text-stone-100 [&_label]:text-stone-200">
            <Input
              label="Nombre total de rangs"
              inputMode="numeric"
              value={state.totalRows ?? ''}
              onChange={(e) => setState({ ...state, totalRows: parseTarget(e.target.value) })}
              className="dark:bg-stone-900"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Hauteur de la barre</span>
              <div className="flex items-center gap-1">
                <IconBtn
                  label="Barre moins haute"
                  onClick={() => updatePrefs({ rulerHeight: Math.max(10, prefs.rulerHeight - 10) })}
                >
                  <Minus aria-hidden />
                </IconBtn>
                <span className="w-10 text-center tabular-nums" data-testid="ruler-height">
                  {prefs.rulerHeight}
                </span>
                <IconBtn
                  label="Barre plus haute"
                  onClick={() =>
                    updatePrefs({ rulerHeight: Math.min(600, prefs.rulerHeight + 10) })
                  }
                >
                  <Plus aria-hidden />
                </IconBtn>
              </div>
            </div>
            <label className="flex min-h-touch items-center gap-3">
              <input
                type="checkbox"
                className="size-6"
                checked={prefs.syncRuler}
                onChange={(e) => updatePrefs({ syncRuler: e.target.checked })}
              />
              <span>La barre suit le compteur à chaque rang</span>
            </label>
            {prefs.syncRuler && (
              <label className="flex items-center justify-between gap-2">
                <span className="text-sm">Sens du déplacement</span>
                <select
                  className="min-h-touch rounded-xl bg-stone-900 px-3"
                  value={prefs.direction}
                  onChange={(e) => updatePrefs({ direction: e.target.value === '1' ? 1 : -1 })}
                >
                  <option value="-1">La barre monte</option>
                  <option value="1">La barre descend</option>
                </select>
              </label>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            aria-label="Moins un rang"
            className="min-h-[4rem] min-w-[4rem]"
            onClick={() => step(-1)}
          >
            <Minus aria-hidden size={28} />
          </Button>
          <div className="min-w-0 flex-1 text-center" aria-live="polite">
            <div className="text-2xl font-bold tabular-nums" data-testid="row-count">
              Rang {state.currentRow}
            </div>
            {left !== undefined && (
              <div className="text-sm text-stone-300" data-testid="rows-left">
                {left} rangs restants
              </div>
            )}
          </div>
          <Button
            aria-label="Plus un rang"
            className="min-h-[4rem] min-w-[5rem]"
            onClick={() => step(1)}
          >
            <Plus aria-hidden size={32} />
          </Button>
          <Button
            variant="secondary"
            aria-label="Remettre le compteur à zéro"
            className="min-w-touch"
            onClick={() => setResetOpen(true)}
          >
            0
          </Button>
          <Button
            variant={optionsOpen ? 'primary' : 'ghost'}
            aria-label="Réglages de la liseuse"
            aria-expanded={optionsOpen}
            className="min-w-touch !text-stone-100"
            onClick={() => setOptionsOpen((o) => !o)}
          >
            <Settings2 aria-hidden />
          </Button>
        </div>
      </div>
      <ConfirmSheet
        open={resetOpen}
        title="Remettre à zéro ?"
        message="Le compteur de rangs repassera à 0."
        confirmLabel="Remettre à zéro"
        onClose={() => setResetOpen(false)}
        onConfirm={() => setState((st) => ({ ...st, currentRow: 0 }))}
      />
    </>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="pointer-events-auto inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl disabled:opacity-40"
    >
      {children}
    </button>
  );
}
