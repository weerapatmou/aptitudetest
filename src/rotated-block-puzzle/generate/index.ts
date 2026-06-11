import { defaultRng, makeRng, type Rng } from '../../rotation-puzzle/generate/rng';
import { generateDistinctSession } from '@/shared/coverage';
import type { Choice, Difficulty, DifficultyOrMixed, Polycube, Puzzle, Settings } from '../types';
import { generateBase, fullyVisibleOrientations } from './shapes';
import { canonicalKey, isRotationCongruent } from './polycube';
import { buildDistractors, explanationFor } from './distractors';
import { renderSignature, sharedViewBox } from './iso';

const ALL_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
const CHOICE_COUNT = 5;

/**
 * Pick a fully-visible orientation of `solid` (no hidden cube) whose render
 * image is not already used by another card. Returns null if none is available
 * — the caller then retries the whole puzzle, so every emitted card is both
 * fully visible and visually unique.
 */
function pickDisplay(
  solid: Polycube,
  rng: Rng,
  usedSignatures: Set<string>,
): { solid: Polycube; signature: string } | null {
  for (const o of rng.shuffle(fullyVisibleOrientations(solid))) {
    const sig = renderSignature(o);
    if (!usedSignatures.has(sig)) return { solid: o, signature: sig };
  }
  return null;
}

/**
 * One Rotated-Blocks puzzle. Exactly one of the 5 choices is a pure rotation of
 * the reference; the other four are mutated shapes. A central fairness pass
 * guarantees the reference and the correct choice are fully visible and that all
 * six rendered images (reference + 5 choices) are distinct, so no card is
 * ambiguous or a look-alike of another.
 */
export function generatePuzzle(difficulty: DifficultyOrMixed, rng: Rng, id: string): Puzzle {
  const effective: Difficulty =
    difficulty === 'mixed' ? rng.pick(ALL_DIFFICULTIES) : difficulty;

  // Retry the whole assembly a few times; generateBase already guarantees ≥2
  // distinct fully-visible orientations, so this almost always succeeds first try.
  for (let attempt = 0; attempt < 30; attempt++) {
    const base = generateBase(effective, rng);
    // The rotation-invariant identity of the base shape (24-rotation canonical
    // form, reflections NOT folded — a mirror is a deliberately distinct chiral
    // pattern). Drives the session anti-repeat signature.
    const baseKey = canonicalKey(base);
    const used = new Set<string>();

    // Reference: a fully-visible view of the base.
    const ref = pickDisplay(base, rng, used);
    if (!ref) continue;
    used.add(ref.signature);

    // Correct: a DIFFERENT fully-visible view of the same base.
    const correct = pickDisplay(base, rng, used);
    if (!correct) continue;
    used.add(correct.signature);

    // Distractors: mutated shapes, each oriented to a fresh image.
    const distractors = buildDistractors(base, CHOICE_COUNT - 1, rng);
    const distractorChoices: Choice[] = [];
    let ok = true;
    for (const d of distractors) {
      const disp = pickDisplay(d.solid, rng, used);
      if (!disp) {
        ok = false;
        break;
      }
      used.add(disp.signature);
      distractorChoices.push({
        solid: disp.solid,
        isCorrect: false,
        kind: d.kind,
        explanation: explanationFor(d.kind as Exclude<typeof d.kind, 'correct'>),
      });
    }
    if (!ok || distractorChoices.length !== CHOICE_COUNT - 1) continue;

    const correctChoice: Choice = {
      solid: correct.solid,
      isCorrect: true,
      kind: 'correct',
      explanation: 'the same block, just rotated.',
    };

    const choices = rng.shuffle<Choice>([correctChoice, ...distractorChoices]);
    const correctIndex = choices.findIndex((c) => c.isCorrect);
    const viewBox = sharedViewBox([ref.solid, ...choices.map((c) => c.solid)]);

    return { id, reference: ref.solid, choices, correctIndex, difficulty: effective, viewBox, baseKey };
  }

  // Extremely defensive fallback: should not be reached in practice.
  throw new Error('failed to assemble a fair rotated-block puzzle');
}

/**
 * The structural essence a solver memorizes: the base polycube's cell count plus
 * its rotation-canonical key. Distinct chiral patterns (and their mirrors) get
 * distinct signatures, so the session anti-repeat keeps shapes from recurring.
 */
export function signatureOf(puzzle: Puzzle): string {
  return `${puzzle.reference.length}:${puzzle.baseKey}`;
}

/** A reproducible session of puzzles for the given settings. */
export function generateSession(settings: Settings, seed?: number): Puzzle[] {
  const rng = seed !== undefined ? makeRng(seed) : defaultRng;
  let i = 0;
  return generateDistinctSession(
    settings.count,
    () => generatePuzzle(settings.difficulty, rng, `rb-${i++}`),
    signatureOf,
  );
}

export { isRotationCongruent };
