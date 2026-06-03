import { describe, expect, it } from 'vitest';
import { generateApproxQuestion, generateSession, makeRng } from '../generate';
import { ALL_GENERATORS } from '../generate/archetypes';

describe('archetype generators produce well-formed problems', () => {
  for (const gen of ALL_GENERATORS) {
    it(`${gen.name} returns a finite, positive problem with text`, () => {
      const rng = makeRng(1234);
      const p = gen(rng);
      expect(Number.isFinite(p.exactValue)).toBe(true);
      expect(Number.isFinite(p.estimateValue)).toBe(true);
      expect(p.exactValue).toBeGreaterThan(0);
      expect(p.prompt.length).toBeGreaterThan(0);
      expect(p.mentalLogic.length).toBeGreaterThan(0);
      expect(p.formula.length).toBeGreaterThan(0);
      expect(p.unit.length).toBeGreaterThan(0);
    });
  }
});

describe('generateApproxQuestion', () => {
  it('produces a well-formed question (5 distinct options, exactly one correct)', () => {
    const rng = makeRng(42);
    for (let i = 0; i < 200; i++) {
      const q = generateApproxQuestion(rng);
      expect(q.options.length).toBe(5);
      expect(q.options.filter((o) => o.isCorrect).length).toBe(1);
      expect(new Set(q.options.map((o) => o.value)).size).toBe(5);
      expect(q.options.every((o) => o.rationale.length > 0)).toBe(true);
    }
  });

  it('options are sorted ascending', () => {
    const rng = makeRng(7);
    for (let i = 0; i < 200; i++) {
      const q = generateApproxQuestion(rng);
      const vals = q.options.map((o) => o.value);
      const sorted = [...vals].sort((a, b) => a - b);
      expect(vals).toEqual(sorted);
    }
  });

  it('options are evenly spaced (single step)', () => {
    const rng = makeRng(99);
    for (let i = 0; i < 200; i++) {
      const q = generateApproxQuestion(rng);
      const vals = q.options.map((o) => o.value);
      const step = vals[1]! - vals[0]!;
      for (let k = 1; k < vals.length; k++) {
        // tolerate tiny float/rounding drift
        expect(Math.abs(vals[k]! - vals[k - 1]! - step)).toBeLessThanOrEqual(step * 1e-6 + 1e-6);
      }
    }
  });

  it('the correct option is the one closest to the exact value', () => {
    const rng = makeRng(2024);
    for (let i = 0; i < 200; i++) {
      const q = generateApproxQuestion(rng);
      const correct = q.options.find((o) => o.isCorrect)!;
      const closest = q.options.reduce((best, o) =>
        Math.abs(o.value - q.problem.exactValue) < Math.abs(best.value - q.problem.exactValue)
          ? o
          : best,
      );
      expect(correct.value).toBe(closest.value);
      expect(q.correctValue).toBe(correct.value);
    }
  });

  it('the correct answer is not always in the same position', () => {
    const rng = makeRng(555);
    const positions = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const q = generateApproxQuestion(rng);
      positions.add(q.options.findIndex((o) => o.isCorrect));
    }
    // expect the correct answer to land in at least 4 of the 5 slots across runs
    expect(positions.size).toBeGreaterThanOrEqual(4);
  });
});

describe('generateSession', () => {
  it('produces the requested number of questions', () => {
    const session = generateSession({ count: 12 }, 1);
    expect(session.length).toBe(12);
  });

  it('seeded generation is deterministic', () => {
    const a = generateSession({ count: 15 }, 12345);
    const b = generateSession({ count: 15 }, 12345);
    expect(a.map((q) => q.correctValue)).toEqual(b.map((q) => q.correctValue));
    expect(a.map((q) => q.problem.prompt)).toEqual(b.map((q) => q.problem.prompt));
  });

  it('different seeds produce different sessions', () => {
    const a = generateSession({ count: 15 }, 1);
    const b = generateSession({ count: 15 }, 2);
    expect(a.map((q) => q.problem.prompt)).not.toEqual(b.map((q) => q.problem.prompt));
  });
});
