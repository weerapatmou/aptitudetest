import type { Rng } from '../../rotation-puzzle/generate/rng';
import type { DistractorKind, Polycube } from '../types';
import { DISTRACTOR_EXPLANATION } from '../types';
import {
  addBlock,
  canonicalKey,
  isRotationCongruent,
  moveBlock,
  normalize,
  orientations,
  reflect,
  removeBlock,
  stretch,
  swapTwoBlocks,
} from './polycube';
import { hiddenCellCount } from './iso';

/** Does the solid have at least one orientation in which every cube is visible? */
function hasFullyVisibleView(solid: Polycube): boolean {
  return orientations(solid).some((o) => hiddenCellCount(o) === 0);
}

export type Distractor = { solid: Polycube; kind: DistractorKind };

type Mutator = Exclude<DistractorKind, 'correct'>;

const MUTATORS: Mutator[] = [
  'mirror',
  'moved-block',
  'swap-two-blocks',
  'added-block',
  'removed-block',
  'stretched',
];

function mutate(base: Polycube, kind: Mutator, rng: Rng): Polycube | null {
  switch (kind) {
    case 'mirror':
      return reflect(base);
    case 'moved-block':
      return moveBlock(base, rng);
    case 'swap-two-blocks':
      return swapTwoBlocks(base, rng);
    case 'added-block':
      return addBlock(base, rng);
    case 'removed-block':
      return removeBlock(base, rng);
    case 'stretched':
      return stretch(base, rng);
  }
}

/**
 * Build `n` distractor solids for `base`, returned **un-oriented** (normalized
 * in their natural pose). Each is verified to be NOT a rotation of the base (the
 * core fairness guarantee) and rotation-distinct from the other distractors.
 * Orientation and render-image distinctness are applied centrally by the puzzle
 * assembler so reference + all choices share one fairness pass.
 */
export function buildDistractors(base: Polycube, n: number, rng: Rng): Distractor[] {
  const out: Distractor[] = [];
  const seenCanon = new Set<string>([canonicalKey(base)]); // rotation-distinct shapes only
  const usedKinds = new Set<Mutator>();
  let attempts = 0;

  while (out.length < n && attempts < 400) {
    attempts++;
    // Prefer kinds not yet used for variety, then allow repeats.
    const pool = MUTATORS.filter((k) => !usedKinds.has(k));
    const kind = rng.pick(pool.length > 0 ? pool : MUTATORS);

    const mutated = mutate(base, kind, rng);
    if (!mutated) continue;

    // A mutation must never be a pure rotation of the base.
    if (isRotationCongruent(mutated, base)) continue;

    const solid = normalize(mutated);
    const canon = canonicalKey(solid);
    if (seenCanon.has(canon)) continue; // rotation-equal to base or another distractor
    if (!hasFullyVisibleView(solid)) continue; // must be drawable with no hidden cube

    seenCanon.add(canon);
    usedKinds.add(kind);
    out.push({ solid, kind });
  }

  // If we somehow fell short (rare), pad with add/remove/mirror variants.
  while (out.length < n) {
    const fallback = rng.bool() ? removeBlock(base, rng) : addBlock(base, rng);
    if (
      fallback &&
      !isRotationCongruent(fallback, base) &&
      !seenCanon.has(canonicalKey(fallback)) &&
      hasFullyVisibleView(fallback)
    ) {
      const solid = normalize(fallback);
      seenCanon.add(canonicalKey(solid));
      out.push({ solid, kind: solid.length < base.length ? 'removed-block' : 'added-block' });
    } else {
      // Last resort: a mirror, guaranteed non-congruent for chiral bases.
      const mir = normalize(reflect(base));
      out.push({ solid: mir, kind: 'mirror' });
      seenCanon.add(canonicalKey(mir));
    }
  }

  return out;
}

export function explanationFor(kind: Mutator): string {
  return DISTRACTOR_EXPLANATION[kind];
}
