import { beforeEach, describe, expect, it } from 'vitest';
import { create, db, getActive } from '../../db';
import type { WorkSession } from '../../db';
import { applyDelta, counterSummary, moveId, parseTarget, remaining } from './counters';
import { startSession, stopSession } from './timer';
import {
  findOpenSession,
  formatClock,
  formatHoursMinutes,
  openSessionMs,
  projectTotalMs,
  sessionDurationMs,
} from './time';
import {
  DOC_WIDTH,
  clampView,
  docToScreenY,
  nextRulerY,
  screenToDocY,
  zoomAround,
} from './viewport';

const sess = (p: Partial<WorkSession>): WorkSession => ({
  id: 'x',
  createdAt: 0,
  updatedAt: 0,
  projectId: 'a',
  startedAt: 0,
  ...p,
});

describe('calcul du temps', () => {
  it('additionne sessions fermées et ouvertes', () => {
    const sessions = [
      sess({ startedAt: 0, endedAt: 3_600_000 }),
      sess({ startedAt: 10_000_000, endedAt: 10_600_000 }),
      sess({ startedAt: 20_000_000 }),
      sess({ projectId: 'b', startedAt: 0, endedAt: 999 }),
    ];
    expect(projectTotalMs(sessions, 'a', 20_300_000)).toBe(3_600_000 + 600_000 + 300_000);
    expect(projectTotalMs(sessions, 'b', 0)).toBe(999);
  });
  it('ignore les sessions supprimées et les durées négatives', () => {
    const sessions = [sess({ startedAt: 0, endedAt: 1000, deletedAt: 5 })];
    expect(projectTotalMs(sessions, 'a', 5000)).toBe(0);
    expect(sessionDurationMs({ startedAt: 100, endedAt: 50 }, 0)).toBe(0);
  });
  it('repère la session ouverte', () => {
    const open = sess({ id: 'o', startedAt: 5 });
    expect(findOpenSession([sess({ endedAt: 3 }), open])).toBe(open);
    expect(findOpenSession([sess({ endedAt: 3 })])).toBeUndefined();
    expect(openSessionMs([open], 'a', 65)).toBe(60);
    expect(openSessionMs([open], 'b', 65)).toBe(0);
  });
  it('formate les durées', () => {
    expect(formatHoursMinutes(7_500_000)).toBe('2 h 05 min');
    expect(formatHoursMinutes(719_000)).toBe('11 min');
    expect(formatClock(3_723_000)).toBe('01:02:03');
  });
});

describe('une seule session ouverte', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
  it('démarrer sur un projet clôt la session ouverte ailleurs', async () => {
    await startSession('a');
    await startSession('b');
    const all = await getActive(db.workSessions);
    expect(all).toHaveLength(2);
    const open = all.filter((s) => s.endedAt === undefined);
    expect(open).toHaveLength(1);
    expect(open[0]!.projectId).toBe('b');
  });
  it('redémarrer le même projet ne crée pas de doublon, stop clôt', async () => {
    await startSession('a');
    await startSession('a');
    expect(await getActive(db.workSessions)).toHaveLength(1);
    await stopSession('a');
    expect((await getActive(db.workSessions))[0]!.endedAt).toBeDefined();
    await create(db.workSessions, { projectId: 'a', startedAt: 1 });
    await stopSession('a');
    expect((await getActive(db.workSessions)).every((s) => s.endedAt !== undefined)).toBe(true);
  });
});

describe('compteurs', () => {
  it('borne à 0 et applique le pas', () => {
    expect(applyDelta(0, -1)).toBe(0);
    expect(applyDelta(11, 1)).toBe(12);
    expect(applyDelta(5, -1)).toBe(4);
  });
  it('calcule les restants', () => {
    expect(remaining(12, 50)).toBe(38);
    expect(remaining(60, 50)).toBe(0);
    expect(remaining(12)).toBeUndefined();
    expect(remaining(12, 0)).toBeUndefined();
    expect(counterSummary(12, 50)).toBe('Rang 12 / 50 · 38 restants');
    expect(counterSummary(12)).toBe('Rang 12');
  });
  it('analyse l’objectif et réordonne', () => {
    expect(parseTarget('50')).toBe(50);
    expect(parseTarget('')).toBeUndefined();
    expect(parseTarget('-3')).toBeUndefined();
    expect(moveId(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveId(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(moveId(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });
});

describe('coordonnées barre / document', () => {
  const view = { panX: 0, panY: -300, zoom: 2 };
  it('convertit dans les deux sens', () => {
    const screen = docToScreenY(400, view, 400); // échelle = 0,4 × 2 = 0,8
    expect(screen).toBe(-300 + 400 * 0.8);
    expect(screenToDocY(screen, view, 400)).toBeCloseTo(400);
  });
  it('la barre garde sa position document quand on zoome autour d’un point', () => {
    const focal = { x: 200, y: 300 };
    const docY = screenToDocY(focal.y, view, 400);
    const zoomed = zoomAround(view, focal.x, focal.y, 4);
    expect(zoomed.zoom).toBe(4);
    expect(docToScreenY(docY, zoomed, 400)).toBeCloseTo(focal.y);
  });
  it('borne le zoom et le déplacement', () => {
    expect(zoomAround(view, 0, 0, 99).zoom).toBe(6);
    expect(zoomAround(view, 0, 0, 0.1).zoom).toBe(1);
    const c = clampView({ panX: 50, panY: 50, zoom: 1 }, { width: 400, height: 800 }, 4000);
    expect(c.panX).toBeCloseTo(0);
    expect(c.panY).toBe(0);
    const d = clampView({ panX: 0, panY: -99999, zoom: 1 }, { width: 400, height: 800 }, 4000);
    expect(d.panY).toBeCloseTo(800 - 4000 * 0.4);
    expect(DOC_WIDTH).toBe(1000);
  });
  it('déplace la barre d’une hauteur de rang, bornée', () => {
    expect(nextRulerY(100, 40, -1, 1000)).toBe(60);
    expect(nextRulerY(10, 40, -1, 1000)).toBe(0);
    expect(nextRulerY(990, 40, 1, 1000)).toBe(960);
  });
});
