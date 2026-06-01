import type { Choice, Difficulty, DifficultyOrMixed, Puzzle, Settings, ShapeScope } from '../types';
import { buildBase, partition } from './notch';
import { buildDistractors } from './distractors';
import { frameHalfExtent, layoutPiece, viewBoxFromHalf } from './layout';
import { defaultRng, makeRng, type Rng } from '../../rotation-puzzle/generate/rng';

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
      viewBox,
    };
  }

  // Couldn't satisfy the constraints with this rng stream — retry with a fresh seed.
  return generatePuzzle(difficulty, shapeScope, makeRng((Math.random() * 1e9) | 0), id);
}

export function generateSession(settings: Settings, seed?: number): Puzzle[] {
  const rng = seed !== undefined ? makeRng(seed) : defaultRng;
  const out: Puzzle[] = [];
  for (let i = 0; i < settings.count; i++) {
    out.push(generatePuzzle(settings.difficulty, settings.shapeScope, rng, `2d-${i}`));
  }
  return out;
}
