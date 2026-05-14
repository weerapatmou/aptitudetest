import { describe, it, expect } from 'vitest';
import { isPureRotationOf } from '../validation';
import type { Candidate, Figure } from '../types';
import { buildDistractor } from '../generate/distractors';
import { placeInternals } from '../generate/internals';
import { pickOuterShape } from '../generate/outerShapes';
import { makeRng } from '../generate/rng';

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

function pureRotationCandidate(fig: Figure, theta: number): Candidate {
  return {
    figure: { outer: fig.outer, internals: fig.internals.map((e) => ({ ...e, center: { ...e.center } })) },
    transform: { rotate: theta, flipX: false },
    kind: 'correct',
    explanation: '',
  };
}

describe('isPureRotationOf — pass cases', () => {
  it('passes when figure is identical and flipX=false, for any rotation', () => {
    const fig = sampleFigure(11);
    for (const theta of [0, 1, 73, 90, 179, 180, 270, 359, -23, -180, -259, 720, 1080.5]) {
      expect(isPureRotationOf(fig, pureRotationCandidate(fig, theta))).toBe(true);
    }
  });
});

describe('isPureRotationOf — fail cases (the 6 spec rules)', () => {
  it('rejects mirror (rule 1)', () => {
    const fig = sampleFigure(20);
    const rng = makeRng(20);
    const c = buildDistractor('mirror', { figure: fig, theta: 50, rng })!;
    expect(isPureRotationOf(fig, c)).toBe(false);
  });

  it('rejects swap (rule 2)', () => {
    const fig = sampleFigure(21);
    const rng = makeRng(21);
    const c = buildDistractor('swap', { figure: fig, theta: 50, rng })!;
    expect(isPureRotationOf(fig, c)).toBe(false);
  });

  it('rejects missing (rule 3)', () => {
    const fig = sampleFigure(22);
    const rng = makeRng(22);
    const c = buildDistractor('missing', { figure: fig, theta: 50, rng })!;
    expect(isPureRotationOf(fig, c)).toBe(false);
  });

  it('rejects extra (rule 3)', () => {
    // `extra` can occasionally return null when the figure is tightly packed —
    // try a few seeds until one succeeds, then verify rejection.
    for (let seed = 23; seed < 60; seed++) {
      const fig = sampleFigure(seed);
      const rng = makeRng(seed);
      const c = buildDistractor('extra', { figure: fig, theta: 50, rng });
      if (c) {
        expect(isPureRotationOf(fig, c)).toBe(false);
        return;
      }
    }
    throw new Error('extra distractor never succeeded across 37 seeds — placement budget too tight?');
  });

  it('rejects altered kind (rule 4)', () => {
    const fig = sampleFigure(24);
    const rng = makeRng(24);
    const c = buildDistractor('kind-changed', { figure: fig, theta: 50, rng })!;
    expect(isPureRotationOf(fig, c)).toBe(false);
  });

  it('rejects inner-rotated as altered (rule 4)', () => {
    const fig = sampleFigure(25);
    const rng = makeRng(25);
    const c = buildDistractor('inner-rotated', { figure: fig, theta: 50, rng })!;
    expect(isPureRotationOf(fig, c)).toBe(false);
  });

  it('rejects resized (rule 5)', () => {
    const fig = sampleFigure(26);
    const rng = makeRng(26);
    const c = buildDistractor('resized', { figure: fig, theta: 50, rng })!;
    expect(isPureRotationOf(fig, c)).toBe(false);
  });

  it('rejects shifted (rule 6)', () => {
    const fig = sampleFigure(27);
    const rng = makeRng(27);
    const c = buildDistractor('shift', { figure: fig, theta: 50, rng })!;
    expect(isPureRotationOf(fig, c)).toBe(false);
  });

  it('also rejects fill-state and fillStyle changes (not exact clone)', () => {
    // attribute is universally viable; fillstyle-changed needs a filled element
    // so iterate seeds until both succeed.
    for (let seed = 28; seed < 80; seed++) {
      const fig = sampleFigure(seed);
      const rng = makeRng(seed);
      const a = buildDistractor('attribute', { figure: fig, theta: 50, rng });
      const b = buildDistractor('fillstyle-changed', { figure: fig, theta: 50, rng });
      if (!a || !b) continue;
      expect(isPureRotationOf(fig, a)).toBe(false);
      expect(isPureRotationOf(fig, b)).toBe(false);
      return;
    }
    throw new Error('No seed produced both an attribute and fillstyle-changed candidate');
  });
});
