import type { DistractorKind, SeriesOption, SeriesPattern } from '../types';
import type { Rng } from './rng';
import { roundDec } from './patterns/easy';

type DistractorCandidate = {
  value: number;
  kind: DistractorKind;
  rationale: string;
};

const MAX_TRIES = 24;

/**
 * Build 4 multiple-choice options for a question: 1 correct + 3 distractors,
 * shuffled. Distractor strategies are chosen based on the visible window of
 * terms around the missing slot.
 */
export function buildOptions(
  pattern: SeriesPattern,
  missingIndex: number,
  rng: Rng,
): SeriesOption[] {
  const correctValue = pattern.terms[missingIndex]!;
  const candidates = collectDistractors(pattern, missingIndex);

  // Filter out duplicates of the correct answer, then dedupe.
  const seen = new Set<number>([correctValue]);
  const usable: DistractorCandidate[] = [];
  for (const c of candidates) {
    if (!Number.isFinite(c.value)) continue;
    if (seen.has(c.value)) continue;
    seen.add(c.value);
    usable.push(c);
  }

  // Pick 3, preferring variety in kind.
  const picked: DistractorCandidate[] = [];
  const shuffled = rng.shuffle(usable);
  for (const c of shuffled) {
    if (picked.length >= 3) break;
    picked.push(c);
  }

  // Top up with synthetic close-misses if a generator didn't supply enough.
  let tries = 0;
  while (picked.length < 3 && tries < MAX_TRIES) {
    tries++;
    const delta = randomOffset(rng, Math.max(1, Math.abs(correctValue))) * (rng.bool() ? 1 : -1);
    const v = correctValue + delta;
    if (!Number.isFinite(v) || seen.has(v)) continue;
    seen.add(v);
    picked.push({
      value: v,
      kind: 'close-miss',
      rationale: `Off by ${Math.abs(delta)} — looks plausible but doesn't satisfy the rule.`,
    });
  }

  // Round to kill floating-point artifacts (e.g. 13.679999999999996 → 13.68).
  const correctOption: SeriesOption = {
    value: roundDec(correctValue, 4),
    isCorrect: true,
    rationale: pattern.explanation,
  };
  const wrongOptions: SeriesOption[] = picked.slice(0, 3).map((d) => ({
    value: roundDec(d.value, 4),
    isCorrect: false,
    distractorKind: d.kind,
    rationale: d.rationale,
  }));

  return rng.shuffle([correctOption, ...wrongOptions]);
}

/**
 * Generate a wide pool of distractor candidates rooted in common ways a solver
 * might apply a wrong rule. Generators below pick the most contextually
 * relevant ones via `buildOptions`.
 */
function collectDistractors(
  pattern: SeriesPattern,
  missingIndex: number,
): DistractorCandidate[] {
  const terms = pattern.terms;
  const n = terms.length;
  const correct = terms[missingIndex]!;
  const out: DistractorCandidate[] = [];

  const prev = missingIndex > 0 ? terms[missingIndex - 1]! : null;
  const prev2 = missingIndex > 1 ? terms[missingIndex - 2]! : null;
  const next = missingIndex < n - 1 ? terms[missingIndex + 1]! : null;

  // 1. plausible-ap — assume the gap right before the blank stays constant.
  if (prev !== null && prev2 !== null) {
    const gap = prev - prev2;
    out.push({
      value: prev + gap,
      kind: 'plausible-ap',
      rationale: `Assumed the gap stayed constant at ${gap} — treats it as a linear arithmetic progression.`,
    });
  }

  // 2. plausible-gp — assume the ratio stays constant.
  if (prev !== null && prev2 !== null && prev2 !== 0) {
    const ratio = prev / prev2;
    if (Number.isInteger(ratio) && Math.abs(ratio) >= 2 && Math.abs(ratio) <= 10) {
      out.push({
        value: Math.round(prev * ratio),
        kind: 'plausible-gp',
        rationale: `Assumed the ratio (×${ratio}) repeats — treats it as a geometric progression.`,
      });
    }
  }

  // 3. shifted — answered with the next term's value instead.
  if (next !== null) {
    out.push({
      value: next,
      kind: 'shifted',
      rationale: `That's the term that comes after — applied the rule one step too far.`,
    });
  }

  // 4. shifted-back — answered with the previous term's value plus its own gap.
  if (prev !== null && prev2 !== null) {
    out.push({
      value: 2 * prev - prev2,
      kind: 'shifted',
      rationale: `Off-by-one in index — used the previous step's gap instead of the current one.`,
    });
  }

  // 5. sign-flip — common trap when the correct value is negative or when an
  //    alternating-sign pattern is misread.
  if (correct !== 0) {
    out.push({
      value: -correct,
      kind: 'sign-flip',
      rationale: `Sign reversed — magnitude is right, direction is wrong.`,
    });
  }

  // 6. close-miss family — ±1, ±2 off the correct value.
  for (const delta of [-2, -1, 1, 2]) {
    out.push({
      value: correct + delta,
      kind: 'close-miss',
      rationale: `Numerically close (off by ${Math.abs(delta)}) but doesn't satisfy the rule.`,
    });
  }

  // 7. first-layer-only — if there's at least 3 prior visible terms, treat the
  //    most recent two as the rule rather than the deeper layer.
  if (prev !== null && prev2 !== null) {
    out.push({
      value: prev + (prev - prev2),
      kind: 'first-layer-only',
      rationale: `Caught the surface pattern but missed the second-order layer (the *gaps* are themselves changing).`,
    });
  }

  // 8. wrong-base — common ×3 vs ×2 trap when correct involves doubling.
  if (prev !== null && prev !== 0) {
    out.push({
      value: prev * 3,
      kind: 'wrong-base',
      rationale: `Used ×3 instead of the actual operation.`,
    });
    out.push({
      value: prev * 2,
      kind: 'wrong-base',
      rationale: `Used ×2 instead of the actual operation.`,
    });
  }

  return out;
}

function randomOffset(rng: Rng, scale: number): number {
  const max = Math.max(2, Math.min(20, Math.floor(scale * 0.2) + 2));
  return rng.int(1, max + 1);
}
