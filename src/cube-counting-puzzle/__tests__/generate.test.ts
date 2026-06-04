import { describe, it, expect } from 'vitest';
import { generatePuzzle, generateSession } from '../generate';
import { makeRng } from '../generate/rng';
import type { DifficultyOrMixed } from '../types';

const DIFFS: DifficultyOrMixed[] = ['easy', 'normal', 'hard', 'mixed'];

describe('cube-counting puzzle — structure', () => {
  for (const diff of DIFFS) {
    it(`${diff}: 4 unique choices, exactly one correct = total`, () => {
      for (let i = 0; i < 80; i++) {
        const p = generatePuzzle(diff, makeRng(0xaa + i), `t-${i}`);
        expect(p.choices.length).toBe(4);

        const correct = p.choices.filter((c) => c.isCorrect);
        expect(correct.length).toBe(1);
        expect(correct[0]!.value).toBe(p.arrangement.total);
        expect(p.choices[p.correctIndex]!.isCorrect).toBe(true);

        // All option values are distinct positive integers.
        const values = p.choices.map((c) => c.value);
        expect(new Set(values).size).toBe(4);
        for (const v of values) expect(v).toBeGreaterThanOrEqual(1);

        // Every distractor carries a non-empty rationale and a wrong-kind tag.
        for (const c of p.choices) {
          expect(c.rationale.length).toBeGreaterThan(0);
          if (!c.isCorrect) expect(c.kind).not.toBe('correct');
        }

        // viewBox is a well-formed "minX minY w h" string with positive size.
        const parts = p.viewBox.split(' ').map(Number);
        expect(parts).toHaveLength(4);
        expect(parts[2]!).toBeGreaterThan(0);
        expect(parts[3]!).toBeGreaterThan(0);
      }
    });
  }
});

describe('cube-counting session — determinism', () => {
  it('same seed reproduces the same session', () => {
    const settings = { count: 12, difficulty: 'mixed' as const };
    const a = generateSession(settings, 777);
    const b = generateSession(settings, 777);
    expect(a.map((p) => p.choices.map((c) => c.value))).toEqual(
      b.map((p) => p.choices.map((c) => c.value)),
    );
    expect(a.map((p) => p.arrangement.total)).toEqual(b.map((p) => p.arrangement.total));
  });

  it('produces the requested number of puzzles', () => {
    expect(generateSession({ count: 20, difficulty: 'easy' }, 1).length).toBe(20);
  });
});
