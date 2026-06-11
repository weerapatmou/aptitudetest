import { describe, expect, it } from 'vitest';
import type { Block, Difficulty, Puzzle } from '../types';
import { generatePuzzle, generateSession } from '../generate';
import {
  boxCells,
  buildOccupancy,
  cellKey,
  countTouchingFaces,
  hasOcclusionCycle,
  isConnected,
  isGrounded,
} from '../generate/geometry';
import { frontMostCellCount } from '../generate/fairness';
import { makeRng } from '../../rotation-puzzle/generate/rng';

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

function totalCells(blocks: Block[]): number {
  return blocks.reduce((n, b) => n + b.size.x * b.size.y * b.size.z, 0);
}

function sortedDims(b: Block): string {
  return [b.size.x, b.size.y, b.size.z].sort((p, q) => p - q).join('x');
}

function eachPuzzle(fn: (p: Puzzle, d: Difficulty) => void) {
  for (const d of DIFFICULTIES) {
    for (const seed of SEEDS) {
      fn(generatePuzzle(d, makeRng(seed), `t-${d}-${seed}`), d);
    }
  }
}

describe('generated puzzle invariants', () => {
  it('touchingFaces is in [0,6] and matches a fresh recount', () => {
    eachPuzzle((p) => {
      const occ = buildOccupancy(p.blocks);
      for (const b of p.blocks) {
        expect(b.touchingFaces).toBeGreaterThanOrEqual(0);
        expect(b.touchingFaces).toBeLessThanOrEqual(6);
        expect(b.touchingFaces).toBe(countTouchingFaces(b, occ));
      }
    });
  });

  it('touching is symmetric (A touches B ⇒ B touches A)', () => {
    eachPuzzle((p) => {
      const occ = buildOccupancy(p.blocks);
      const touches = new Set<string>();
      for (const b of p.blocks) {
        for (const c of boxCells(b)) {
          for (const [dx, dy, dz] of [
            [1, 0, 0],
            [-1, 0, 0],
            [0, 1, 0],
            [0, -1, 0],
            [0, 0, 1],
            [0, 0, -1],
          ]) {
            const owner = occ.get(cellKey({ x: c.x + dx, y: c.y + dy, z: c.z + dz }));
            if (owner !== undefined && owner !== b.id) touches.add(`${b.id}->${owner}`);
          }
        }
      }
      for (const pair of touches) {
        const [a, b] = pair.split('->');
        expect(touches.has(`${b}->${a}`)).toBe(true);
      }
    });
  });

  it('blocks form one connected, non-overlapping, congruent cluster', () => {
    eachPuzzle((p) => {
      expect(isConnected(p.blocks)).toBe(true);
      expect(buildOccupancy(p.blocks).size).toBe(totalCells(p.blocks));
      const dims = new Set(p.blocks.map(sortedDims));
      expect(dims.size).toBe(1); // all congruent
    });
  });

  it('labels are unique and contiguous from A', () => {
    eachPuzzle((p) => {
      const labels = p.blocks.map((b) => b.label).sort();
      const expected = p.blocks.map((_, i) => String.fromCharCode(65 + i)).sort();
      expect(labels).toEqual(expected);
    });
  });

  it('answers vary and at least one block touches another', () => {
    eachPuzzle((p) => {
      const vals = p.blocks.map((b) => b.touchingFaces);
      expect(new Set(vals).size).toBeGreaterThanOrEqual(2);
      expect(Math.max(...vals)).toBeGreaterThanOrEqual(1);
    });
  });

  it('every block is readable (visible in the projection)', () => {
    eachPuzzle((p) => {
      const counts = frontMostCellCount(p.blocks);
      for (const b of p.blocks) {
        const visible = counts.get(b.id) ?? 0;
        expect(visible).toBeGreaterThanOrEqual(1);
        const isBeam = b.size.x > 1 || b.size.y > 1 || b.size.z > 1;
        if (isBeam) expect(visible).toBeGreaterThanOrEqual(2);
      }
    });
  });

  it('blocks are stored in a valid painter order (occluder drawn after occludee)', () => {
    eachPuzzle((p) => {
      const occ = buildOccupancy(p.blocks);
      const maxX = Math.max(...p.blocks.map((b) => b.origin.x + b.size.x));
      const maxY = Math.max(...p.blocks.map((b) => b.origin.y + b.size.y));
      const maxZ = Math.max(...p.blocks.map((b) => b.origin.z + b.size.z));
      const indexOf = new Map(p.blocks.map((b, i) => [b.id, i]));
      for (const back of p.blocks) {
        for (const c of boxCells(back)) {
          for (let t = 1; c.x + t < maxX && c.y + t < maxY && c.z + t < maxZ; t++) {
            const front = occ.get(cellKey({ x: c.x + t, y: c.y + t, z: c.z + t }));
            if (front !== undefined && front !== back.id) {
              // `front` occludes `back`, so back must be drawn (appear) first.
              expect(indexOf.get(back.id)!).toBeLessThan(indexOf.get(front)!);
            }
          }
        }
      }
    });
  });

  it('no generated puzzle has an occlusion cycle', () => {
    eachPuzzle((p) => {
      expect(hasOcclusionCycle(p.blocks)).toBe(false);
    });
  });

  it('every structure is grounded (no floating blocks)', () => {
    eachPuzzle((p) => {
      expect(isGrounded(p.blocks)).toBe(true);
    });
  });

  it('viewBox is a well-formed "x y w h" with positive size', () => {
    eachPuzzle((p) => {
      const parts = p.viewBox.split(' ').map(Number);
      expect(parts).toHaveLength(4);
      expect(parts.every((n) => Number.isFinite(n))).toBe(true);
      expect(parts[2]!).toBeGreaterThan(0);
      expect(parts[3]!).toBeGreaterThan(0);
    });
  });

  it('honours difficulty knobs (block count and stacking height)', () => {
    const ranges: Record<Difficulty, { k: [number, number]; maxLayers: number }> = {
      easy: { k: [3, 6], maxLayers: 1 },
      normal: { k: [4, 8], maxLayers: 3 },
      hard: { k: [6, 12], maxLayers: 4 },
    };
    eachPuzzle((p, d) => {
      const r = ranges[d];
      expect(p.blocks.length).toBeGreaterThanOrEqual(r.k[0]);
      expect(p.blocks.length).toBeLessThanOrEqual(r.k[1]);
      const maxZ = Math.max(...p.blocks.map((b) => b.origin.z + b.size.z));
      expect(maxZ).toBeLessThanOrEqual(r.maxLayers);
    });
  });
});

describe('determinism and sessions', () => {
  it('same seed produces an identical session', () => {
    const settings = { count: 8, difficulty: 'mixed' as const };
    const a = generateSession(settings, 4242);
    const b = generateSession(settings, 4242);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('generateSession honours the requested count', () => {
    for (const count of [1, 5, 12]) {
      expect(generateSession({ count, difficulty: 'normal' }, 7).length).toBe(count);
    }
  });

  it('every difficulty still fills a full session under the readability rules', () => {
    for (const d of DIFFICULTIES) {
      const session = generateSession({ count: 30, difficulty: d }, 99);
      expect(session).toHaveLength(30);
      for (const p of session) {
        expect(new Set(p.blocks.map((b) => b.touchingFaces)).size).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
