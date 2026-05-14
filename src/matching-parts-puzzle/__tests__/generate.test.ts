import { describe, it, expect } from 'vitest';
import { generateMatchingPuzzle } from '../generate';
import { makeRng } from '../../rotation-puzzle/generate/rng';
import type { Difficulty } from '../types';
import { signedArea } from '../generate/cuts';

const DIFFS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const N = 200;
const CHI_THRESHOLD_3DF = 7.815;

function chiSquare(observed: number[], expectedEach: number): number {
  let chi = 0;
  for (const o of observed) chi += ((o - expectedEach) ** 2) / expectedEach;
  return chi;
}

describe('generate — correct-answer slot uniformity', () => {
  for (const diff of DIFFS) {
    it(`${diff}: correct-index distribution is uniform (chi² < ${CHI_THRESHOLD_3DF})`, () => {
      const buckets = [0, 0, 0, 0];
      for (let i = 0; i < N; i++) {
        const p = generateMatchingPuzzle(diff, { rng: makeRng(0xd00d + i + diff.length * 1000) });
        buckets[p.correctIndex]!++;
      }
      const expected = N / 4;
      const chi = chiSquare(buckets, expected);
      expect(chi).toBeLessThan(CHI_THRESHOLD_3DF);
    });
  }
});

describe('generate — every puzzle has 4 options each with 2 pieces', () => {
  for (const diff of DIFFS) {
    it(`${diff}: structural shape`, () => {
      for (let i = 0; i < 50; i++) {
        const p = generateMatchingPuzzle(diff, { rng: makeRng(0xface + i) });
        expect(p.options.length).toBe(4);
        for (const o of p.options) {
          expect(o.pieces.length).toBe(2);
        }
        expect(p.correctIndex).toBeGreaterThanOrEqual(0);
        expect(p.correctIndex).toBeLessThan(4);
      }
    });
  }
});

describe('generate — correct option reassembles to reference area', () => {
  for (const diff of DIFFS) {
    it(`${diff}: piece areas sum to reference area`, () => {
      for (let i = 0; i < 50; i++) {
        const p = generateMatchingPuzzle(diff, { rng: makeRng(0xbabe + i) });
        const refArea = Math.abs(signedArea(p.reference.polygon));
        const correct = p.options[p.correctIndex]!;
        const sum =
          Math.abs(signedArea(correct.pieces[0].polygon)) +
          Math.abs(signedArea(correct.pieces[1].polygon));
        expect(Math.abs(sum - refArea)).toBeLessThan(1);
      }
    });
  }
});

describe('generate — distractor catalog excludes mirror', () => {
  it('no puzzle in a 200-sample contains a mirror option', () => {
    for (let i = 0; i < 200; i++) {
      const p = generateMatchingPuzzle('hard', { rng: makeRng(0xbaba + i) });
      for (const o of p.options) {
        expect(o.kind).not.toBe('mirror');
      }
    }
  });
});

describe('generate — every distractor kind appears across samples and each is well-represented', () => {
  const KINDS = ['proportion-mismatch', 'incompatible-cut', 'scale-error', 'overlaps-gaps'] as const;

  for (const diff of DIFFS) {
    it(`${diff}: each kind appears in ≥ 60% of puzzles (expected ~75%)`, () => {
      const counts: Record<string, number> = {
        'proportion-mismatch': 0,
        'incompatible-cut': 0,
        'scale-error': 0,
        'overlaps-gaps': 0,
      };
      for (let i = 0; i < N; i++) {
        const p = generateMatchingPuzzle(diff, { rng: makeRng(0xbaba + i + diff.length) });
        for (const o of p.options) {
          if (o.kind in counts) counts[o.kind]!++;
        }
      }
      for (const kind of KINDS) {
        const ratio = counts[kind]! / N;
        // eslint-disable-next-line no-console
        console.log(`  [${diff}] ${kind} ratio = ${(ratio * 100).toFixed(1)}%`);
        expect(ratio).toBeGreaterThanOrEqual(0.6);
      }
    });
  }
});

describe('generate — every distractor option satisfies the strict area-delta invariant', () => {
  it('200 puzzles × 3 distractors each → all distractors differ by ≥ 30 px² from reference', () => {
    const STRICT = 30;
    for (let i = 0; i < 200; i++) {
      const p = generateMatchingPuzzle('hard', { rng: makeRng(0x515c + i) });
      const refArea = Math.abs(signedArea(p.reference.polygon));
      for (let j = 0; j < p.options.length; j++) {
        if (j === p.correctIndex) continue;
        const o = p.options[j]!;
        const sum =
          Math.abs(signedArea(o.pieces[0].polygon)) +
          Math.abs(signedArea(o.pieces[1].polygon));
        const delta = Math.abs(sum - refArea);
        expect(delta).toBeGreaterThanOrEqual(STRICT);
      }
    }
  });
});

describe('generate — seedable reproducibility', () => {
  it('same seed produces identical correctIndex and option kinds', () => {
    const a = generateMatchingPuzzle('hard', { seed: 12345 });
    const b = generateMatchingPuzzle('hard', { seed: 12345 });
    expect(a.correctIndex).toBe(b.correctIndex);
    expect(a.options.map((o) => o.kind)).toEqual(b.options.map((o) => o.kind));
    expect(a.reference.kind).toBe(b.reference.kind);
  });
});
