export type Difficulty = 'easy' | 'normal' | 'hard';
export type DifficultyOrMixed = Difficulty | 'mixed';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
};

/** The six canonical rotation commands the solver applies in order. */
export type Command =
  | 'turn-left'
  | 'turn-right'
  | 'turn-forwards'
  | 'turn-backwards'
  | 'flip-left'
  | 'flip-right';

export const COMMANDS: readonly Command[] = [
  'turn-left',
  'turn-right',
  'turn-forwards',
  'turn-backwards',
  'flip-left',
  'flip-right',
] as const;

export const COMMAND_LABEL: Record<Command, string> = {
  'turn-left': 'Turn left',
  'turn-right': 'Turn right',
  'turn-forwards': 'Turn forwards',
  'turn-backwards': 'Turn backwards',
  'flip-left': 'Flip left',
  'flip-right': 'Flip right',
};

/** One of the three camera-facing faces of the isometric cube (or hidden). */
export type Face = 'top' | 'right' | 'left';
/** In-plane rotation of the mark on its face, in degrees. */
export type Angle = 0 | 90 | 180 | 270;

/** Where the mark sits after some rotation: a visible face + its in-plane angle, or hidden. */
export type Placement = { face: Face | null; angle: Angle };

export type DistractorKind = 'correct' | 'same-face-rotated' | 'other-face' | 'off-by-one';

export const DISTRACTOR_EXPLANATION: Record<Exclude<DistractorKind, 'correct'>, string> = {
  'same-face-rotated': 'right face, but the mark is rotated the wrong way.',
  'other-face': 'the mark ends up on a different face.',
  'off-by-one': 'where you land if you do one turn too many or too few.',
};

export type Choice = {
  placement: Placement;
  isCorrect: boolean;
  kind: DistractorKind;
};

export type Puzzle = {
  id: string;
  /** Mark position before any command (always on a visible face). */
  initial: Placement;
  /** The rotation sequence to apply, in order. */
  commands: Command[];
  /** Mark position after each command (steps[last] is the final answer). For replay. */
  steps: Placement[];
  /** Six choices (A–F), shuffled. */
  choices: Choice[];
  correctIndex: number;
  difficulty: Difficulty;
  /** Shared SVG viewBox for every cube in the question. */
  viewBox: string;
};

export type Settings = {
  count: number;
  difficulty: DifficultyOrMixed;
};

export type SheetResult = {
  puzzle: Puzzle;
  /** Choice index the solver selected, or null if unanswered. */
  selected: number | null;
  correct: boolean;
};
