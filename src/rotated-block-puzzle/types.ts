/** A unit cube cell on the 3D integer lattice. */
export type Cell = { x: number; y: number; z: number };

/** A 3D solid as a set of occupied unit cells (a polycube). */
export type Polycube = Cell[];

export type Difficulty = 'easy' | 'normal' | 'hard';
export type DifficultyOrMixed = Difficulty | 'mixed';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
};

/** How a distractor fails to be a pure rotation of the reference solid. */
export type DistractorKind =
  | 'correct'
  | 'mirror' // reflected (chiral) copy — only matches if flipped, not rotated
  | 'moved-block' // one cell relocated → a different shape
  | 'added-block' // one extra cell → a different shape
  | 'removed-block' // one cell fewer → a different shape
  | 'swap-two-blocks' // two cells relocated → same count, different shape
  | 'stretched'; // a run lengthened / footprint altered → wrong proportions

export const DISTRACTOR_EXPLANATION: Record<Exclude<DistractorKind, 'correct'>, string> = {
  mirror: 'a mirror image — it would only match if flipped, not just rotated.',
  'moved-block': 'one block sits in a different place — a different shape, not a rotation.',
  'added-block': 'it has an extra block — a different shape, not a rotation.',
  'removed-block': 'it is missing a block — a different shape, not a rotation.',
  'swap-two-blocks': 'two blocks have shifted to new places — a different shape, not a rotation.',
  stretched: 'its proportions are off — one run is the wrong length.',
};

export type Choice = {
  /** The solid as drawn (already in its display orientation). */
  solid: Polycube;
  isCorrect: boolean;
  kind: DistractorKind;
  /** Short reason shown on reveal. */
  explanation: string;
};

export type Puzzle = {
  id: string;
  /** The reference solid shown at the top of the question (display orientation). */
  reference: Polycube;
  /** Exactly 5 choices (A–E), shuffled. */
  choices: Choice[];
  correctIndex: number;
  difficulty: Difficulty;
  /** Shared SVG viewBox sized from the union of all projected bounds. */
  viewBox: string;
  /**
   * Rotation-canonical key of the base solid (24-rotation normalized; mirrors
   * NOT folded). Identifies the underlying chiral pattern for session anti-repeat.
   */
  baseKey: string;
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
