import { describe, it, expect } from 'vitest';
import { generatePuzzle, generateSession } from '../generate';
import { canonicalKey, isChiral, isRotationCongruent, reflect } from '../generate/polycube';
import { generateBase } from '../generate/shapes';
import { ROTATIONS, SYMMETRIES } from '../generate/polycube';
import { hiddenCellCount, renderSignature } from '../generate/iso';
import { makeRng } from '../../rotation-puzzle/generate/rng';
import type { Difficulty, DifficultyOrMixed } from '../types';

const DIFFS: DifficultyOrMixed[] = ['easy', 'normal', 'hard', 'mixed'];
const ALL: Difficulty[] = ['easy', 'normal', 'hard'];

describe('cube symmetry group', () => {
  it('has exactly 24 rotations and 48 symmetries', () => {
    expect(ROTATIONS.length).toBe(24);
    expect(SYMMETRIES.length).toBe(48);
  });
});

describe('base solids are chiral', () => {
  for (const diff of ALL) {
    it(`${diff}: every base is chiral (mirror is not a rotation of itself)`, () => {
      for (let i = 0; i < 80; i++) {
        const base = generateBase(diff, makeRng(0x5e3d + i));
        expect(isChiral(base)).toBe(true);
        // Concretely: the reflection's canonical key differs from the solid's.
        expect(canonicalKey(base)).not.toBe(canonicalKey(reflect(base)));
      }
    });
  }
});

describe('puzzle structure', () => {
  for (const diff of DIFFS) {
    it(`${diff}: 5 choices, exactly one correct, correctIndex points at it`, () => {
      for (let i = 0; i < 80; i++) {
        const p = generatePuzzle(diff, makeRng(0xb10c + i), `t-${i}`);
        expect(p.choices.length).toBe(5);
        const correct = p.choices.filter((c) => c.isCorrect);
        expect(correct.length).toBe(1);
        expect(p.choices[p.correctIndex]!.isCorrect).toBe(true);
        for (const c of p.choices) {
          if (!c.isCorrect) {
            expect(c.kind).not.toBe('correct');
            expect(c.explanation.length).toBeGreaterThan(0);
          }
        }
      }
    });
  }
});

describe('fairness: correct is a rotation, distractors are not', () => {
  for (const diff of DIFFS) {
    it(`${diff}: correct ≅ reference, every distractor ≇ reference`, () => {
      for (let i = 0; i < 80; i++) {
        const p = generatePuzzle(diff, makeRng(0xfa12 + i), `t-${i}`);
        const ref = p.reference;
        for (const c of p.choices) {
          if (c.isCorrect) {
            expect(isRotationCongruent(c.solid, ref)).toBe(true);
          } else {
            expect(isRotationCongruent(c.solid, ref)).toBe(false);
          }
        }
      }
    });
  }
});

describe('all five choices are visually distinct (no two are rotations of each other)', () => {
  for (const diff of DIFFS) {
    it(`${diff}: choices pairwise rotation-distinct`, () => {
      for (let i = 0; i < 60; i++) {
        const p = generatePuzzle(diff, makeRng(0xd157 + i), `t-${i}`);
        for (let a = 0; a < p.choices.length; a++) {
          for (let b = a + 1; b < p.choices.length; b++) {
            expect(isRotationCongruent(p.choices[a]!.solid, p.choices[b]!.solid)).toBe(false);
          }
        }
      }
    });
  }
});

describe('correct choice is re-oriented (not a pixel copy of the reference)', () => {
  it('correct solid normalizes to a different cell layout than the reference', () => {
    let differing = 0;
    const N = 120;
    for (let i = 0; i < N; i++) {
      const p = generatePuzzle('mixed', makeRng(0xc0de + i), `t-${i}`);
      const correct = p.choices[p.correctIndex]!.solid;
      const sameLayout =
        JSON.stringify([...correct].sort(cmp)) === JSON.stringify([...p.reference].sort(cmp));
      if (!sameLayout) differing++;
    }
    // The vast majority must be genuinely re-oriented.
    expect(differing).toBeGreaterThan(N * 0.9);
  });
});

describe('fairness: every solid fully visible, every image distinct', () => {
  for (const diff of DIFFS) {
    it(`${diff}: every solid has no hidden cube, all 6 images distinct`, () => {
      for (let i = 0; i < 200; i++) {
        const p = generatePuzzle(diff, makeRng(0x713a + i), `t-${i}`);
        // The reference and every choice must show all of their cubes.
        expect(hiddenCellCount(p.reference)).toBe(0);
        for (const c of p.choices) expect(hiddenCellCount(c.solid)).toBe(0);

        const refSig = renderSignature(p.reference);
        const sigs = p.choices.map((c) => renderSignature(c.solid));

        // Correct choice is visibly re-oriented (different image from reference).
        expect(sigs[p.correctIndex]).not.toBe(refSig);
        // No distractor renders identical to the reference.
        for (let j = 0; j < sigs.length; j++) {
          if (j !== p.correctIndex) expect(sigs[j]).not.toBe(refSig);
        }
        // All five choice images are pairwise distinct.
        expect(new Set(sigs).size).toBe(sigs.length);
      }
    });
  }
});

describe('determinism', () => {
  it('same seed yields identical sessions', () => {
    const s = { count: 12, difficulty: 'mixed' as const };
    const a = generateSession(s, 4242);
    const b = generateSession(s, 4242);
    expect(a).toEqual(b);
  });

  it('different seeds generally differ', () => {
    const s = { count: 6, difficulty: 'mixed' as const };
    const a = generateSession(s, 1);
    const b = generateSession(s, 2);
    expect(a).not.toEqual(b);
  });
});

function cmp(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return a.x - b.x || a.y - b.y || a.z - b.z;
}
