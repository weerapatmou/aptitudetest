import { describe, it, expect } from 'vitest';
import { generatePuzzle, generateSession } from '../generate';
import { placementKey } from '../generate/cube';
import { makeRng } from '@/rotation-puzzle/generate/rng';
import { GLYPHS } from '../generate/iso';
import type { Difficulty } from '../types';

describe('flip-box generation', () => {
  it('produces the requested number of puzzles', () => {
    const puzzles = generateSession({ count: 25, difficulty: 'mixed' }, 12345);
    expect(puzzles).toHaveLength(25);
  });

  it('every puzzle is well-formed', () => {
    const puzzles = generateSession({ count: 60, difficulty: 'mixed' }, 999);
    for (const p of puzzles) {
      // six distinct, all-visible choices, exactly one correct
      expect(p.choices).toHaveLength(6);
      const keys = new Set(p.choices.map((c) => placementKey(c.placement)));
      expect(keys.size).toBe(6);
      expect(p.choices.every((c) => c.placement.face !== null)).toBe(true);
      expect(p.choices.filter((c) => c.isCorrect)).toHaveLength(1);

      // correctIndex points at the correct choice, which equals the final step
      expect(p.choices[p.correctIndex]!.isCorrect).toBe(true);
      const final = p.steps[p.steps.length - 1]!;
      expect(placementKey(p.choices[p.correctIndex]!.placement)).toBe(placementKey(final));

      // start and end are on visible faces; replay matches the command count
      expect(p.initial.face).not.toBeNull();
      expect(final.face).not.toBeNull();
      expect(p.steps).toHaveLength(p.commands.length);

      // the cosmetic glyph is one of the known variants
      expect(GLYPHS).toContain(p.glyph);
    }
  });

  it('keeps sequence length inside the per-difficulty band', () => {
    const bands: Record<Difficulty, [number, number]> = {
      easy: [3, 4],
      normal: [4, 6],
      hard: [5, 8],
    };
    (Object.keys(bands) as Difficulty[]).forEach((d) => {
      const [lo, hi] = bands[d];
      const rng = makeRng(7);
      // Many draws to exercise the band (length is rolled per question).
      for (let i = 0; i < 40; i++) {
        const p = generatePuzzle(d, rng, `x-${i}`);
        expect(p.commands.length).toBeGreaterThanOrEqual(lo);
        expect(p.commands.length).toBeLessThanOrEqual(hi);
      }
    });
  });

  it('varies sequence length within a difficulty band', () => {
    const rng = makeRng(7);
    const lens = new Set<number>();
    for (let i = 0; i < 40; i++) lens.add(generatePuzzle('hard', rng, `h-${i}`).commands.length);
    expect(lens.size).toBeGreaterThan(1);
  });
});
