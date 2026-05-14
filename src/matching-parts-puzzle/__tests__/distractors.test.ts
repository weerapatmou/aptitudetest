import { describe, it, expect } from 'vitest';
import { generateReferenceShape } from '../generate/shapes';
import { cutPolygon, signedArea } from '../generate/cuts';
import {
  ALL_DISTRACTOR_KINDS,
  buildCorrect,
  buildDistractor,
  pickDistractorKinds,
  type DistractorCtx,
} from '../generate/distractors';
import { makeRng } from '../../rotation-puzzle/generate/rng';
import type { MatchDistractorKind, ReferenceShapeKind } from '../types';

function makeCtx(seed: number, kind: ReferenceShapeKind = 'hexagon'): DistractorCtx {
  const reference = generateReferenceShape(kind);
  const rng = makeRng(seed);
  const cut = cutPolygon(reference.polygon, 'straight-chord', rng)!;
  return {
    reference,
    pieces: cut.pieces,
    cut: cut.cut,
    strategy: 'straight-chord',
    difficulty: 'medium',
    rng,
  };
}

const STRICT_AREA_DELTA = 30;

describe('distractors — correct option preserves area', () => {
  it('sum of piece areas equals reference area', () => {
    const ctx = makeCtx(0x1111);
    const option = buildCorrect(ctx);
    const total = Math.abs(signedArea(ctx.reference.polygon));
    const sum =
      Math.abs(signedArea(option.pieces[0].polygon)) +
      Math.abs(signedArea(option.pieces[1].polygon));
    expect(Math.abs(sum - total)).toBeLessThan(1);
  });
});

describe('distractors — every distractor satisfies the strict area-delta invariant', () => {
  const NON_CORRECT: MatchDistractorKind[] = [
    'proportion-mismatch',
    'incompatible-cut',
    'scale-error',
    'overlaps-gaps',
  ];
  for (const kind of NON_CORRECT) {
    it(`${kind}: |sum(piece_area) - reference_area| ≥ ${STRICT_AREA_DELTA} px²`, () => {
      let built = 0;
      for (let i = 0; i < 40 && built < 12; i++) {
        const ctx = makeCtx(0x9000 + i + kind.length * 100);
        const option = buildDistractor(kind, ctx);
        if (!option) continue;
        built++;
        const refArea = Math.abs(signedArea(ctx.reference.polygon));
        const sum =
          Math.abs(signedArea(option.pieces[0].polygon)) +
          Math.abs(signedArea(option.pieces[1].polygon));
        const delta = Math.abs(sum - refArea);
        expect(delta).toBeGreaterThanOrEqual(STRICT_AREA_DELTA);
      }
      expect(built).toBeGreaterThanOrEqual(6);
    });
  }
});

describe('distractors — overlaps-gaps notches exactly one piece (adds one vertex)', () => {
  it('exactly one piece has +1 vertex versus the original cut piece', () => {
    let checked = 0;
    for (let i = 0; i < 20 && checked < 8; i++) {
      const ctx = makeCtx(0x3300 + i);
      const origCounts = [ctx.pieces[0]!.length, ctx.pieces[1]!.length];
      const option = buildDistractor('overlaps-gaps', ctx);
      if (!option) continue;
      checked++;
      const newCounts = [option.pieces[0].polygon.length, option.pieces[1].polygon.length];
      const diffs = [newCounts[0]! - origCounts[0]!, newCounts[1]! - origCounts[1]!];
      // Exactly one piece grew by exactly 1 vertex.
      expect(diffs.sort()).toEqual([0, 1]);
    }
    expect(checked).toBeGreaterThanOrEqual(4);
  });
});

describe('distractors — incompatible-cut shifts piece areas measurably', () => {
  it('produces an option with two pieces', () => {
    const ctx = makeCtx(0x5555);
    const option = buildDistractor('incompatible-cut', ctx)!;
    expect(option).not.toBeNull();
    expect(option.pieces.length).toBe(2);
    expect(option.pieces[0].polygon.length).toBeGreaterThanOrEqual(3);
    expect(option.pieces[1].polygon.length).toBeGreaterThanOrEqual(3);
  });
});

describe('distractors — pickDistractorKinds returns 3 distinct kinds from the pool of four', () => {
  it('returns 3 entries, all from the allowed set', () => {
    const rng = makeRng(0xcafe);
    const reference = generateReferenceShape('hexagon');
    for (let i = 0; i < 30; i++) {
      const kinds = pickDistractorKinds(reference, rng);
      expect(kinds.length).toBe(3);
      const set = new Set(kinds);
      expect(set.size).toBe(3);
      for (const k of kinds) {
        expect(ALL_DISTRACTOR_KINDS).toContain(k);
      }
    }
  });

  it('over N samples, every kind appears at least once', () => {
    const rng = makeRng(0xbeef);
    const reference = generateReferenceShape('hexagon');
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      for (const k of pickDistractorKinds(reference, rng)) seen.add(k);
    }
    for (const k of ALL_DISTRACTOR_KINDS) {
      expect(seen.has(k)).toBe(true);
    }
  });
});
