import type { Angle, Choice, DistractorKind, Face, Placement } from '../types';
import { placementKey } from './cube';
import type { Rng } from '@/rotation-puzzle/generate/rng';

const FACES: Face[] = ['top', 'right', 'left'];
const ANGLES: Angle[] = [0, 90, 180, 270];

/** Every visible (face, angle) combination — the full space the mark can occupy. */
function allCombos(): Placement[] {
  const out: Placement[] = [];
  for (const face of FACES) for (const angle of ANGLES) out.push({ face, angle });
  return out;
}

function kindFor(correct: Placement, p: Placement, offByOne: Placement | null): DistractorKind {
  if (offByOne && placementKey(offByOne) === placementKey(p)) return 'off-by-one';
  if (p.face === correct.face) return 'same-face-rotated';
  return 'other-face';
}

/**
 * Build six choices: the correct placement plus five distinct, plausible wrong
 * ones. The off-by-one landing (if visible and distinct) is always included; the
 * rest favour same-face rotations and other-face positions, then fill at random.
 */
export function generateChoices(
  rng: Rng,
  correct: Placement,
  offByOne: Placement | null,
): { choices: Choice[]; correctIndex: number } {
  const correctKey = placementKey(correct);
  const chosen: Placement[] = [correct];
  const used = new Set<string>([correctKey]);

  const add = (p: Placement): boolean => {
    const k = placementKey(p);
    if (used.has(k)) return false;
    used.add(k);
    chosen.push(p);
    return true;
  };

  // 1. The classic miscount, when it differs from the answer and stays visible.
  if (offByOne && offByOne.face !== null) add(offByOne);

  // 2. Same face, other angles — "right face, wrong rotation".
  for (const angle of rng.shuffle(ANGLES.slice())) {
    if (chosen.length >= 4) break;
    if (correct.face) add({ face: correct.face, angle });
  }

  // 3. Fill the rest from the whole space (mostly other faces).
  for (const p of rng.shuffle(allCombos())) {
    if (chosen.length >= 6) break;
    add(p);
  }

  const shuffled = rng.shuffle(chosen);
  const choices: Choice[] = shuffled.map((p) => {
    const isCorrect = placementKey(p) === correctKey;
    return {
      placement: p,
      isCorrect,
      kind: isCorrect ? 'correct' : kindFor(correct, p, offByOne),
    };
  });

  return { choices, correctIndex: choices.findIndex((c) => c.isCorrect) };
}
