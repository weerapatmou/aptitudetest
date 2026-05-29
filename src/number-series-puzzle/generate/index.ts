import type { Difficulty, PatternKind, SeriesQuestion, SeriesSettings } from '../types';
import { defaultRng, makeRng } from './rng';
import type { Rng } from './rng';
import { buildOptions } from './distractors';
import { EASY_GENERATORS } from './patterns/easy';
import { MEDIUM_GENERATORS } from './patterns/medium';
import { HARD_GENERATORS } from './patterns/hard';
import { EXPERT_GENERATORS } from './patterns/expert';
import type { PatternGenerator } from './patterns/easy';

const GENERATORS_BY_DIFFICULTY: Record<Difficulty, PatternGenerator[]> = {
  easy: EASY_GENERATORS,
  medium: MEDIUM_GENERATORS,
  hard: HARD_GENERATORS,
  expert: EXPERT_GENERATORS,
};

const ALL_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

const SEQUENCE_LENGTH_BY_DIFFICULTY: Record<Difficulty, [number, number]> = {
  // [min, max] inclusive
  easy: [6, 6],
  medium: [6, 7],
  hard: [6, 7],
  expert: [5, 6],
};

// Patterns whose rule is split across positions by a modular cycle need
// enough visible terms for the user to spot the lane structure. Total
// sequence length (the blank counts as one term).
const MIN_LENGTH_BY_KIND: Partial<Record<PatternKind, number>> = {
  'interleaved-2': 7,
  'pair-skip': 7,
  'interleaved-3': 10,
};

const MIDDLE_BLANK_PROBABILITY = 0.3;

/**
 * Generate a single number-series question for the given difficulty.
 * `difficulty: 'mixed'` rolls a uniform random difficulty per question.
 */
export function generateSeriesQuestion(
  difficulty: Difficulty | 'mixed',
  rng: Rng = defaultRng,
): SeriesQuestion {
  const effective: Difficulty =
    difficulty === 'mixed' ? rng.pick(ALL_DIFFICULTIES) : difficulty;

  const generators = GENERATORS_BY_DIFFICULTY[effective];
  const [minLen, maxLen] = SEQUENCE_LENGTH_BY_DIFFICULTY[effective];
  const initialLength = rng.int(minLen, maxLen + 1);
  const gen = rng.pick(generators);
  let pattern = gen(rng, initialLength);

  // Interleaved / mod-cycle patterns need a longer window so the user can
  // see at least 2–3 full cycles before the blank. If the initial draw was
  // too short, re-roll the same generator with the required length.
  const required = MIN_LENGTH_BY_KIND[pattern.kind];
  if (required !== undefined && pattern.terms.length < required) {
    pattern = gen(rng, required);
  }
  const effectiveLength = pattern.terms.length;

  // Pick blank position. 70% last, 30% middle (positions 2..length-2 so the
  // user sees at least the first two terms and at least one term after the blank).
  let missingIndex = effectiveLength - 1;
  if (rng.next() < MIDDLE_BLANK_PROBABILITY && effectiveLength >= 5) {
    const lo = 2;
    const hi = effectiveLength - 2; // inclusive
    if (hi >= lo) missingIndex = rng.int(lo, hi + 1);
  }

  const visibleTerms: (number | null)[] = pattern.terms.map((t, i) =>
    i === missingIndex ? null : t,
  );
  const options = buildOptions(pattern, missingIndex, rng);

  return {
    id: `${effective}-${pattern.kind}-${Math.floor(rng.next() * 1e9).toString(36)}`,
    difficulty: effective,
    visibleTerms,
    missingIndex,
    options,
    correctValue: pattern.terms[missingIndex]!,
    pattern,
  };
}

/**
 * Pre-generate a full session of questions up-front for determinism.
 */
export function generateSession(
  settings: SeriesSettings,
  seed?: number,
): SeriesQuestion[] {
  const rng = seed !== undefined ? makeRng(seed) : defaultRng;
  const out: SeriesQuestion[] = [];
  for (let i = 0; i < settings.count; i++) {
    out.push(generateSeriesQuestion(settings.difficulty, rng));
  }
  return out;
}

export { buildOptions } from './distractors';
export { makeRng, defaultRng } from './rng';
export type { Rng } from './rng';
