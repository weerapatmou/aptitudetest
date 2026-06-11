import type { Difficulty, DifficultyOrMixed, Puzzle, Settings } from '../types';
import { generateDistinctSession } from '@/shared/coverage';
import { defaultRng, makeRng } from './rng';
import type { Rng } from './rng';
import { buildArrangement } from './arrangements';
import { canonicalHeightmap } from './canonical';
import { buildOptions } from './distractors';
import { computeViewBox } from './iso';

const ALL_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

/**
 * Generate a single cube-counting puzzle. `difficulty: 'mixed'` rolls a uniform
 * random difficulty per question (matching the other modules).
 */
export function generatePuzzle(
  difficulty: DifficultyOrMixed,
  rng: Rng = defaultRng,
  id?: string,
): Puzzle {
  const effective: Difficulty =
    difficulty === 'mixed' ? rng.pick(ALL_DIFFICULTIES) : difficulty;

  const arrangement = buildArrangement(effective, rng);
  const choices = buildOptions(arrangement, rng);
  const correctIndex = choices.findIndex((c) => c.isCorrect);

  return {
    id: id ?? `${effective}-${Math.floor(rng.next() * 1e9).toString(36)}`,
    arrangement,
    choices,
    correctIndex,
    difficulty: effective,
    viewBox: computeViewBox(arrangement.cells, {
      cols: arrangement.cols,
      rows: arrangement.rows,
    }),
  };
}

/**
 * The structural essence a solver memorizes: the archetype family plus the
 * D4-canonical heightmap (so the same shape mirrored or turned collapses to one
 * signature). The per-instance height jitter is folded into the heightmap, which
 * is what makes two instances of the same archetype distinct unless they're
 * literally rotations/reflections. Used to keep a session free of repeats and to
 * steer fresh sessions away from recently-seen patterns.
 */
export function signatureOf(puzzle: Puzzle): string {
  const a = puzzle.arrangement;
  return `${a.archetype}:${canonicalHeightmap(a.height)}`;
}

/** Pre-generate a full session up-front for deterministic, replayable sessions. */
export function generateSession(settings: Settings, seed?: number): Puzzle[] {
  const rng = seed !== undefined ? makeRng(seed) : defaultRng;
  let i = 0;
  return generateDistinctSession(
    settings.count,
    () => generatePuzzle(settings.difficulty, rng, `q${i++}`),
    signatureOf,
  );
}

export { makeRng, defaultRng } from './rng';
export type { Rng } from './rng';
