import type { Pt } from '../rotation-puzzle/types';

export type { Pt };

/** A single unit cube cell on the integer lattice. x→right-back, y→left-back, z→up. */
export type Cell = { x: number; y: number; z: number };

export type Difficulty = 'easy' | 'normal' | 'hard';
export type DifficultyOrMixed = Difficulty | 'mixed';

/** The structural family an arrangement was built from (used for anti-repeat signatures). */
export type Archetype =
  | 'box'
  | 'staircase'
  | 'pyramid'
  | 'tower-on-box'
  | 'l-prism'
  | 'frame'
  | 'well'
  | 'plus'
  | 'u-shape'
  | 'two-towers'
  | 't-prism'
  | 'step-pyramid'
  | 'stepped-l'
  | 'tunnel'
  | 'zigzag-ridge'
  | 'double-well'
  | 'pinwheel';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
};

/**
 * A stack of cubes described by a heightmap. Every column is filled from the
 * ground (z=0) up to its height, so the arrangement is always "support-valid":
 * no floating cubes, and the only hidden cubes are those needed to support what
 * you can see.
 */
export type Arrangement = {
  /** The structural family this stack was built from. */
  archetype: Archetype;
  cols: number; // footprint width (x)
  rows: number; // footprint depth (y)
  /** height[x][y] ≥ 0 — number of cubes stacked in that column. */
  height: number[][];
  /** Materialized occupied cells (visible + hidden). */
  cells: Cell[];
  /** Total cube count = cells.length. This is the answer. */
  total: number;
};

/** How a wrong count is wrong. */
export type DistractorKind =
  | 'correct'
  | 'visible-only' // forgot the hidden support cubes (the classic trap)
  | 'footprint-only' // counted only the columns / top surface
  | 'off-by-one'
  | 'off-by-two'
  | 'face-tiles' // counted visible square faces instead of cubes
  | 'visible-plus-footprint'; // double-counted: visible cubes plus the column count

export type Choice = {
  value: number;
  isCorrect: boolean;
  kind: DistractorKind;
  /** Short reason shown on reveal. */
  rationale: string;
};

export type Puzzle = {
  id: string;
  arrangement: Arrangement;
  /** Always exactly 4 choices (a, b, c, d), shuffled. */
  choices: Choice[];
  correctIndex: number;
  difficulty: Difficulty;
  /** Shared viewBox computed from the isometric projection bounds. */
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
