import type { Pt, Polygon } from '../rotation-puzzle/types';

export type { Pt, Polygon };

/** A single piece as drawn inside a choice card. */
export type Piece = {
  /**
   * Polygon vertices. For a correct piece these are in the completed-shape's
   * local coords (its TRUE position inside the square), so the solution figure
   * can render the exact assembly. For a distractor these are recentered on the
   * origin (the piece has no true position).
   */
  polygon: Polygon;
  /** Display rotation in degrees (CCW positive) applied around the centroid. */
  displayRotation: number;
  /** Where the centroid-shifted piece is translated to inside the choice viewBox. */
  displayCenter: Pt;
};

/** How a wrong choice fails to belong in the correct fill. */
export type DistractorKind =
  | 'correct'
  | 'scale-error'
  | 'overlap'
  | 'gap-short'
  | 'angle-mismatch'
  | 'proportion'
  | 'mirror-only'
  | 'redundant'
  | 'near-twin'
  | 'incompatible-cut';

export type Choice = {
  piece: Piece;
  isCorrect: boolean;
  kind: DistractorKind;
  /** Short reason shown on reveal. */
  explanation: string;
};

export type Difficulty = 'easy' | 'normal' | 'hard';
export type DifficultyOrMixed = Difficulty | 'mixed';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
};

/** Whether completed shapes are only squares or may also be rectangles. */
export type ShapeScope = 'square' | 'square-rect';

export type Puzzle = {
  id: string;
  /** The full square (or rectangle) the pieces complete. */
  completed: Polygon;
  /** The notched main shape shown on the left. */
  main: Polygon;
  /** Always exactly 4 choices (a, b, c, d). */
  choices: Choice[];
  /** Indices into `choices` that together fill the gap. */
  correctIndices: number[];
  difficulty: Difficulty;
};

export type Settings = {
  count: number;
  difficulty: DifficultyOrMixed;
  shapeScope: ShapeScope;
};

export type SheetResult = {
  puzzle: Puzzle;
  /** Choice indices the solver selected. */
  selected: number[];
  /** True only if `selected` equals `correctIndices` exactly. */
  correct: boolean;
};
