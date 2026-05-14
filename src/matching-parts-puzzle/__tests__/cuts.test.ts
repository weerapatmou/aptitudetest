import { describe, it, expect } from 'vitest';
import { REFERENCE_KINDS } from '../types';
import { generateReferenceShape } from '../generate/shapes';
import { cutPolygon, signedArea, splitPolygonByChord, pickBoundaryPointAt } from '../generate/cuts';
import { makeRng } from '../../rotation-puzzle/generate/rng';

const AREA_TOL = 0.5; // allow 0.5 px² float drift

describe('cuts — splitPolygonByChord covers the original area', () => {
  for (const kind of REFERENCE_KINDS) {
    it(`${kind}: piece areas sum to the reference area (straight chord)`, () => {
      const ref = generateReferenceShape(kind);
      const rng = makeRng(0xc0c0 + kind.length);
      for (let trial = 0; trial < 20; trial++) {
        const result = cutPolygon(ref.polygon, 'straight-chord', rng);
        expect(result).not.toBeNull();
        const [a, b] = result!.pieces;
        const total = Math.abs(signedArea(ref.polygon));
        const sum = Math.abs(signedArea(a)) + Math.abs(signedArea(b));
        expect(Math.abs(sum - total)).toBeLessThan(AREA_TOL);
      }
    });

    it(`${kind}: piece areas sum to the reference area (polyline cut)`, () => {
      const ref = generateReferenceShape(kind);
      const rng = makeRng(0xf00d + kind.length);
      let trials = 0;
      for (let i = 0; i < 30 && trials < 10; i++) {
        const result = cutPolygon(ref.polygon, 'polyline', rng);
        if (!result) continue;
        trials++;
        const total = Math.abs(signedArea(ref.polygon));
        const sum =
          Math.abs(signedArea(result.pieces[0])) + Math.abs(signedArea(result.pieces[1]));
        expect(Math.abs(sum - total)).toBeLessThan(AREA_TOL);
      }
      expect(trials).toBeGreaterThanOrEqual(5);
    });
  }
});

describe('cuts — each piece is a simple polygon', () => {
  it('every cut produces two polygons with ≥ 3 verts', () => {
    const ref = generateReferenceShape('hexagon');
    const rng = makeRng(0xabcd);
    for (let i = 0; i < 25; i++) {
      const result = cutPolygon(ref.polygon, 'straight-chord', rng);
      if (!result) continue;
      expect(result.pieces[0].length).toBeGreaterThanOrEqual(3);
      expect(result.pieces[1].length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('cuts — splitPolygonByChord boundary points are present in both pieces', () => {
  it('both pieces start at one boundary point and end at the other', () => {
    const ref = generateReferenceShape('square');
    const b1 = pickBoundaryPointAt(ref.polygon, 0.1);
    const b2 = pickBoundaryPointAt(ref.polygon, 0.6);
    const [a, b] = splitPolygonByChord(ref.polygon, b1, b2);

    const present = (poly: { x: number; y: number }[], pt: { x: number; y: number }) =>
      poly.some((p) => Math.abs(p.x - pt.x) < 0.01 && Math.abs(p.y - pt.y) < 0.01);

    expect(present(a, b1.pt)).toBe(true);
    expect(present(a, b2.pt)).toBe(true);
    expect(present(b, b1.pt)).toBe(true);
    expect(present(b, b2.pt)).toBe(true);
  });
});
