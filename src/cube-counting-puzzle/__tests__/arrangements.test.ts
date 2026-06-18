import { describe, it, expect } from 'vitest';
import { buildArrangement, DIFFICULTY_CONFIG, isReadable, isConnected } from '../generate/arrangements';
import { hiddenCubes } from '../generate/counting';
import { occupancySet, cellKey } from '../generate/iso';
import { makeRng } from '../generate/rng';
import type { Difficulty } from '../types';

const DIFFS: Difficulty[] = ['easy', 'normal', 'hard'];

type HMap = { cols: number; rows: number; height: number[][]; archetype?: string };

// Archetypes that are challenging through height patterns rather than hidden cube count.
const HEIGHT_PATTERN_ARCHETYPES = new Set([
  'checkerboard', 'chevron', 'double-stair', 'wall-pair',
  'spine', 'crown', 'ridge-valley', 'corner-step', 'two-ridges',
  'battlement', 'tri-tower', 'diamond-mound', 'wave', 'diagonal-split',
]);

function footprintCols(a: HMap): number {
  let n = 0;
  for (let x = 0; x < a.cols; x++)
    for (let y = 0; y < a.rows; y++) if (a.height[x]![y]! > 0) n++;
  return n;
}

/** Structural shapes (rings/cross/L with footprint gaps, recessed wells, or height-pattern archetypes). */
function isStructural(a: HMap): boolean {
  if (a.archetype && HEIGHT_PATTERN_ARCHETYPES.has(a.archetype)) return true;
  if (footprintCols(a) < a.cols * a.rows) return true; // frame / plus / l-prism
  let minBoundary = Infinity;
  for (let x = 0; x < a.cols; x++) {
    for (let y = 0; y < a.rows; y++) {
      if (x === 0 || x === a.cols - 1 || y === 0 || y === a.rows - 1) {
        minBoundary = Math.min(minBoundary, a.height[x]![y]!);
      }
    }
  }
  for (let x = 1; x < a.cols - 1; x++)
    for (let y = 1; y < a.rows - 1; y++) if (a.height[x]![y]! < minBoundary) return true; // well
  return false;
}

describe('arrangements — support validity', () => {
  for (const diff of DIFFS) {
    it(`${diff}: every cube above the floor rests on a cube below it`, () => {
      for (let i = 0; i < 80; i++) {
        const a = buildArrangement(diff, makeRng(0x5eed + i));
        const occ = occupancySet(a.cells);
        for (const c of a.cells) {
          if (c.z > 0) {
            expect(occ.has(cellKey(c.x, c.y, c.z - 1))).toBe(true);
          }
        }
      }
    });
  }
});

describe('arrangements — difficulty constraints', () => {
  for (const diff of DIFFS) {
    const cfg = DIFFICULTY_CONFIG[diff];
    it(`${diff}: solid shapes meet the hidden floor; structural shapes are exempt`, () => {
      for (let i = 0; i < 80; i++) {
        const a = buildArrangement(diff, makeRng(0xc0de + i));
        expect(a.total).toBeGreaterThanOrEqual(1);
        // Solid convex shapes earn difficulty from hidden cubes; rings/wells/cross/L
        // are challenging through geometry and don't need the hidden floor.
        if (!isStructural(a)) {
          expect(hiddenCubes(a)).toBeGreaterThanOrEqual(cfg.hiddenMin);
        }
      }
    });
  }
});

describe('arrangements — readability (no ambiguous figures)', () => {
  for (const diff of DIFFS) {
    it(`${diff}: every generated stack is connected and readable`, () => {
      for (let i = 0; i < 120; i++) {
        const a = buildArrangement(diff, makeRng(0xf00d + i));
        expect(isConnected(a.cols, a.rows, a.height)).toBe(true);
        expect(isReadable(a.cols, a.rows, a.height)).toBe(true);
      }
    });
  }

  it('isReadable rejects an interior hole', () => {
    // ring of height-2 columns around an empty centre
    const height = [
      [2, 2, 2],
      [2, 0, 2],
      [2, 2, 2],
    ];
    expect(isReadable(3, 3, height)).toBe(false);
  });

  it('isReadable rejects a deep pit', () => {
    const height = [
      [3, 3, 3],
      [3, 1, 3],
      [3, 3, 3],
    ];
    expect(isReadable(3, 3, height)).toBe(false);
  });

  it('isReadable rejects an isolated spike', () => {
    const height = [
      [1, 1, 1],
      [1, 4, 1],
      [1, 1, 1],
    ];
    expect(isReadable(3, 3, height)).toBe(false);
  });

  it('isReadable accepts a clean staircase', () => {
    const height = [
      [1, 2, 3],
      [1, 2, 3],
      [1, 2, 3],
    ];
    expect(isReadable(3, 3, height)).toBe(true);
  });

  it('isReadable accepts a hollow frame (≥2-wide ring)', () => {
    // 4×4 frame, wall thickness 1, inner 2×2 hole to the floor
    const height = [
      [3, 3, 3, 3],
      [3, 0, 0, 3],
      [3, 0, 0, 3],
      [3, 3, 3, 3],
    ];
    expect(isReadable(4, 4, height)).toBe(true);
  });

  it('isReadable accepts a recessed well (≥2-wide sunken centre)', () => {
    const height = [
      [4, 4, 4, 4],
      [4, 1, 1, 4],
      [4, 1, 1, 4],
      [4, 4, 4, 4],
    ];
    expect(isReadable(4, 4, height)).toBe(true);
  });
});

describe('arrangements — complex archetypes appear on hard', () => {
  function hasInteriorEmpty(a: HMap): boolean {
    for (let x = 1; x < a.cols - 1; x++)
      for (let y = 1; y < a.rows - 1; y++) if (a.height[x]![y]! === 0) return true;
    return false;
  }

  it('hard yields some structural figures (rings/cross/L with footprint gaps)', () => {
    let structural = 0;
    let hollow = 0;
    for (let i = 0; i < 200; i++) {
      const a = buildArrangement('hard', makeRng(0x900d + i));
      if (footprintCols(a) < a.cols * a.rows) structural++;
      if (hasInteriorEmpty(a)) hollow++;
    }
    expect(structural).toBeGreaterThan(0);
    expect(hollow).toBeGreaterThan(0); // at least one true ring/frame
  });
});

describe('arrangements — determinism', () => {
  it('same seed reproduces the same arrangement', () => {
    const a = buildArrangement('hard', makeRng(123));
    const b = buildArrangement('hard', makeRng(123));
    expect(b.total).toBe(a.total);
    expect(b.cells).toEqual(a.cells);
  });
});
