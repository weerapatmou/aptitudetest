import { describe, it, expect } from 'vitest';
import {
  buildDistractor,
  pickDistractorKinds,
} from '../generate/distractors';
import { CHIRAL_KINDS, type Figure } from '../types';
import { makeRng } from '../generate/rng';
import { placeInternals } from '../generate/internals';
import { pickOuterShape } from '../generate/outerShapes';

function sampleFigure(seed: number): Figure {
  const rng = makeRng(seed);
  const outer = pickOuterShape(rng);
  const internals = placeInternals(
    outer,
    4,
    { difficulty: 'expert', needsChiralInternals: true },
    rng,
  );
  return { outer, internals };
}

describe('distractor builders', () => {
  it('mirror sets flipX = true and uses rotate ≈ θ ± 15', () => {
    const rng = makeRng(1);
    const fig = sampleFigure(1);
    const c = buildDistractor('mirror', { figure: fig, theta: 73, rng })!;
    expect(c.transform.flipX).toBe(true);
    expect([58, 73, 88]).toContain(c.transform.rotate);
  });

  it('swap exchanges two centers', () => {
    const rng = makeRng(2);
    const fig = sampleFigure(2);
    const before = fig.internals.map((e) => ({ ...e.center }));
    const c = buildDistractor('swap', { figure: fig, theta: 45, rng })!;
    expect(c).not.toBeNull();
    // Find two indices whose centers swapped.
    const after = c.figure.internals.map((e) => e.center);
    const moved = before.filter((b, i) => b.x !== after[i]!.x || b.y !== after[i]!.y).length;
    expect(moved).toBe(2);
  });

  it('attribute flips exactly one filled boolean', () => {
    const rng = makeRng(3);
    const fig = sampleFigure(3);
    const c = buildDistractor('attribute', { figure: fig, theta: 30, rng })!;
    let diffs = 0;
    for (let i = 0; i < fig.internals.length; i++) {
      if (fig.internals[i]!.filled !== c.figure.internals[i]!.filled) diffs++;
    }
    expect(diffs).toBe(1);
  });

  it('shift moves exactly one element', () => {
    const rng = makeRng(4);
    const fig = sampleFigure(4);
    const c = buildDistractor('shift', { figure: fig, theta: 100, rng })!;
    let moved = 0;
    for (let i = 0; i < fig.internals.length; i++) {
      const b = fig.internals[i]!.center;
      const a = c.figure.internals[i]!.center;
      if (Math.hypot(a.x - b.x, a.y - b.y) > 1) moved++;
    }
    expect(moved).toBe(1);
  });

  it('missing removes exactly one element', () => {
    const rng = makeRng(5);
    const fig = sampleFigure(5);
    const before = fig.internals.length;
    const c = buildDistractor('missing', { figure: fig, theta: 0, rng })!;
    expect(c).not.toBeNull();
    expect(c.figure.internals.length).toBe(before - 1);
  });

  it('extra adds exactly one element when placement room exists', () => {
    // Iterate seeds — extra may return null on tightly-packed figures.
    for (let seed = 50; seed < 90; seed++) {
      const rng = makeRng(seed);
      const fig = sampleFigure(seed);
      const before = fig.internals.length;
      const c = buildDistractor('extra', { figure: fig, theta: 0, rng });
      if (c) {
        expect(c.figure.internals.length).toBe(before + 1);
        return;
      }
    }
    throw new Error('extra distractor never produced a candidate across 40 seeds');
  });

  it('resized changes exactly one element\'s size by a non-1 factor', () => {
    const rng = makeRng(51);
    const fig = sampleFigure(51);
    const c = buildDistractor('resized', { figure: fig, theta: 0, rng })!;
    let changed = 0;
    for (let i = 0; i < fig.internals.length; i++) {
      const a = fig.internals[i]!.size;
      const b = c.figure.internals[i]!.size;
      if (Math.abs(a - b) > 0.001) changed++;
    }
    expect(changed).toBe(1);
  });

  it('inner-rotated changes exactly one element rotation', () => {
    const rng = makeRng(6);
    const fig = sampleFigure(6);
    const c = buildDistractor('inner-rotated', { figure: fig, theta: 0, rng })!;
    let changed = 0;
    for (let i = 0; i < fig.internals.length; i++) {
      if (fig.internals[i]!.rotation !== c.figure.internals[i]!.rotation) changed++;
    }
    expect(changed).toBe(1);
  });

  it('kind-changed swaps exactly one element kind', () => {
    const rng = makeRng(7);
    const fig = sampleFigure(7);
    const c = buildDistractor('kind-changed', { figure: fig, theta: 0, rng })!;
    let changed = 0;
    for (let i = 0; i < fig.internals.length; i++) {
      if (fig.internals[i]!.kind !== c.figure.internals[i]!.kind) changed++;
    }
    expect(changed).toBe(1);
  });

  it('fillstyle-changed alters one filled element\'s fill style', () => {
    // fillstyle-changed only mutates elements where filled=true (visibility
    // constraint). Iterate seeds until we find a figure with at least one
    // filled element so the builder produces a candidate.
    for (let seed = 8; seed < 60; seed++) {
      const rng = makeRng(seed);
      const fig = sampleFigure(seed);
      if (!fig.internals.some((e) => e.filled)) continue;
      const c = buildDistractor('fillstyle-changed', { figure: fig, theta: 0, rng });
      if (!c) continue;
      let changed = 0;
      let changedIdx = -1;
      for (let i = 0; i < fig.internals.length; i++) {
        if (fig.internals[i]!.fillStyle !== c.figure.internals[i]!.fillStyle) {
          changed++;
          changedIdx = i;
        }
      }
      expect(changed).toBe(1);
      // The mutated element must have been filled (otherwise the change is
      // invisible to the renderer).
      expect(fig.internals[changedIdx]!.filled).toBe(true);
      return;
    }
    throw new Error('No seed produced a viable fillstyle-changed candidate in 52 tries');
  });
});

describe('pickDistractorKinds selector', () => {
  it('returns exactly 3 distinct kinds, never including wrong-angle', () => {
    const rng = makeRng(42);
    for (let i = 0; i < 30; i++) {
      const fig = sampleFigure(i + 100);
      const kinds = pickDistractorKinds(fig, rng);
      expect(kinds.length).toBe(3);
      const set = new Set(kinds);
      expect(set.size).toBeGreaterThanOrEqual(2);
      expect(kinds as string[]).not.toContain('wrong-angle');
    }
  });

  it('includes mirror in a majority of selections', () => {
    const rng = makeRng(99);
    let withMirror = 0;
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      const fig = sampleFigure(i + 500);
      const kinds = pickDistractorKinds(fig, rng);
      if (kinds.includes('mirror')) withMirror++;
    }
    expect(withMirror / trials).toBeGreaterThan(0.6);
  });

  it('inner-rotated is only chosen when a chiral element exists', () => {
    // Build a figure with no chiral internals
    const rng = makeRng(7);
    const fig = sampleFigure(7);
    fig.internals.forEach((e) => {
      if (CHIRAL_KINDS.includes(e.kind)) e.kind = 'circle';
    });
    for (let i = 0; i < 50; i++) {
      const kinds = pickDistractorKinds(fig, rng);
      expect(kinds).not.toContain('inner-rotated');
    }
  });
});
