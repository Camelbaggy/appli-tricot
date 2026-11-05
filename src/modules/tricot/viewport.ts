/**
 * Géométrie de la liseuse.
 *
 * Le document vit dans des « unités document » : sa largeur vaut toujours DOC_WIDTH, quel que soit
 * l'appareil, ce qui rend la position de la barre portable. À l'écran, 1 unité = `fit * zoom` px
 * (fit = largeur de l'écran / DOC_WIDTH) et le coin haut-gauche du document est en (panX, panY).
 */
export const DOC_WIDTH = 1000;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;

export interface View {
  panX: number;
  panY: number;
  zoom: number;
}

export interface Size {
  width: number;
  height: number;
}

export const fitScale = (viewportWidth: number) => viewportWidth / DOC_WIDTH;

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Échelle écran (px par unité document). */
export const screenScale = (viewportWidth: number, zoom: number) => fitScale(viewportWidth) * zoom;

/** Ordonnée document vers ordonnée écran. */
export function docToScreenY(docY: number, view: View, viewportWidth: number): number {
  return view.panY + docY * screenScale(viewportWidth, view.zoom);
}

/** Ordonnée écran vers ordonnée document. */
export function screenToDocY(screenY: number, view: View, viewportWidth: number): number {
  return (screenY - view.panY) / screenScale(viewportWidth, view.zoom);
}

/** Zoom autour d'un point écran fixe (centre du pincement, curseur…). */
export function zoomAround(view: View, focalX: number, focalY: number, newZoom: number): View {
  const zoom = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
  const ratio = zoom / view.zoom;
  return {
    zoom,
    panX: focalX - (focalX - view.panX) * ratio,
    panY: focalY - (focalY - view.panY) * ratio,
  };
}

/** Garde le document visible : centré s'il est plus petit que l'écran, sinon sans vide. */
export function clampView(view: View, viewport: Size, docHeight: number): View {
  const s = screenScale(viewport.width, view.zoom);
  const w = DOC_WIDTH * s;
  const h = docHeight * s;
  const panX =
    w <= viewport.width ? (viewport.width - w) / 2 : clamp(view.panX, viewport.width - w, 0);
  const panY = h <= viewport.height ? 0 : clamp(view.panY, viewport.height - h, 0);
  return { ...view, panX, panY };
}

/** Déplace la barre d'une hauteur de rang (direction -1 = vers le haut), bornée au document. */
export function nextRulerY(
  rulerY: number,
  rowHeight: number,
  direction: -1 | 1,
  docHeight: number,
): number {
  return clamp(rulerY + direction * rowHeight, 0, Math.max(0, docHeight - rowHeight));
}

/** Pan vertical qui amène l'ordonnée document `docY` au tiers haut de l'écran. */
export function panToReveal(docY: number, view: View, viewport: Size): number {
  return viewport.height / 3 - docY * screenScale(viewport.width, view.zoom);
}
