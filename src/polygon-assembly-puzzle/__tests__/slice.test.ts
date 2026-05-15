import { describe, it, expect } from 'vitest';
import { makeRng } from '../../rotation-puzzle/generate/rng';
import { makeTarget } from '../generate/target';
import { sliceTargetWithRetry, polygonArea, makeCorrectPieces } from '../generate/slice';

describe('slicePolygon', () => {
  for (const n of [3, 4, 5, 6]) {
    it(`splits each target shape into exactly ${n} pieces with area conserved`, () => {
      const rng = makeRng(1234 + n);
      for (const kind of ['rect', 'pentagon', 'hexagon', 'lShape', 'tShape', 'trapezoid'] as const) {
        const target = makeTarget(kind);
        const pieces = sliceTargetWithRetry(target, n, rng);
        expect(pieces.length).toBe(n);
        const totalArea = pieces.reduce((s, p) => s + polygonArea(p), 0);
        const targetArea = polygonArea(target);
        // Area conserved within 1% (rounding tolerance for cut-vertex placement).
        expect(Math.abs(totalArea - targetArea) / targetArea).toBeLessThan(0.01);
      }
    });
  }

  it('makeCorrectPieces re-centers each piece at origin and stores assembled offset', () => {
    const rng = makeRng(42);
    const target = makeTarget('hexagon');
    const pieces = sliceTargetWithRetry(target, 4, rng);
    const scattered = makeCorrectPieces(pieces);
    expect(scattered.length).toBe(4);
    for (const sp of scattered) {
      // Sum of local poly coords should be ~0 (centroid at origin).
      const sx = sp.polygon.reduce((s, p) => s + p.x, 0) / sp.polygon.length;
      const sy = sp.polygon.reduce((s, p) => s + p.y, 0) / sp.polygon.length;
      expect(Math.abs(sx)).toBeLessThan(1e-6);
      expect(Math.abs(sy)).toBeLessThan(1e-6);
      expect(sp.assembledFlipped).toBe(false);
      expect(sp.assembledRotation).toBe(0);
    }
  });
});
