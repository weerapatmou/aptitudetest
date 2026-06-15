export type ShapeDef = {
  kind: string;
  points: [number, number][];
};

export type SimpleShape = {
  label: 'A' | 'B' | 'C' | 'D' | 'E';
  def: ShapeDef;
};

export type Segment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type ComplexFigure = {
  segments: Segment[];
  hiddenSegmentCount: number;
  viewBox: string;
};

export type HiddenQuestion = {
  number: number;
  complexFigure: ComplexFigure;
  correctLabel: 'A' | 'B' | 'C' | 'D' | 'E';
  correctIndex: number;
};

export type HiddenFiguresSession = {
  simpleShapes: SimpleShape[];
  questions: HiddenQuestion[];
  seed: number;
};

export type Settings = {
  questionCount: number;
};
