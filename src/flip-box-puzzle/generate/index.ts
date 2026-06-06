import type { Command, Difficulty, Puzzle, Settings } from '../types';
import { COMMANDS } from '../types';
import { applyCommand, IDENTITY, resolvePlacement, type Mat3 } from './cube';
import { generateChoices } from './distractors';
import { VIEWBOX } from './iso';
import { makeRng, type Rng } from '@/rotation-puzzle/generate/rng';

/** Sequence length per difficulty (mirrors the worksheet's 3–6 step questions). */
const SEQ_LEN: Record<Difficulty, number> = { easy: 3, normal: 4, hard: 6 };

function rollDifficulty(setting: Settings['difficulty'], rng: Rng): Difficulty {
  if (setting === 'mixed') return rng.pick(['easy', 'normal', 'hard'] as const);
  return setting;
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
  const len = SEQ_LEN[difficulty];

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

    return { id, initial, commands, steps, choices, correctIndex, difficulty, viewBox: VIEWBOX };
  }

  // Deterministic fallback (a simple two-turn puzzle) — practically unreachable.
  const commands: Command[] = ['turn-right', 'turn-forwards'];
  let m = IDENTITY;
  const steps = commands.map((cmd) => resolvePlacement((m = applyCommand(m, cmd))));
  const final = steps[steps.length - 1]!;
  const { choices, correctIndex } = generateChoices(rng, final, steps[0]!);
  return {
    id,
    initial: resolvePlacement(IDENTITY),
    commands,
    steps,
    choices,
    correctIndex,
    difficulty,
    viewBox: VIEWBOX,
  };
}

export function generateSession(settings: Settings, seed?: number): Puzzle[] {
  const rng = makeRng(seed);
  return Array.from({ length: settings.count }, (_, i) =>
    generatePuzzle(rollDifficulty(settings.difficulty, rng), rng, `fb-${i}`),
  );
}
