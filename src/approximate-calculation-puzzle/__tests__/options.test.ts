import { describe, expect, it } from 'vitest';
import { buildLadderOptions } from '../generate/options';
import { makeRng } from '../generate/rng';
import type { ApproxProblem } from '../types';

function problem(overrides: Partial<ApproxProblem> = {}): ApproxProblem {
  return {
    kind: 'speed',
    prompt: 'test',
    unit: 'km/hr',
    exactValue: 170,
    estimateValue: 170,
    mentalLogic: 'logic',
    formula: 'speed = distance ÷ time',
    precision: 0,
    ...overrides,
  };
}

describe('buildLadderOptions', () => {
  it('always returns 5 distinct, positive, ascending options with one correct', () => {
    const rng = makeRng(3);
    const samples: Array<Partial<ApproxProblem>> = [
      { exactValue: 170, estimateValue: 170 },
      { exactValue: 572.9, estimateValue: 600 },
      { exactValue: 2261, estimateValue: 2250 },
      { exactValue: 24.7, estimateValue: 24 },
      { exactValue: 49.5, estimateValue: 50 },
      { exactValue: 36000, estimateValue: 36000 },
      { exactValue: 0.5, estimateValue: 1 },
    ];
    for (const s of samples) {
      for (let i = 0; i < 50; i++) {
        const { options, correctValue } = buildLadderOptions(problem(s), rng);
        expect(options.length).toBe(5);
        expect(new Set(options.map((o) => o.value)).size).toBe(5);
        expect(options.every((o) => o.value > 0)).toBe(true);
        const vals = options.map((o) => o.value);
        expect(vals).toEqual([...vals].sort((a, b) => a - b));
        expect(options.filter((o) => o.isCorrect).length).toBe(1);
        const correct = options.find((o) => o.isCorrect)!;
        expect(correct.value).toBe(correctValue);
      }
    }
  });

  it('places the correct value closest to the exact value', () => {
    const rng = makeRng(11);
    const { options } = buildLadderOptions(
      problem({ exactValue: 572.9, estimateValue: 600 }),
      rng,
    );
    const correct = options.find((o) => o.isCorrect)!;
    const closest = options.reduce((best, o) =>
      Math.abs(o.value - 572.9) < Math.abs(best.value - 572.9) ? o : best,
    );
    expect(correct.value).toBe(closest.value);
  });

  it('respects display precision (money with 2 decimals stays distinct)', () => {
    const rng = makeRng(21);
    const { options } = buildLadderOptions(
      problem({ exactValue: 12.5, estimateValue: 12.5, unit: '$', precision: 2 }),
      rng,
    );
    expect(new Set(options.map((o) => o.value)).size).toBe(5);
  });
});
