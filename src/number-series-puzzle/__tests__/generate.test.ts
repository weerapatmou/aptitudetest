import { describe, expect, it } from 'vitest';
import { generateSeriesQuestion, generateSession } from '../generate';
import { makeRng } from '../generate/rng';
import { EASY_GENERATORS } from '../generate/patterns/easy';
import { MEDIUM_GENERATORS } from '../generate/patterns/medium';
import { HARD_GENERATORS } from '../generate/patterns/hard';
import { EXPERT_GENERATORS } from '../generate/patterns/expert';
import type { Difficulty } from '../types';

const TIERS: Array<{ difficulty: Difficulty; generators: typeof EASY_GENERATORS }> = [
  { difficulty: 'easy', generators: EASY_GENERATORS },
  { difficulty: 'medium', generators: MEDIUM_GENERATORS },
  { difficulty: 'hard', generators: HARD_GENERATORS },
  { difficulty: 'expert', generators: EXPERT_GENERATORS },
];

describe('pattern generators produce valid sequences', () => {
  for (const { difficulty, generators } of TIERS) {
    for (const gen of generators) {
      it(`[${difficulty}] ${gen.name || 'anonymous'} returns the requested number of finite terms`, () => {
        const rng = makeRng(1234);
        const pattern = gen(rng, 6);
        expect(pattern.difficulty).toBe(difficulty);
        expect(pattern.terms.length).toBe(6);
        for (const t of pattern.terms) {
          expect(Number.isFinite(t)).toBe(true);
        }
        expect(pattern.formula.length).toBeGreaterThan(0);
        expect(pattern.explanation.length).toBeGreaterThan(0);
      });
    }
  }
});

describe('generateSeriesQuestion', () => {
  it.each(['easy', 'medium', 'hard', 'expert'] as const)(
    'produces a well-formed question for difficulty %s',
    (difficulty) => {
      const rng = makeRng(42);
      const q = generateSeriesQuestion(difficulty, rng);
      expect(q.difficulty).toBe(difficulty);
      expect(q.options.length).toBe(4);
      // exactly one correct
      expect(q.options.filter((o) => o.isCorrect).length).toBe(1);
      // values are unique
      const values = q.options.map((o) => o.value);
      expect(new Set(values).size).toBe(4);
      // correct option's value matches correctValue and matches terms[missingIndex]
      const correctOpt = q.options.find((o) => o.isCorrect)!;
      expect(correctOpt.value).toBe(q.correctValue);
      expect(q.pattern.terms[q.missingIndex]).toBe(q.correctValue);
      // visibleTerms has exactly one null at missingIndex; the rest match terms.
      expect(q.visibleTerms[q.missingIndex]).toBeNull();
      for (let i = 0; i < q.visibleTerms.length; i++) {
        if (i !== q.missingIndex) {
          expect(q.visibleTerms[i]).toBe(q.pattern.terms[i]);
        }
      }
      // every option has a non-empty rationale.
      for (const opt of q.options) {
        expect(opt.rationale.length).toBeGreaterThan(0);
      }
    },
  );

  it('mixed difficulty produces a mix when generating many', () => {
    const rng = makeRng(7);
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) {
      seen.add(generateSeriesQuestion('mixed', rng).difficulty);
    }
    // With 80 draws across 4 tiers, the chance of missing any tier is negligible.
    expect(seen.size).toBe(4);
  });

  it('seeded generation is deterministic', () => {
    const a = generateSession({ count: 10, difficulty: 'mixed' }, 12345);
    const b = generateSession({ count: 10, difficulty: 'mixed' }, 12345);
    expect(a.map((q) => q.correctValue)).toEqual(b.map((q) => q.correctValue));
    expect(a.map((q) => q.pattern.kind)).toEqual(b.map((q) => q.pattern.kind));
  });

  it('blank position can land at the last term and sometimes in the middle', () => {
    const rng = makeRng(999);
    let lastBlankCount = 0;
    let middleBlankCount = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const q = generateSeriesQuestion('medium', rng);
      if (q.missingIndex === q.visibleTerms.length - 1) lastBlankCount++;
      else middleBlankCount++;
    }
    // Both should occur over 200 trials.
    expect(lastBlankCount).toBeGreaterThan(0);
    expect(middleBlankCount).toBeGreaterThan(0);
    // Last-position should dominate (target 70%).
    expect(lastBlankCount).toBeGreaterThan(middleBlankCount);
  });
});

describe('interleaved / mod-cycle patterns get enough visible terms', () => {
  const REQUIRED: Array<{ kind: string; difficulty: Difficulty; minLen: number }> = [
    { kind: 'interleaved-2', difficulty: 'medium', minLen: 7 },
    { kind: 'pair-skip', difficulty: 'medium', minLen: 7 },
    { kind: 'interleaved-3', difficulty: 'expert', minLen: 10 },
  ];

  for (const { kind, difficulty, minLen } of REQUIRED) {
    it(`${kind}: every generated question has at least ${minLen} terms`, () => {
      const rng = makeRng(20260529);
      let sawKind = 0;
      // Generate generously to surface the kind several times; each tier has many
      // generators so we need a healthy budget.
      for (let i = 0; i < 800 && sawKind < 8; i++) {
        const q = generateSeriesQuestion(difficulty, rng);
        if (q.pattern.kind !== kind) continue;
        sawKind++;
        expect(q.visibleTerms.length).toBeGreaterThanOrEqual(minLen);
        expect(q.pattern.terms.length).toBeGreaterThanOrEqual(minLen);
      }
      expect(sawKind).toBeGreaterThan(0);
    });
  }
});

describe('recurrence patterns get a long readable run with a trailing blank', () => {
  const REQUIRED: Array<{ kind: string; difficulty: Difficulty; minLen: number }> = [
    { kind: 'padovan', difficulty: 'expert', minLen: 9 },
    { kind: 'third-diff-pattern', difficulty: 'expert', minLen: 9 },
    { kind: 'fib-times-n', difficulty: 'expert', minLen: 8 },
    { kind: 'pell', difficulty: 'hard', minLen: 8 },
    { kind: 'deceptive-start', difficulty: 'hard', minLen: 8 },
    // Position-varying multiplicative patterns (mul-by-2n-sub-2n omitted: it
    // exceeds the magnitude backstop at length 7 and so appears only rarely).
    { kind: 'mul3-sub-growing', difficulty: 'expert', minLen: 7 },
    { kind: 'mul-n-add-next-square', difficulty: 'expert', minLen: 7 },
    { kind: 'mul-by-n-add-n-squared', difficulty: 'hard', minLen: 7 },
    { kind: 'mul-by-position-plus-1', difficulty: 'expert', minLen: 7 },
  ];

  for (const { kind, difficulty, minLen } of REQUIRED) {
    it(`${kind}: has ≥ ${minLen} terms and blanks the last one`, () => {
      const rng = makeRng(20260601);
      let sawKind = 0;
      for (let i = 0; i < 1200 && sawKind < 8; i++) {
        const q = generateSeriesQuestion(difficulty, rng);
        if (q.pattern.kind !== kind) continue;
        sawKind++;
        expect(q.pattern.terms.length).toBeGreaterThanOrEqual(minLen);
        expect(q.missingIndex).toBe(q.visibleTerms.length - 1);
      }
      expect(sawKind).toBeGreaterThan(0);
    });
  }
});

describe('generateSession', () => {
  it('produces the requested number of questions', () => {
    const session = generateSession({ count: 12, difficulty: 'medium' }, 1);
    expect(session.length).toBe(12);
    for (const q of session) expect(q.difficulty).toBe('medium');
  });

  it('respects difficulty filter for single-tier mode', () => {
    for (const d of ['easy', 'medium', 'hard', 'expert'] as const) {
      const session = generateSession({ count: 8, difficulty: d }, 5);
      for (const q of session) expect(q.difficulty).toBe(d);
    }
  });
});
