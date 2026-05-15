import { describe, it, expect } from 'vitest';
import { makeRng } from '../../rotation-puzzle/generate/rng';
import { makeTarget } from '../generate/target';
import { sliceTargetWithRetry, polygonArea, makeCorrectPieces } from '../generate/slice';
import { buildDefective } from '../generate/distractors';

function area(piece: { polygon: { x: number; y: number }[] }) {
  return polygonArea(piece.polygon);
}

describe('buildDefective', () => {
  const setup = (seed = 7) => {
    const rng = makeRng(seed);
    const target = makeTarget('hexagon');
    const pieces = sliceTargetWithRetry(target, 4, rng);
    const correct = makeCorrectPieces(pieces);
    return { rng, correct };
  };

  it('"correct" produces an exact clone with no defective pieces', () => {
    const { rng, correct } = setup();
    const out = buildDefective(correct, 'correct', 0, rng);
    expect(out.length).toBe(correct.length);
    expect(out.every((p) => !p.defective)).toBe(true);
    for (let i = 0; i < out.length; i++) {
      expect(area(out[i]!)).toBeCloseTo(area(correct[i]!), 6);
    }
  });

  it('"scale" alters the target piece by ≥15% area delta', () => {
    const { rng, correct } = setup();
    const out = buildDefective(correct, 'scale', 0, rng);
    const defective = out.filter((p) => p.defective);
    expect(defective.length).toBe(1);
    // The targeted piece must be at index 0 and have a measurable area difference.
    expect(out[0]!.defective).toBe(true);
    const originalArea = area(correct[0]!);
    const newArea = area(out[0]!);
    const ratio = newArea / originalArea;
    // 18-22% scale → area changes by (1 ± 0.18..0.22)^2 ≈ 0.61..0.67 (smaller) or 1.39..1.49 (larger).
    expect(Math.abs(ratio - 1)).toBeGreaterThan(0.30);
  });

  it('"mirror-trap" flips the target piece without changing geometry', () => {
    const { rng, correct } = setup();
    const out = buildDefective(correct, 'mirror-trap', 1, rng);
    const flipped = out.filter((p) => p.scatterFlipped);
    expect(flipped.length).toBe(1);
    expect(out[1]!.scatterFlipped).toBe(true);
    expect(out[1]!.defective).toBe(true);
    for (let i = 0; i < out.length; i++) {
      expect(area(out[i]!)).toBeCloseTo(area(correct[i]!), 6);
    }
  });

  it('"substitution" replaces the target piece with a different vertex count', () => {
    const { rng, correct } = setup();
    const out = buildDefective(correct, 'substitution', 0, rng);
    expect(out[0]!.defective).toBe(true);
    expect(out[0]!.polygon.length).not.toBe(correct[0]!.polygon.length);
  });

  it('"angle" and "edge-length" alter exactly the target piece', () => {
    for (const defect of ['angle', 'edge-length'] as const) {
      const { rng, correct } = setup(defect === 'angle' ? 11 : 13);
      const out = buildDefective(correct, defect, 2, rng);
      const defective = out.filter((p) => p.defective);
      expect(defective.length).toBe(1);
      expect(out[2]!.defective).toBe(true);
    }
  });

  it('targeting different pieceIdx produces different defective indices', () => {
    const { rng, correct } = setup();
    const outA = buildDefective(correct, 'scale', 0, rng);
    const outB = buildDefective(correct, 'scale', 1, rng);
    expect(outA[0]!.defective).toBe(true);
    expect(outA[1]!.defective).toBe(false);
    expect(outB[0]!.defective).toBe(false);
    expect(outB[1]!.defective).toBe(true);
  });
});
