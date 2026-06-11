import type { ApproxProblem, ApproxQuestion, ApproxSettings } from '../types';
import { defaultRng, makeRng } from './rng';
import type { Rng } from './rng';
import { buildLadderOptions } from './options';
import { ALL_GENERATORS, speed } from './archetypes';
import { generateDistinctSession } from '@/shared/coverage';

const MAX_VIABILITY_ATTEMPTS = 12;

/**
 * A problem is usable if it has a finite, positive exact value and a clean
 * estimate the ladder can centre on, with the two within a few percent of each
 * other (so the "closest rung" really is the rounded estimate).
 */
function isLadderViable(problem: ApproxProblem): boolean {
  const { exactValue, estimateValue } = problem;
  if (!Number.isFinite(exactValue) || !Number.isFinite(estimateValue)) return false;
  if (exactValue <= 0 || estimateValue < 1) return false;
  const rel = Math.abs(exactValue - estimateValue) / Math.max(1, Math.abs(estimateValue));
  return rel <= 0.25;
}

/** Generate a single approximation question. */
export function generateApproxQuestion(rng: Rng = defaultRng): ApproxQuestion {
  let problem = rng.pick(ALL_GENERATORS)(rng);
  for (
    let attempts = 0;
    attempts < MAX_VIABILITY_ATTEMPTS && !isLadderViable(problem);
    attempts++
  ) {
    problem = rng.pick(ALL_GENERATORS)(rng);
  }
  if (!isLadderViable(problem)) {
    problem = speed(rng); // safe, single-op fallback
  }

  const { options, correctValue } = buildLadderOptions(problem, rng);

  return {
    id: `${problem.kind}-${Math.floor(rng.next() * 1e9).toString(36)}`,
    problem,
    options,
    correctValue,
  };
}

/**
 * The structural essence a solver memorizes: the archetype KIND plus the
 * order-of-magnitude bucket of the estimate (so "≈ 500" and "≈ 5000" of the
 * same kind read as different). The continuous messy jitter is excluded — it's
 * what the eye is meant to round through. Used to keep a session free of
 * repeated problem shapes and to steer fresh sessions away from recent ones.
 */
export function signatureOf(problem: ApproxProblem): string {
  const mag =
    Number.isFinite(problem.estimateValue) && problem.estimateValue > 0
      ? Math.floor(Math.log10(problem.estimateValue))
      : 0;
  return `${problem.kind}:${mag}`;
}

/** Pre-generate a full session up-front for determinism. */
export function generateSession(settings: ApproxSettings, seed?: number): ApproxQuestion[] {
  const rng = seed !== undefined ? makeRng(seed) : defaultRng;
  return generateDistinctSession(
    settings.count,
    () => generateApproxQuestion(rng),
    (q) => signatureOf(q.problem),
  );
}

export { buildLadderOptions } from './options';
export { makeRng, defaultRng } from './rng';
export type { Rng } from './rng';
