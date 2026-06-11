import type { Difficulty, PatternKind, SeriesPattern, SeriesQuestion, SeriesSettings } from '../types';
import { defaultRng, makeRng } from './rng';
import type { Rng } from './rng';
import { generateDistinctSession } from '@/shared/coverage';
import { buildOptions } from './distractors';
import { EASY_GENERATORS, arithAddSmall, multiples, counting } from './patterns/easy';
import { MEDIUM_GENERATORS, fibonacci, oddStepAdd, triangular } from './patterns/medium';
import { HARD_GENERATORS, lucas, pell, recurrenceWithPosition } from './patterns/hard';
import { EXPERT_GENERATORS, padovan, sumOfAllPrevious } from './patterns/expert';
import type { PatternGenerator } from './patterns/easy';
import { isMentallyTractable } from './tractability';

const GENERATORS_BY_DIFFICULTY: Record<Difficulty, PatternGenerator[]> = {
  easy: EASY_GENERATORS,
  medium: MEDIUM_GENERATORS,
  hard: HARD_GENERATORS,
  expert: EXPERT_GENERATORS,
};

// If many draws in a row are too hard to solve mentally, fall back to a
// guaranteed step-derivable generator for the tier so a question is always
// produced. Each generator tags itself with the matching difficulty. A few
// alternates per tier (all known-tractable) are kept so the rare fallback isn't
// always the identical sequence; one is picked via the rng to stay deterministic.
const SAFE_FALLBACK_BY_DIFFICULTY: Record<Difficulty, PatternGenerator[]> = {
  easy: [arithAddSmall, multiples, counting],
  medium: [fibonacci, oddStepAdd, triangular],
  hard: [lucas, pell, recurrenceWithPosition],
  expert: [padovan, sumOfAllPrevious],
};

const MAX_TRACTABILITY_ATTEMPTS = 16;

const ALL_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

const SEQUENCE_LENGTH_BY_DIFFICULTY: Record<Difficulty, [number, number]> = {
  // [min, max] inclusive
  easy: [6, 6],
  medium: [6, 7],
  hard: [6, 7],
  expert: [5, 6],
};

// Patterns that need more visible terms before the rule is readable. Two cases:
//   - interleaved / mod-cycle patterns: enough terms to show the lane structure.
//   - recurrences (Padovan, Pell, …) and high-order patterns: with only 5–6 terms
//     the rule is impossible to spot, so give them a longer run.
// Total sequence length (the blank counts as one term).
const MIN_LENGTH_BY_KIND: Partial<Record<PatternKind, number>> = {
  'interleaved-2': 7,
  'pair-skip': 7,
  'interleaved-3': 10,
  padovan: 9,
  'third-diff-pattern': 9,
  pell: 8,
  'deceptive-start': 8,
  'fib-times-n': 8,
  // Position-varying multiplicative patterns: the multiplier/offset changes with
  // n, so 5 terms can't reveal the rule. Give them a 7-term run. The fastest
  // grower (mul-by-2n-sub-2n) blows past MAX_ABS_TERM at length 7 and is dropped
  // by the gate — acceptable, it can't show enough terms to be solvable anyway.
  'mul3-sub-growing': 7,
  'mul-by-2n-sub-2n': 7,
  'mul-by-n-add-n-x-n-plus-1': 7,
  'mul-n-add-next-square': 7,
  'mul-growing-alt-add': 7,
  'add-dec-mul-inc': 7,
  'mul-by-n-add-n-squared': 7,
  'mul-by-position-plus-1': 7,
};

// Recurrence / high-order / position-varying patterns where the solver must see a
// long run to infer the rule. Pin the blank to the last position so every
// preceding term is shown as context (predict the next term rather than fill a gap).
const LAST_BLANK_KINDS: ReadonlySet<PatternKind> = new Set<PatternKind>([
  'padovan',
  'third-diff-pattern',
  'pell',
  'deceptive-start',
  'fib-times-n',
  'mul3-sub-growing',
  'mul-by-2n-sub-2n',
  'mul-by-n-add-n-x-n-plus-1',
  'mul-n-add-next-square',
  'mul-growing-alt-add',
  'add-dec-mul-inc',
  'mul-by-n-add-n-squared',
  'mul-by-position-plus-1',
]);

const MIDDLE_BLANK_PROBABILITY = 0.3;

/**
 * One draw: pick a length, pick a generator, materialize it, and re-roll once
 * with a longer window if the kind needs more visible cycles. Kept as a single
 * unit so the tractability re-roll loop can repeat it identically (preserving
 * the rng draw sequence per attempt, hence determinism).
 */
function drawPattern(
  generators: PatternGenerator[],
  rng: Rng,
  minLen: number,
  maxLen: number,
): SeriesPattern {
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
  return pattern;
}

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

  // Draw a pattern, then re-roll while it isn't solvable by mental arithmetic
  // (e.g. squares of large primes, nⁿ, 2^(n²)). The gate is pure, so the happy
  // path consumes no extra rng draws and stays deterministic per seed.
  let pattern = drawPattern(generators, rng, minLen, maxLen);
  for (
    let attempts = 0;
    attempts < MAX_TRACTABILITY_ATTEMPTS && !isMentallyTractable(pattern);
    attempts++
  ) {
    pattern = drawPattern(generators, rng, minLen, maxLen);
  }
  if (!isMentallyTractable(pattern)) {
    const fallbacks = SAFE_FALLBACK_BY_DIFFICULTY[effective];
    const fallbackLen = rng.int(minLen, maxLen + 1);
    const chosen = rng.pick(fallbacks);
    const candidate = chosen(rng, fallbackLen);
    // All alternates are known-tractable, but guard defensively: if a chosen
    // alternate ever fails the gate, drop to the tier's primary (first) generator.
    pattern = isMentallyTractable(candidate)
      ? candidate
      : fallbacks[0]!(rng, fallbackLen);
  }
  const effectiveLength = pattern.terms.length;

  // Pick blank position. 70% last, 30% middle (positions 2..length-2 so the
  // user sees at least the first two terms and at least one term after the blank).
  // Recurrence / high-order kinds always blank the last term so the full run is visible.
  let missingIndex = effectiveLength - 1;
  if (
    !LAST_BLANK_KINDS.has(pattern.kind) &&
    rng.next() < MIDDLE_BLANK_PROBABILITY &&
    effectiveLength >= 5
  ) {
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
 * The structural essence a solver memorizes: the pattern rule plus whether the
 * blank is the last term (predict-next, "L") or an interior gap ("M"). The
 * concrete numbers and blank offset vary per instance — they're what the eye is
 * meant to work through — so they're excluded. Used to keep a session free of
 * repeated rule/blank types and to steer fresh sessions away from recent ones.
 */
export function signatureOf(q: SeriesQuestion): string {
  const lastIndex = q.visibleTerms.length - 1;
  return `${q.pattern.kind}:${q.missingIndex === lastIndex ? 'L' : 'M'}`;
}

/**
 * Pre-generate a full session of questions up-front for determinism. Wrapped in
 * generateDistinctSession so consecutive questions don't repeat the same
 * rule/blank signature (anti-memorization). Retries draw from the same seeded
 * rng, so the session stays reproducible per seed.
 */
export function generateSession(
  settings: SeriesSettings,
  seed?: number,
): SeriesQuestion[] {
  const rng = seed !== undefined ? makeRng(seed) : defaultRng;
  return generateDistinctSession(
    settings.count,
    () => generateSeriesQuestion(settings.difficulty, rng),
    signatureOf,
  );
}

export { buildOptions } from './distractors';
export { makeRng, defaultRng } from './rng';
export type { Rng } from './rng';
