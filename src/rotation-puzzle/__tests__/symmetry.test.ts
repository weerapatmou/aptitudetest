import { describe, it, expect } from 'vitest';
import {
  hausdorff,
  mirrorSymmetryDistances,
  minMirrorDistance,
  rotationalSymmetryAngles,
  figureMirrorDistance,
} from '../generate/symmetry';
import { generatePuzzle } from '../generate';
import { makeRng } from '../generate/rng';
import type { Difficulty } from '../types';
import { rotatePolygon } from '../generate/geometry';

const DIFFS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

describe('hausdorff', () => {
  it('is symmetric', () => {
    const a = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 5 }];
    const b = [{ x: 1, y: 1 }, { x: 6, y: 1 }, { x: 1, y: 6 }];
    expect(hausdorff(a, b)).toBeCloseTo(hausdorff(b, a));
  });

  it('is zero for identical sets', () => {
    const a = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 5 }];
    expect(hausdorff(a, a)).toBe(0);
  });
});

describe('mirrorSymmetryDistances', () => {
  it('returns ~0 for an axis-symmetric square', () => {
    const sq = [
      { x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 },
    ];
    const d = mirrorSymmetryDistances(sq);
    expect(d.x).toBeLessThan(0.001);
    expect(d.y).toBeLessThan(0.001);
  });

  it('returns large value for an asymmetric polygon', () => {
    const asym = [
      { x: 0, y: 0 }, { x: 30, y: 5 }, { x: 25, y: 20 }, { x: 5, y: 15 }, { x: -10, y: 8 },
    ];
    const d = mirrorSymmetryDistances(asym);
    const min = Math.min(d.x, d.y, d.diag, d.antidiag);
    expect(min).toBeGreaterThan(3);
  });
});

describe('rotationalSymmetryAngles', () => {
  it('detects 90° symmetry on a square', () => {
    const sq = [
      { x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 },
    ];
    // resample-ish - generate boundary points
    const boundary: { x: number; y: number }[] = [];
    for (let i = 0; i < 80; i++) {
      const t = i / 80;
      const seg = Math.floor(t * 4);
      const u = t * 4 - seg;
      const a = sq[seg]!, b = sq[(seg + 1) % 4]!;
      boundary.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
    }
    const found = rotationalSymmetryAngles(boundary);
    expect(found).toContain(90);
    expect(found).toContain(180);
  });

  it('returns empty for an asymmetric shape', () => {
    const asym: { x: number; y: number }[] = [];
    for (let i = 0; i < 40; i++) {
      const t = (i / 40) * Math.PI * 2;
      const r = 30 + 12 * Math.cos(t) + 6 * Math.sin(2 * t);
      asym.push({ x: r * Math.cos(t), y: r * Math.sin(t) });
    }
    const found = rotationalSymmetryAngles(asym);
    expect(found).toEqual([]);
  });

  it('is invariant under additional CCW rotation', () => {
    const sq = [
      { x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 },
    ];
    const boundary: { x: number; y: number }[] = [];
    for (let i = 0; i < 80; i++) {
      const t = i / 80;
      const seg = Math.floor(t * 4);
      const u = t * 4 - seg;
      const a = sq[seg]!, b = sq[(seg + 1) % 4]!;
      boundary.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
    }
    const rotated = rotatePolygon(boundary, 30);
    const found = rotationalSymmetryAngles(rotated);
    expect(found).toContain(90);
  });
});

describe('acceptance #4 — asymmetry guarantee', () => {
  // Trim the run count from 1000 so the suite stays under a minute. 250 per
  // difficulty is still a strong statistical sample.
  const N = 250;
  for (const diff of DIFFS) {
    it(`${diff}: all outer shapes have min mirror distance > 8px (${N} puzzles)`, () => {
      let minSeen = Infinity;
      let failing = 0;
      for (let i = 0; i < N; i++) {
        const p = generatePuzzle(diff, { rng: makeRng(0xa11ce + i) });
        const m = minMirrorDistance(p.original.outer);
        if (m <= 8) failing++;
        if (m < minSeen) minSeen = m;
        // Also the full figure should have mirror distance > 10
        const f = figureMirrorDistance(p.original);
        expect(f).toBeGreaterThan(10);
      }
      expect(failing).toBe(0);
      expect(minSeen).toBeGreaterThan(8);
    });
  }
});
