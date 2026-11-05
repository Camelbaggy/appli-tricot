import { useEffect, useRef } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { DOC_WIDTH } from './viewport';

const MAX_SIDE = 4096;
const MAX_AREA = 16_000_000;

/**
 * Page de PDF dessinée dans un canvas dont la taille CSS vaut DOC_WIDTH × hauteur du document.
 * `pixelScale` = pixels écran par unité document : le bitmap est redessiné à la résolution voulue.
 */
export function PdfCanvas({
  pdf,
  page,
  pixelScale,
  docHeight,
  onAspect,
  onError,
}: {
  pdf: PDFDocumentProxy;
  page: number;
  pixelScale: number;
  docHeight: number;
  /** hauteur / largeur de la page */
  onAspect: (aspect: number) => void;
  onError: (message: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let task: RenderTask | null = null;

    (async () => {
      const p = await pdf.getPage(page);
      if (cancelled) return;
      const base = p.getViewport({ scale: 1 });
      onAspect(base.height / base.width);

      let scale = (DOC_WIDTH * Math.max(0.2, pixelScale)) / base.width;
      scale = Math.min(scale, MAX_SIDE / Math.max(base.width, base.height));
      const area = base.width * base.height * scale * scale;
      if (area > MAX_AREA) scale *= Math.sqrt(MAX_AREA / area);
      const viewport = p.getViewport({ scale });

      const off = document.createElement('canvas');
      off.width = Math.ceil(viewport.width);
      off.height = Math.ceil(viewport.height);
      task = p.render({ canvas: off, viewport });
      await task.promise;
      if (cancelled) return;
      const visible = canvasRef.current;
      const ctx = visible?.getContext('2d');
      if (!visible || !ctx) return;
      visible.width = off.width;
      visible.height = off.height;
      ctx.drawImage(off, 0, 0);
    })().catch((err: unknown) => {
      if (cancelled || (err instanceof Error && err.name === 'RenderingCancelledException')) return;
      onError('Impossible d’afficher cette page.');
    });

    return () => {
      cancelled = true;
      task?.cancel();
    };
    // onAspect/onError sont stables côté parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, page, pixelScale]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="pdf-canvas"
      style={{ width: DOC_WIDTH, height: docHeight, display: 'block', background: '#fff' }}
    />
  );
}
