export type Pt = { x: number; y: number };

export type Polygon = Pt[];

export type BoundingBox = { minX: number; minY: number; maxX: number; maxY: number };

export type InternalElementKind =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'rightTriangle'
  | 'pentagon'
  | 'hexagon'
  | 'star5'
  | 'diamond'
  | 'arrow'
  | 'crescent'
  | 'lShape'
  | 'trapezoid'
  | 'parallelogram'
  | 'plus'
  | 'teardrop'
  | 'semicircle';

export const ALL_INTERNAL_KINDS: InternalElementKind[] = [
  'circle', 'square', 'triangle', 'rightTriangle',
  'pentagon', 'hexagon', 'star5', 'diamond',
  'arrow', 'crescent', 'lShape', 'trapezoid',
  'parallelogram', 'plus', 'teardrop', 'semicircle',
];

export const CHIRAL_KINDS: InternalElementKind[] = [
  'arrow', 'crescent', 'lShape', 'parallelogram', 'rightTriangle',
];

export type FillStyle = 'solid' | 'hatched' | 'dotted' | 'none';

export type InternalElement = {
  kind: InternalElementKind;
  center: Pt;
  size: number;
  filled: boolean;
  fillStyle?: FillStyle;
  rotation: number;
};

export type OuterShape =
  | { kind: 'irregularPolygon'; vertices: Pt[] }
  | { kind: 'notchedRectangle'; vertices: Pt[] }
  | { kind: 'arrowhead'; vertices: Pt[] }
  | { kind: 'lShape'; vertices: Pt[] }
  | { kind: 'asymmetricEllipse'; rx: number; ry: number; flatSide?: 'top' | 'left' }
  | { kind: 'irregularHexagon'; vertices: Pt[] }
  | { kind: 'kite'; vertices: Pt[] }
  | { kind: 'chevron'; vertices: Pt[] }
  | { kind: 'teardrop'; vertices: Pt[] }
  | { kind: 'gear'; vertices: Pt[] };

export type Figure = {
  outer: OuterShape;
  internals: InternalElement[];
};

export type Transform = {
  rotate: number;
  flipX: boolean;
};

export type DistractorKind =
  | 'correct'
  | 'mirror'
  | 'swap'
  | 'attribute'
  | 'shift'
  | 'inner-rotated'
  | 'kind-changed'
  | 'fillstyle-changed'
  | 'missing'
  | 'extra'
  | 'resized';

export type Candidate = {
  figure: Figure;
  transform: Transform;
  kind: DistractorKind;
  explanation: string;
};

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type Puzzle = {
  original: Figure;
  candidates: Candidate[];
  correctIndex: number;
  rotation: number;
  difficulty: Difficulty;
};
