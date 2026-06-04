import type { Difficulty, DifficultyOrMixed, Puzzle, Settings } from '../types';
import { defaultRng, makeRng } from './rng';
import type { Rng } from './rng';
import { buildArrangement } from './arrangements';
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

/** Pre-generate a full session up-front for deterministic, replayable sessions. */
export function generateSession(settings: Settings, seed?: number): Puzzle[] {
  const rng = seed !== undefined ? makeRng(seed) : defaultRng;
  const out: Puzzle[] = [];
  for (let i = 0; i < settings.count; i++) {
    out.push(generatePuzzle(settings.difficulty, rng, `q${i}`));
  }
  return out;
}

export { makeRng, defaultRng } from './rng';
export type { Rng } from './rng';
