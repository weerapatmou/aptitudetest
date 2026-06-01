import { describe, expect, it } from 'vitest';
import { isMentallyTractable } from '../generate/tractability';
import { generateSeriesQuestion } from '../generate';
import { makeRng } from '../generate/rng';
import type { PatternKind, SeriesPattern } from '../types';

function pattern(kind: PatternKind, terms: number[]): SeriesPattern {
  return { kind, difficulty: 'hard', formula: 'f', explanation: 'e', terms };
}

describe('isMentallyTractable', () => {
  it('rejects squares of large primes but keeps small ones', () => {
    expect(isMentallyTractable(pattern('prime-squares', [529, 841, 961, 1369, 1681, 1849]))).toBe(
      false,
    );
    expect(isMentallyTractable(pattern('prime-squares', [49, 121, 169, 289, 361]))).toBe(true);
  });

  it('accepts large geometric sequences (each step is a small multiply)', () => {
    expect(isMentallyTractable(pattern('geo-mul', [5, 25, 125, 625, 3125]))).toBe(true);
  });

  it('keeps small cubes but rejects cubes of two-digit numbers', () => {
    expect(isMentallyTractable(pattern('cubes', [1, 8, 27, 64, 125, 216]))).toBe(true);
    expect(
      isMentallyTractable(pattern('cubes', [12167, 13824, 15625, 17576, 19683, 21952])),
    ).toBe(false);
  });

  it('accepts recurrences and factorials, rejects nⁿ and 2^(n²)', () => {
    expect(isMentallyTractable(pattern('fibonacci', [2, 3, 5, 8, 13, 21]))).toBe(true);
    expect(isMentallyTractable(pattern('factorial', [1, 2, 6, 24, 120, 720]))).toBe(true);
    expect(isMentallyTractable(pattern('n-to-n', [1, 4, 27, 256, 3125]))).toBe(false);
    expect(isMentallyTractable(pattern('pow-of-square', [2, 16, 512, 65536]))).toBe(false);
  });

  it('rejects step-derivable sequences that compound into six-digit terms', () => {
    // descending-dual-mul-sub with a long window: ×13, ×11, ×9, … explodes.
    expect(
      isMentallyTractable(pattern('descending-dual-mul-sub', [3, 25, 263, 2357, 16491, 82449, 247343])),
    ).toBe(false);
  });
});

describe('generated questions are always mentally tractable', () => {
  it.each(['easy', 'medium', 'hard', 'expert', 'mixed'] as const)(
    'every %s question passes the gate across many seeds',
    (difficulty) => {
      for (let seed = 1; seed <= 200; seed++) {
        const rng = makeRng(seed);
        for (let i = 0; i < 5; i++) {
          const q = generateSeriesQuestion(difficulty, rng);
          expect(isMentallyTractable(q.pattern)).toBe(true);
        }
      }
    },
  );
});
