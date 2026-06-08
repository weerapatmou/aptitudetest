import type { OuterShape, Pt, Polygon } from '@/rotation-puzzle/types';

export type { OuterShape, Pt, Polygon };

/** How an option is rendered relative to the reference outline. */
export type Transform = {
  /** Rotation in degrees, CCW-positive (matches rotation-puzzle convention). */
  rotate: number;
  /** Mirror flip across the y-axis. */
  flipX: boolean;
};

export type DistractorKind =
  | 'correct'
  | 'mirror'
  | 'vertex-moved'
  | 'vertex-added'
  | 'vertex-removed'
  | 'stretched'
  | 'skewed';

export const DISTRACTOR_EXPLANATION: Record<Exclude<DistractorKind, 'correct'>, string> = {
  mirror: 'a mirror image — it would only match if flipped over, not just turned.',
  'vertex-moved': 'one corner has been moved — a different outline, not a rotation.',
  'vertex-added': 'it has an extra corner — a different outline, not a rotation.',
  'vertex-removed': 'it is missing a corner — a different outline, not a rotation.',
  stretched: 'it has been stretched out of proportion — no turn can ever match it.',
  skewed: 'it has been slanted (sheared) — no turn can ever match it.',
};

/** One of the five A–E options. */
export type Choice = {
  /** The outline to render (mutated for distortion distractors). */
  shape: OuterShape;
  /** Rotation/flip applied at render time. */
  transform: Transform;
  isCorrect: boolean;
  kind: DistractorKind;
  explanation: string;
};

export type Puzzle = {
  id: string;
  /** The reference outline, rendered with the identity transform. */
  reference: OuterShape;
  /** Exactly five shuffled options. */
  choices: Choice[];
  correctIndex: number;
  /** The correct answer's rotation angle (for summary copy). */
  rotation: number;
  /** Shared SVG viewBox so reference + all choices share one scale. */
  viewBox: string;
};

export type Settings = { count: number };

export type SheetResult = {
  puzzle: Puzzle;
  selected: number | null;
  correct: boolean;
};
