import type { Command, Difficulty, Puzzle, Settings } from '../types';
import { COMMANDS } from '../types';
import { applyCommand, IDENTITY, placementKey, resolvePlacement, type Mat3 } from './cube';
import { generateChoices } from './distractors';
import { GLYPHS, VIEWBOX } from './iso';
import { makeRng, type Rng } from '@/rotation-puzzle/generate/rng';
import { generateDistinctSession } from '@/shared/coverage';

/**
 * Inclusive sequence-length band per difficulty. The exact length is rolled per
 * question (mirrors the worksheet's spread of 3–7 step questions) so a session
 * varies even though the visible answer space is small.
 */
const SEQ_LEN_RANGE: Record<Difficulty, [number, number]> = {
  easy: [3, 4],
  normal: [4, 6],
  hard: [5, 8],
};

function rollDifficulty(setting: Settings['difficulty'], rng: Rng): Difficulty {
  if (setting === 'mixed') return rng.pick(['easy', 'normal', 'hard'] as const);
  return setting;
}

/** Roll a sequence length inside the difficulty's band, inclusive of both ends. */
export function rollSeqLen(difficulty: Difficulty, rng: Rng): number {
  const [lo, hi] = SEQ_LEN_RANGE[difficulty];
  return rng.int(lo, hi + 1);
}

function randomCommands(n: number, rng: Rng): Command[] {
  return Array.from({ length: n }, () => rng.pick(COMMANDS));
}

/** A random starting orientation whose mark lands on a visible face. */
function randomStart(rng: Rng): Mat3 {
  for (let attempt = 0; attempt < 24; attempt++) {
    let m: Mat3 = IDENTITY;
    const k = rng.int(0, 3); // 0–2 warm-up turns
    for (let i = 0; i < k; i++) m = applyCommand(m, rng.pick(COMMANDS));
    if (resolvePlacement(m).face !== null) return m;
  }
  return IDENTITY;
}

export function generatePuzzle(difficulty: Difficulty, rng: Rng, id: string): Puzzle {
  const len = rollSeqLen(difficulty, rng);
  // Cosmetic glyph for this question (carried on every cube in the question).
  const glyph = rng.pick(GLYPHS);

  // Resample the sequence until the mark ends on a visible face, so every
  // answer (like the worksheet) actually shows a mark.
  for (let attempt = 0; attempt < 60; attempt++) {
    const m0 = randomStart(rng);
    const initial = resolvePlacement(m0);
    const commands = randomCommands(len, rng);

    const steps = [];
    let m = m0;
    for (const cmd of commands) {
      m = applyCommand(m, cmd);
      steps.push(resolvePlacement(m));
    }
    const final = steps[steps.length - 1]!;
    if (final.face === null) continue;

    // The off-by-one miscount: the state one command earlier.
    const prev = steps.length >= 2 ? steps[steps.length - 2]! : initial;
    const offByOne = prev.face === final.face && prev.angle === final.angle ? null : prev;

    const { choices, correctIndex } = generateChoices(rng, final, offByOne);
    if (choices.length < 6) continue; // not enough distinct distractors (very rare)

    return { id, glyph, initial, commands, steps, choices, correctIndex, difficulty, viewBox: VIEWBOX };
  }

  // Deterministic fallback (a simple two-turn puzzle) — practically unreachable.
  const commands: Command[] = ['turn-right', 'turn-forwards'];
  let m = IDENTITY;
  const steps = commands.map((cmd) => resolvePlacement((m = applyCommand(m, cmd))));
  const final = steps[steps.length - 1]!;
  const { choices, correctIndex } = generateChoices(rng, final, steps[0]!);
  return {
    id,
    glyph,
    initial: resolvePlacement(IDENTITY),
    commands,
    steps,
    choices,
    correctIndex,
    difficulty,
    viewBox: VIEWBOX,
  };
}

/**
 * The trajectory a solver actually tracks: the mark's starting placement followed
 * by its placement after every command, joined with '>'. Final-placement alone
 * spans only ~12 visible states, so two questions can land identically while
 * taking wholly different paths — keying on the whole trajectory keeps a session
 * (and the cross-session history) varied. The cosmetic glyph is excluded.
 */
export function signatureOf(puzzle: Puzzle): string {
  const placements = [puzzle.initial, ...puzzle.steps];
  return placements.map(placementKey).join('>');
}

export function generateSession(settings: Settings, seed?: number): Puzzle[] {
  const rng = makeRng(seed);
  let i = 0;
  return generateDistinctSession(
    settings.count,
    () => generatePuzzle(rollDifficulty(settings.difficulty, rng), rng, `fb-${i++}`),
    signatureOf,
  );
}
