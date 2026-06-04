import type { Pt } from '../rotation-puzzle/types';

export type { Pt };

/** A cell coordinate / box dimension in the 3D integer grid. */
export type Vec3 = { x: number; y: number; z: number };

/**
 * One block in the arrangement. All blocks in a single puzzle are congruent
 * (same `size`, possibly reoriented along a different axis), placed on an
 * integer grid of unit cells with `origin` as the min-corner cell.
 */
export type Block = {
  id: number;
  label: string; // 'A', 'B', 'C', …
  origin: Vec3; // min-corner cell
  size: Vec3; // box dimensions in cells
  /** Answer key: how many of the block's 6 faces touch another block (0–6). */
  touchingFaces: number;
};

export type Difficulty = 'easy' | 'normal' | 'hard';
export type DifficultyOrMixed = Difficulty | 'mixed';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
};

export type Puzzle = {
  id: string;
  /** Blocks in painter draw order (far → near) so nearer boxes occlude farther ones. */
  blocks: Block[];
  difficulty: Difficulty;
  /** Shared SVG viewBox computed from all projected box corners. */
  viewBox: string;
};

export type Settings = {
  count: number;
  difficulty: DifficultyOrMixed;
};

export type SheetResult = {
  puzzle: Puzzle;
  /** label → value the solver entered (null = left blank). */
  selected: Record<string, number | null>;
  /** True only if every label's entered value equals its `touchingFaces`. */
  correct: boolean;
  /** Per-label correctness, for the reveal panel. */
  perLabel: Record<string, boolean>;
};
