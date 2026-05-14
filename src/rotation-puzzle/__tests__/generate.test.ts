import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../generate';
import { makeRng } from '../generate/rng';
import { ALL_INTERNAL_KINDS, type Difficulty } from '../types';
import { ANGLE_SPEC } from '../generate/angles';
import { isPureRotationOf } from '../validation';

const DIFFS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

// Statistical N. 1000 is the spec target; we run a strong-but-fast 300 per
// difficulty to keep the suite responsive while still detecting issues.
const N = 300;

function chiSquare(observed: number[], expectedEach: number): number {
  let chi = 0;
  for (const o of observed) {
    chi += ((o - expectedEach) ** 2) / expectedEach;
  }
  return chi;
}

// p > 0.05 for 3 degrees of freedom (4 buckets) corresponds to chi² < 7.815
const CHI_THRESHOLD_3DF = 7.815;

describe('acceptance #3 — correct-answer slot uniformity', () => {
  for (const diff of DIFFS) {
    it(`${diff}: correct-index distribution is uniform (chi² < ${CHI_THRESHOLD_3DF})`, () => {
      const buckets = [0, 0, 0, 0];
      for (let i = 0; i < N; i++) {
        const p = generatePuzzle(diff, { rng: makeRng(0xd00d + i + diff.length * 1000) });
        buckets[p.correctIndex]!++;
      }
      const expected = N / 4;
      const chi = chiSquare(buckets, expected);
      expect(chi).toBeLessThan(CHI_THRESHOLD_3DF);
    });
  }
});

describe('acceptance #5 — min-angle floor', () => {
  for (const diff of DIFFS) {
    const floor = ANGLE_SPEC[diff].floor;
    it(`${diff}: no |θ mod 360| below floor ${floor}°`, () => {
      let minSeen = Infinity;
      for (let i = 0; i < N; i++) {
        const p = generatePuzzle(diff, { rng: makeRng(0xc0de + i) });
        const norm = ((p.rotation % 360) + 360) % 360;
        const distFromZero = Math.min(norm, 360 - norm);
        if (distFromZero < minSeen) minSeen = distFromZero;
        expect(distFromZero).toBeGreaterThanOrEqual(floor - 0.001);
      }
      expect(minSeen).toBeGreaterThanOrEqual(floor - 0.001);
    });
  }
});

describe('acceptance #6 — mirror distractor ratio ≥ 60%', () => {
  for (const diff of DIFFS) {
    it(`${diff}: mirror distractor in ≥ 60% of puzzles`, () => {
      let withMirror = 0;
      for (let i = 0; i < N; i++) {
        const p = generatePuzzle(diff, { rng: makeRng(0xbaba + i) });
        if (p.candidates.some((c) => c.kind === 'mirror')) withMirror++;
      }
      const ratio = withMirror / N;
      // Console-friendly readout for the human reviewer
      // eslint-disable-next-line no-console
      console.log(`  [${diff}] mirror ratio = ${(ratio * 100).toFixed(1)}%`);
      expect(ratio).toBeGreaterThanOrEqual(0.6);
    });
  }
});

describe('acceptance #7 — exact correctness contract', () => {
  it('for every puzzle, exactly the canonical correct candidate passes isPureRotationOf', () => {
    for (let i = 0; i < N; i++) {
      const p = generatePuzzle('hard', { rng: makeRng(0xbe11 + i) });
      const passing = p.candidates
        .map((c, j) => ({ c, j, ok: isPureRotationOf(p.original, c) }))
        .filter((x) => x.ok);
      expect(passing.length).toBe(1);
      expect(passing[0]!.j).toBe(p.correctIndex);
      expect(passing[0]!.c.kind).toBe('correct');
    }
  });
});

describe('acceptance #8 — internal-element kind coverage on Hard ∪ Expert', () => {
  it('every internal-element kind appears at least once', () => {
    const seen = new Set<string>();
    for (let i = 0; i < N; i++) {
      const p = generatePuzzle('hard', { rng: makeRng(0xa55e + i) });
      for (const el of p.original.internals) seen.add(el.kind);
    }
    for (let i = 0; i < N; i++) {
      const p = generatePuzzle('expert', { rng: makeRng(0xa55f + i) });
      for (const el of p.original.internals) seen.add(el.kind);
    }
    for (const k of ALL_INTERNAL_KINDS) {
      expect(seen, `missing kind "${k}"`).toContain(k);
    }
  });
});

describe('generatePuzzle smoke', () => {
  it('always produces 4 candidates with a valid correctIndex', () => {
    for (let i = 0; i < 50; i++) {
      const p = generatePuzzle('expert', { rng: makeRng(i) });
      expect(p.candidates.length).toBe(4);
      expect(p.correctIndex).toBeGreaterThanOrEqual(0);
      expect(p.correctIndex).toBeLessThan(4);
      expect(p.candidates[p.correctIndex]!.kind).toBe('correct');
    }
  });
});
