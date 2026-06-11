import type { Pt, Polygon } from '../rotation-puzzle/types';

export type { Pt, Polygon };

export type ReferenceShapeKind =
  | 'hexagon'
  | 'square'
  | 'circle'
  | 'oval'
  | 'kite'
  | 'triangle'
  | 'pentagon'
  | 'parallelogram';

export const REFERENCE_KINDS: readonly ReferenceShapeKind[] = [
  'hexagon',
  'square',
  'circle',
  'oval',
  'kite',
  'triangle',
  'pentagon',
  'parallelogram',
] as const;

export type ReferenceShape = {
  kind: ReferenceShapeKind;
  polygon: Polygon;
};

export type CutStrategy = 'straight-chord' | 'polyline';

export type BoundaryPoint = {
  pt: Pt;
  edgeIdx: number;
  edgeT: number;
};

export type Cut = {
  strategy: CutStrategy;
  bp1: BoundaryPoint;
  bp2: BoundaryPoint;
  cutPath: Pt[];
};

export type Piece = {
  /** Polygon in the reference shape's local (centered-on-origin) coords. */
  polygon: Polygon;
  /** Display rotation (degrees, CCW positive). */
  displayRotation: number;
  /** Where the piece's centroid is translated to inside the option viewBox. */
  displayCenter: Pt;
};

export type MatchDistractorKind =
  | 'correct'
  | 'proportion-mismatch'
  | 'incompatible-cut'
  | 'scale-error'
  | 'overlaps-gaps';

export type Option = {
  pieces: [Piece, Piece];
  kind: MatchDistractorKind;
  explanation: string;
};

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type MatchingPuzzle = {
  reference: ReferenceShape;
  options: Option[];
  correctIndex: number;
  difficulty: Difficulty;
};
