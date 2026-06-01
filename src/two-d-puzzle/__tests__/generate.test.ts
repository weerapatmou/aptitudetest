import { describe, it, expect } from 'vitest';
import { generatePuzzle, generateSession, piecesForDifficulty } from '../generate';
import { area } from '../generate/notch';
import { makeRng } from '../../rotation-puzzle/generate/rng';
import { polygonBounds } from '../../rotation-puzzle/generate/geometry';
import type { Difficulty, DifficultyOrMixed, ShapeScope } from '../types';

const DIFFS: DifficultyOrMixed[] = ['easy', 'normal', 'hard', 'mixed'];
const SCOPES: ShapeScope[] = ['square', 'square-rect'];

const ALLOWED_K: Record<Difficulty, number[]> = {
  easy: [1],
  normal: [1, 2],
  hard: [1, 2, 3, 4],
};

describe('2D puzzle generation — structure', () => {
  for (const diff of DIFFS) {
    for (const scope of SCOPES) {
      it(`${diff}/${scope}: 4 choices, correct count obeys the difficulty rule`, () => {
        for (let i = 0; i < 60; i++) {
          const p = generatePuzzle(diff, scope, makeRng(0xb0a + i), `t-${i}`);
          expect(p.choices.length).toBe(4);
          expect(p.correctIndices.length).toBe(p.choices.filter((c) => c.isCorrect).length);
          expect(ALLOWED_K[p.difficulty]).toContain(p.correctIndices.length);
          // Every distractor carries a non-empty reason and is flagged wrong.
          for (const c of p.choices) {
            if (!c.isCorrect) {
              expect(c.kind).not.toBe('correct');
              expect(c.explanation.length).toBeGreaterThan(0);
            }
          }
        }
      });
    }
  }
});

describe('2D puzzle generation — the correct pieces tile the gap exactly', () => {
  for (const diff of DIFFS) {
    it(`${diff}: Σ(correct piece areas) ≈ area(completed) − area(main)`, () => {
      for (let i = 0; i < 60; i++) {
        const p = generatePuzzle(diff, 'square', makeRng(0xc0ffee + i), `t-${i}`);
        const gap = area(p.completed) - area(p.main);
        const sum = p.choices
          .filter((c) => c.isCorrect)
          .reduce((acc, c) => acc + area(c.piece.polygon), 0);
        // True-position pieces partition the gap, so areas must match closely.
        expect(Math.abs(sum - gap)).toBeLessThan(1);
      }
    });
  }
});

describe('2D puzzle generation — main + correct pieces reconstruct the completed shape', () => {
  it('combined area and bounds match the completed square', () => {
    for (let i = 0; i < 60; i++) {
      const p = generatePuzzle('hard', 'square', makeRng(0xabc + i), `t-${i}`);
      const combined =
        area(p.main) +
        p.choices.filter((c) => c.isCorrect).reduce((a, c) => a + area(c.piece.polygon), 0);
      expect(Math.abs(combined - area(p.completed))).toBeLessThan(1);

      const cb = polygonBounds(p.completed);
      const mb = polygonBounds(p.main);
      // The main shape never pokes outside the completed square.
      expect(mb.minX).toBeGreaterThanOrEqual(cb.minX - 0.01);
      expect(mb.minY).toBeGreaterThanOrEqual(cb.minY - 0.01);
      expect(mb.maxX).toBeLessThanOrEqual(cb.maxX + 0.01);
      expect(mb.maxY).toBeLessThanOrEqual(cb.maxY + 0.01);
    }
  });
});

describe('2D puzzle generation — determinism', () => {
  it('same seed yields identical sessions', () => {
    const a = generateSession({ count: 8, difficulty: 'mixed', shapeScope: 'square-rect' }, 12345);
    const b = generateSession({ count: 8, difficulty: 'mixed', shapeScope: 'square-rect' }, 12345);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('generateSession honors the requested count', () => {
    const s = generateSession({ count: 15, difficulty: 'normal', shapeScope: 'square' }, 7);
    expect(s.length).toBe(15);
  });
});

describe('2D puzzle generation — piece-count helper', () => {
  it('easy always returns 1', () => {
    for (let i = 0; i < 20; i++) expect(piecesForDifficulty('easy', makeRng(i))).toBe(1);
  });
  it('normal returns 1 or 2', () => {
    for (let i = 0; i < 40; i++) expect([1, 2]).toContain(piecesForDifficulty('normal', makeRng(i)));
  });
  it('hard returns 1..4', () => {
    for (let i = 0; i < 60; i++)
      expect([1, 2, 3, 4]).toContain(piecesForDifficulty('hard', makeRng(i)));
  });
});
