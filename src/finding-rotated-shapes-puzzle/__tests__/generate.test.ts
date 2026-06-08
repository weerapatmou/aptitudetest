import { describe, it, expect } from 'vitest';
import { generatePuzzle, generateSession } from '../generate';
import { isPureRotationOf, polyRenderSignature, bestAlignmentRotation } from '../generate/equivalence';
import { isSimplePolygon } from '../generate/distractors';
import { displayedCloud } from '../generate/viewBox';
import { minMirrorDistance, hausdorff } from '../../rotation-puzzle/generate/symmetry';
import { centroid } from '../../rotation-puzzle/generate/geometry';
import { makeRng } from '../../rotation-puzzle/generate/rng';
import type { Choice, OuterShape, Pt, Transform } from '../types';

const IDENTITY: Transform = { rotate: 0, flipX: false };
const N = 200;

function center(cloud: Pt[]): Pt[] {
  const c = centroid(cloud);
  return cloud.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
}

/** Worst-case gap between an option's outline and the best-aligned question outline. */
function alignResidual(ref: OuterShape, option: Choice): number {
  const deg = bestAlignmentRotation(ref, option.shape, option.transform);
  const A = center(displayedCloud(option.shape, option.transform, 72));
  const G = center(displayedCloud(ref, { rotate: deg, flipX: false }, 72));
  return hausdorff(A, G);
}

describe('puzzle structure', () => {
  it('5 choices, exactly one correct, correctIndex points at it', () => {
    for (let i = 0; i < N; i++) {
      const p = generatePuzzle(makeRng(0xb10c + i), `t-${i}`);
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
});

describe('fairness: correct is a rotation, distractors are not', () => {
  it('correct is a pure rotation of the reference; every distractor is not', () => {
    for (let i = 0; i < N; i++) {
      const p = generatePuzzle(makeRng(0xfa12 + i), `t-${i}`);
      for (const c of p.choices) {
        const isRot = isPureRotationOf(p.reference, c.shape, c.transform);
        expect(isRot).toBe(c.isCorrect);
      }
    }
  });
});

describe('distinctness', () => {
  it('all five images are pairwise distinct, none equals the reference', () => {
    for (let i = 0; i < N; i++) {
      const p = generatePuzzle(makeRng(0xd157 + i), `t-${i}`);
      const refSig = polyRenderSignature(p.reference, IDENTITY);
      const sigs = p.choices.map((c) => polyRenderSignature(c.shape, c.transform));
      expect(new Set(sigs).size).toBe(5);
      for (const s of sigs) expect(s).not.toBe(refSig);
    }
  });
});

describe('reference is a valid, asymmetric polygon', () => {
  it('reference is chiral (minMirrorDistance > 8.5), not an ellipse, and simple', () => {
    for (let i = 0; i < N; i++) {
      const p = generatePuzzle(makeRng(0x713a + i), `t-${i}`);
      expect(p.reference.kind).not.toBe('asymmetricEllipse');
      expect(minMirrorDistance(p.reference)).toBeGreaterThan(8.5);
      if (p.reference.kind !== 'asymmetricEllipse') {
        expect(isSimplePolygon(p.reference.vertices)).toBe(true);
      }
    }
  });
});

describe('distractor variety', () => {
  it('the mirror kind shows up across a sample', () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const p = generatePuzzle(makeRng(0x9a11 + i), `t-${i}`);
      for (const c of p.choices) kinds.add(c.kind);
    }
    expect(kinds.has('mirror')).toBe(true);
  });
});

describe('reveal comparison overlay alignment', () => {
  it('correct option aligns to the question (tiny residual); every distractor diverges clearly', () => {
    for (let i = 0; i < 60; i++) {
      const p = generatePuzzle(makeRng(0xc0117 + i), `t-${i}`);
      const correct = p.choices[p.correctIndex]!;
      const correctResidual = alignResidual(p.reference, correct);
      // Correct aligns within the equivalence tolerance → no red in the overlay.
      expect(correctResidual).toBeLessThan(5);
      for (const c of p.choices) {
        if (c.isCorrect) continue;
        // Generation guarantees distractors clear DISTRACTOR_MARGIN (8), past the
        // overlay's red threshold (6), so the panel always paints red for them.
        expect(alignResidual(p.reference, c)).toBeGreaterThanOrEqual(8);
      }
    }
  });
});

describe('determinism', () => {
  it('same seed yields identical sessions', () => {
    const s = { count: 12 };
    const a = generateSession(s, 4242);
    const b = generateSession(s, 4242);
    expect(a).toEqual(b);
  });

  it('different seeds generally differ', () => {
    const s = { count: 6 };
    const a = generateSession(s, 1);
    const b = generateSession(s, 2);
    expect(a).not.toEqual(b);
  });
});
