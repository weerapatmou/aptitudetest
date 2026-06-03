import type { ApproxOption, ApproxProblem, DistractorKind } from '../types';
import type { Rng } from './rng';
import { roundDec } from './messy';

const NUM_OPTIONS = 5;

const gridUnit = (precision: number) => Math.pow(10, -precision);

/**
 * Choose a "nice" ladder step (multiples of 1/2/2.5/4/5/10/20 scaled to the
 * anchor's magnitude) so options read like 100/130/170 or 560/570/580. The step
 * must clear `floor` (so the exact value still rounds to the estimate rung), sit
 * below ~45% of the anchor, and land on the display grid so rounding to
 * `precision` can never make the spacing uneven.
 */
function chooseStep(rng: Rng, anchor: number, precision: number, floor: number): number {
  const a = Math.max(1, Math.abs(anchor));
  const mag = Math.pow(10, Math.floor(Math.log10(a)) - 1);
  const lo = Math.max(mag, a * 0.03, floor);
  const hi = Math.max(lo, a * 0.45);
  const candidates = [1, 2, 2.5, 4, 5, 10, 20]
    .map((m) => m * mag)
    .filter((s) => s >= lo && s <= hi);
  const raw = candidates.length > 0 ? rng.pick(candidates) : Math.ceil(lo / mag) * mag;
  const u = gridUnit(precision);
  return Math.max(u, Math.round(raw / u) * u);
}

function classify(rungsAway: number, value: number, anchor: number): DistractorKind {
  const a = Math.abs(anchor) || 1;
  if (Math.abs(value) > a * 8 || Math.abs(value) < a / 8) return 'order-of-magnitude';
  if (Math.abs(rungsAway) === 1) return 'ladder-neighbor';
  return 'close-miss';
}

function rationaleFor(rungsAway: number, formula: string): string {
  return rungsAway < 0
    ? `Too low — likely rounded the inputs down too far or dropped a step in "${formula}".`
    : `Too high — likely rounded the inputs up or applied the wrong operation in "${formula}".`;
}

/** Index of the option closest to `target`; ties resolve to the lower value
 *  (values are ascending, so the earliest index). */
function closestIndex(values: number[], target: number): number {
  let best = 0;
  let bestDist = Math.abs(values[0]! - target);
  for (let i = 1; i < values.length; i++) {
    const d = Math.abs(values[i]! - target);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}

function assemble(
  values: number[],
  correctIndex: number,
  problem: ApproxProblem,
): { options: ApproxOption[]; correctValue: number } {
  const options: ApproxOption[] = values.map((value, i) => {
    if (i === correctIndex) {
      return { value, isCorrect: true, rationale: problem.mentalLogic };
    }
    const rungsAway = i - correctIndex;
    return {
      value,
      isCorrect: false,
      distractorKind: classify(rungsAway, value, problem.estimateValue),
      rationale: rationaleFor(rungsAway, problem.formula),
    };
  });
  return { options, correctValue: values[correctIndex]! };
}

/**
 * Build a 5-rung arithmetic ladder of options, sorted ascending. The correct
 * answer is the clean estimate the mental-logic cites; the step is sized so the
 * true (exact) value still rounds to that rung, keeping the answer both
 * mathematically closest and consistent with the explanation. The correct rung's
 * position is randomized so it is not always centred.
 */
export function buildLadderOptions(
  problem: ApproxProblem,
  rng: Rng,
): { options: ApproxOption[]; correctValue: number } {
  const { exactValue, estimateValue, precision } = problem;
  const anchor = estimateValue;
  const delta = Math.abs(exactValue - estimateValue);

  let step = chooseStep(rng, anchor, precision, delta * 2.2);

  for (let attempt = 0; attempt < 6; attempt++) {
    const correctRung = roundDec(estimateValue, precision);

    // Keep the whole ladder positive: cap how many rungs sit below the correct one.
    const maxBelow = Math.max(0, Math.floor(correctRung / step) - 1);
    const hi = Math.min(NUM_OPTIONS - 1, maxBelow);
    const placedIndex = rng.int(0, hi + 1); // 0..hi inclusive

    const values: number[] = [];
    for (let i = 0; i < NUM_OPTIONS; i++) {
      values.push(roundDec(correctRung + (i - placedIndex) * step, precision));
    }

    // The estimate rung must be distinct, positive, and genuinely closest to exact.
    if (
      new Set(values).size === NUM_OPTIONS &&
      values.every((v) => v > 0) &&
      closestIndex(values, exactValue) === placedIndex
    ) {
      return assemble(values, placedIndex, problem);
    }

    step *= 2; // collapsed rung, non-positive, or exact too close to a neighbour: widen
  }

  // Fallback: guaranteed-distinct integer ladder centred on the rounded estimate.
  const u = gridUnit(precision);
  const fallbackStep = Math.max(u, Math.round(Math.max(delta * 2.2, Math.abs(anchor) * 0.1) / u) * u);
  const placedIndex = rng.int(0, NUM_OPTIONS);
  const base = Math.max(fallbackStep, roundDec(anchor, precision));
  const values: number[] = [];
  for (let i = 0; i < NUM_OPTIONS; i++) {
    values.push(roundDec(base + (i - placedIndex) * fallbackStep, precision));
  }
  return assemble(values, closestIndex(values, exactValue), problem);
}
