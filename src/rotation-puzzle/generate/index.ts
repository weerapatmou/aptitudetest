import type { Candidate, Difficulty, Figure, Puzzle } from '../types';
import { sampleAngle, formatAngle } from './angles';
import { buildDistractor, isCandidate, pickDistractorKinds } from './distractors';
import { elementCountFor, placeInternals } from './internals';
import { pickOuterShape } from './outerShapes';
import { defaultRng, makeRng, type Rng } from './rng';
import {
  figureMirrorDistance,
  minMirrorDistance,
  outerRotationalSymmetries,
} from './symmetry';
import { isPureRotationOf } from '../validation';

export type GenerateOptions = {
  rng?: Rng;
  seed?: number;
};

export function generatePuzzle(difficulty: Difficulty, opts: GenerateOptions = {}): Puzzle {
  const rng: Rng = opts.rng ?? (opts.seed !== undefined ? makeRng(opts.seed) : defaultRng);

  for (let attempt = 0; attempt < 30; attempt++) {
    const outer = pickOuterShape(rng);
    if (minMirrorDistance(outer) < 8.5) continue;

    const outerSyms = outerRotationalSymmetries(outer);
    const { theta, needsChiralInternals } = sampleAngle(difficulty, outerSyms, rng);
    const count = elementCountFor(difficulty, rng);
    const internals = placeInternals(outer, count, { difficulty, needsChiralInternals }, rng);
    const figure: Figure = { outer, internals };

    if (figureMirrorDistance(figure) < 10) continue;

    const correct: Candidate = {
      figure,
      transform: { rotate: theta, flipX: false },
      kind: 'correct',
      explanation: `Same shape, rotated ${formatAngle(theta)}.`,
    };

    // Pick distractor kinds, then materialize. Some builders may return null if not viable; we re-pick.
    let distractorAttempts = 0;
    let distractors: Candidate[] = [];
    while (distractorAttempts < 10) {
      const kinds = pickDistractorKinds(figure, rng);
      const built = kinds
        .map((k) => buildDistractor(k, { figure, theta, rng }))
        .filter(isCandidate);
      if (built.length === 3) { distractors = built; break; }
      distractorAttempts++;
    }
    if (distractors.length !== 3) continue;

    // Guard against accidental near-correctness in any distractor.
    if (!allDistractorsDistinctFromCorrect(figure, correct, distractors)) continue;

    const all = rng.shuffle([correct, ...distractors]);
    return {
      original: figure,
      candidates: all,
      correctIndex: all.indexOf(correct),
      rotation: theta,
      difficulty,
    };
  }
  // Final fallback: produce a usable puzzle even if all retries failed.
  return generatePuzzle(difficulty, { rng: makeRng((Math.random() * 1e9) | 0) });
}

function allDistractorsDistinctFromCorrect(
  figure: Figure,
  _correct: Candidate,
  distractors: Candidate[],
): boolean {
  // Structural guarantee: no distractor accidentally satisfies the
  // is-pure-rotation-of-original predicate. With the structural check,
  // this should hold by construction for every distractor kind, but we
  // keep the guard as a hard invariant.
  for (const d of distractors) {
    if (isPureRotationOf(figure, d)) return false;
  }
  return true;
}

export { formatAngle } from './angles';

/**
 * A stable signature capturing the memorable structure of a puzzle — the outer
 * shape kind plus the (order-independent) multiset of internal elements by
 * kind/fill/style. Deliberately EXCLUDES the rotation angle and any continuous
 * position/size jitter, so two puzzles that "look the same to practice" collapse
 * to the same signature. Used only for anti-repeat seed selection.
 */
export function signatureOf(puzzle: Puzzle): string {
  const { outer, internals } = puzzle.original;
  const tuples = internals
    .map((el) => `${el.kind}|${el.filled}|${el.fillStyle ?? 'none'}`)
    .sort();
  return `${outer.kind}:${internals.length}:${tuples.join(',')}`;
}
