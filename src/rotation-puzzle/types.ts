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
  | { kind: 'gear'; vertices: Pt[] }
  | { kind: 'pinwheel'; vertices: Pt[] }
  | { kind: 'combBar'; vertices: Pt[] }
  | { kind: 'unevenStar'; vertices: Pt[] }
  | { kind: 'pennant'; vertices: Pt[] }
  // Arrow family
  | { kind: 'arrowFat'; vertices: Pt[] }
  | { kind: 'arrowThin'; vertices: Pt[] }
  | { kind: 'arrowBent'; vertices: Pt[] }
  | { kind: 'arrowDouble'; vertices: Pt[] }
  | { kind: 'notchedArrow'; vertices: Pt[] }
  // Star family
  | { kind: 'starFour'; vertices: Pt[] }
  | { kind: 'starSix'; vertices: Pt[] }
  | { kind: 'starSeven'; vertices: Pt[] }
  | { kind: 'starEight'; vertices: Pt[] }
  // Letter / symbol shapes
  | { kind: 'tShape'; vertices: Pt[] }
  | { kind: 'zShape'; vertices: Pt[] }
  | { kind: 'fShape'; vertices: Pt[] }
  | { kind: 'crossShape'; vertices: Pt[] }
  | { kind: 'boltShape'; vertices: Pt[] }
  | { kind: 'lShapeWide'; vertices: Pt[] }
  // Organic / natural shapes
  | { kind: 'leafShape'; vertices: Pt[] }
  | { kind: 'crescentShape'; vertices: Pt[] }
  | { kind: 'cloudShape'; vertices: Pt[] }
  | { kind: 'dropletLong'; vertices: Pt[] }
  | { kind: 'dropletFat'; vertices: Pt[] }
  | { kind: 'blobAsym'; vertices: Pt[] }
  // Geometric variants
  | { kind: 'trapezoidRight'; vertices: Pt[] }
  | { kind: 'trapezoidSkew'; vertices: Pt[] }
  | { kind: 'parallelogramAsym'; vertices: Pt[] }
  | { kind: 'shieldShape'; vertices: Pt[] }
  | { kind: 'homeShape'; vertices: Pt[] }
  | { kind: 'diamondAsym'; vertices: Pt[] }
  | { kind: 'rectangleWave'; vertices: Pt[] }
  | { kind: 'rectangleStep'; vertices: Pt[] }
  // Gear / mechanical
  | { kind: 'gearFew'; vertices: Pt[] }
  | { kind: 'gearMany'; vertices: Pt[] }
  | { kind: 'sawblade'; vertices: Pt[] }
  | { kind: 'ratchet'; vertices: Pt[] }
  // Extended polygon variants
  | { kind: 'irregularOctagon'; vertices: Pt[] }
  | { kind: 'concavePolygon'; vertices: Pt[] };

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
