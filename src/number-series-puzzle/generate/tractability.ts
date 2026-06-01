import type { PatternKind, SeriesPattern } from '../types';

// "Mental-tractability" gate.
//
// The user solves number-series questions purely in their head — no scratch
// paper, no calculator. A question is acceptable when the answer can be reached
// by an operation a person can actually do mentally. Crucially, raw magnitude is
// NOT the test: 5, 25, 125, 625, 3125 is fine (each step is ×5), while
// 23², 29², 31², … = 529, 841, 961, … is not — not because squaring is hard, but
// because recognising a large number *backwards* as "a prime squared" is hard.
//
// Two tracks:
//   A. step-derivable — each term follows from the previous by a simple op
//      (small multiply/divide, a mild add, an affine ×a±b with small a). The
//      solver walks the chain forwards, so any magnitude is fine.
//   B. closed-form — each term is f(n) the solver must recognise on its own
//      (squares/cubes/4th powers, prime-squares, Catalan, nⁿ, …). These are only
//      solvable while the values stay small enough to recognise backwards.

// Tunable thresholds. Exported so tests can pin them and they can be retuned.
export const MAX_RATIO = 12; // largest integer multiplier you'd do in your head
export const ADD_CAP = 500; // largest gap (or post-multiply offset) you'd add in your head
export const RECOGNITION_CAP = 400; // largest closed-form term you can recognise backwards
// Generous absolute backstop. Step-derivable magnitude is otherwise fine
// (5, 25, 125, 625, 3125, …; factorials), but compounding mid-size multipliers
// (e.g. ×13, ×11, ×9, …) can reach six-digit numbers no one tracks in their
// head — this catches those without touching the chains the user accepts.
export const MAX_ABS_TERM = 100_000;

// Track B: terms are f(n) that must be recognised individually. Pass only when
// every term stays within RECOGNITION_CAP.
const CLOSED_FORM_KINDS: ReadonlySet<PatternKind> = new Set<PatternKind>([
  'squares',
  'squares-offset',
  'squares-alt-sign',
  'n-squared-minus-k',
  'alt-sign-squares',
  'n2-minus-prev-pos',
  'quadratic-n2-plus-n',
  'quadratic-general',
  'prime-squares',
  'cubes',
  'n-cubed-minus-k',
  'n-cubed-plus-n',
  'cubic-general',
  'factorial-offset',
  'alt-sign-factorial',
  'n4-minus-k',
  'catalan',
  'n-to-n',
  'pow-of-square',
]);

// Track A, but the naive adjacent-pair scan would misread these: recurrences
// (each term is a sum of *visible* earlier terms), interleaved/alternating lanes
// (consecutive terms come from different lanes), and simple-fraction multipliers.
// All are mentally easy by construction, so accept them outright.
const ALWAYS_TRACTABLE_KINDS: ReadonlySet<PatternKind> = new Set<PatternKind>([
  'fibonacci',
  'lucas',
  'pell',
  'padovan',
  'deceptive-start',
  'linear-recurrence',
  'recurrence-with-position',
  'sum-of-all-previous',
  'interleaved-2',
  'interleaved-3',
  'pair-skip',
  'alternating-pair',
  'geo-fractional',
  'half-step-multiplier',
  'half-step-both',
  'mul-growing-fraction',
  'add-halving',
  'div2-add-pow2-growing',
  'div-then-sub-decreasing',
]);

// Is a single step prev → cur something you'd do in your head?
//   - a mild add/subtract (|Δ| ≤ ADD_CAP), or
//   - an affine ×a±b with a small integer multiplier a (2..MAX_RATIO) and a mild
//     offset b (covers pure geometric when b = 0, factorial/×n, ×n+1, ×n+n², …),
//   - or the same seen as a small integer divide.
function stepIsEasy(prev: number, cur: number): boolean {
  if (Math.abs(cur - prev) <= ADD_CAP) return true;
  if (prev !== 0) {
    const a = Math.round(cur / prev);
    if (Math.abs(a) >= 2 && Math.abs(a) <= MAX_RATIO && Math.abs(cur - a * prev) <= ADD_CAP) {
      return true;
    }
  }
  if (cur !== 0) {
    const b = Math.round(prev / cur);
    if (Math.abs(b) >= 2 && Math.abs(b) <= MAX_RATIO && Math.abs(prev - b * cur) <= ADD_CAP) {
      return true;
    }
  }
  return false;
}

function isStepDerivable(terms: number[]): boolean {
  for (let i = 1; i < terms.length; i++) {
    if (!stepIsEasy(terms[i - 1]!, terms[i]!)) return false;
  }
  return true;
}

/**
 * True when the question can plausibly be solved by mental arithmetic.
 * Pure: depends only on the pattern's kind and materialized terms.
 */
export function isMentallyTractable(pattern: SeriesPattern): boolean {
  const { kind, terms } = pattern;

  if (terms.some((t) => Math.abs(t) > MAX_ABS_TERM)) return false;

  if (CLOSED_FORM_KINDS.has(kind)) {
    return terms.every((t) => Math.abs(t) <= RECOGNITION_CAP);
  }

  if (ALWAYS_TRACTABLE_KINDS.has(kind)) return true;

  return isStepDerivable(terms);
}
