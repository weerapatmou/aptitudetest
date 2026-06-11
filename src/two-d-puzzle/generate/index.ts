import type { Choice, Difficulty, DifficultyOrMixed, Puzzle, Settings, ShapeScope } from '../types';
import { buildBase, partition } from './notch';
import { buildDistractors } from './distractors';
import { frameHalfExtent, layoutPiece, viewBoxFromHalf } from './layout';
import { defaultRng, makeRng, type Rng } from '../../rotation-puzzle/generate/rng';
import { generateDistinctSession } from '@/shared/coverage';

const ALL_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

/** How many pieces the gap is split into (= number of correct choices). */
export function piecesForDifficulty(d: Difficulty, rng: Rng): number {
  switch (d) {
    case 'easy':
      return 1;
    case 'normal':
      return rng.pick([1, 2]);
    case 'hard':
      return rng.pick([1, 2, 3, 4]);
  }
}

export function generatePuzzle(
  difficulty: DifficultyOrMixed,
  shapeScope: ShapeScope,
  rng: Rng,
  id: string,
): Puzzle {
  const effective: Difficulty =
    difficulty === 'mixed' ? rng.pick(ALL_DIFFICULTIES) : difficulty;

  for (let attempt = 0; attempt < 40; attempt++) {
    const base = buildBase(shapeScope, rng);
    if (!base) continue;
    const k = piecesForDifficulty(effective, rng);
    const pieces = partition(base.missing, k, rng);
    if (!pieces) continue;

    // Shared scale, anchored to the square + correct pieces (never distractors).
    const half = frameHalfExtent(base.completed, pieces);
    const viewBox = viewBoxFromHalf(half);
    const budget = half - 6; // max piece radius that still sits inside the card

    const correct: Choice[] = pieces.map((poly) => ({
      piece: layoutPiece(poly, rng),
      isCorrect: true,
      kind: 'correct',
      explanation: 'Rotates into the gap — part of the completed square.',
    }));

    const distractors: Choice[] = buildDistractors(pieces, 4 - k, rng, budget).map((d) => ({
      piece: layoutPiece(d.polygon, rng),
      isCorrect: false,
      kind: d.kind,
      explanation: d.explanation,
    }));

    const choices = rng.shuffle<Choice>([...correct, ...distractors]);
    const correctIndices = choices
      .map((c, i) => (c.isCorrect ? i : -1))
      .filter((i) => i >= 0);

    return {
      id,
      completed: base.completed,
      main: base.main,
      choices,
      correctIndices,
      difficulty: effective,
      notchTemplate: base.notchTemplate,
      baseKind: base.baseKind,
      viewBox,
    };
  }

  // Couldn't satisfy the constraints with this rng stream — retry with a fresh seed.
  return generatePuzzle(difficulty, shapeScope, makeRng((Math.random() * 1e9) | 0), id);
}

/**
 * The structural essence a solver memorizes: the base-shape kind, the notch
 * template, and how many pieces the gap splits into. The continuous per-instance
 * params (exact cut fractions, depths, rotations) are excluded — those are the
 * variety the eye works through. Used to keep a session free of repeated
 * structures and to steer fresh sessions away from recent ones.
 */
export function signatureOf(puzzle: Puzzle): string {
  const k = puzzle.correctIndices.length;
  return `${puzzle.baseKind}:${puzzle.notchTemplate}:${k}`;
}

export function generateSession(settings: Settings, seed?: number): Puzzle[] {
  const rng = seed !== undefined ? makeRng(seed) : defaultRng;
  let i = 0;
  return generateDistinctSession(
    settings.count,
    () => generatePuzzle(settings.difficulty, settings.shapeScope, rng, `2d-${i++}`),
    signatureOf,
  );
}
