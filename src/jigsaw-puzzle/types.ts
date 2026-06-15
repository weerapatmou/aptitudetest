import type { Pt, Polygon } from '../rotation-puzzle/types';

export type { Pt, Polygon };

export type JigsawPiece = {
  polygon: Polygon;
  displayCenter: Pt;
  displayRotation: number;
  displayScale: number;
  assembledCenter: Pt;
  assembledRotation: number;
  assembledFlipped: boolean;
  defective: boolean;
};

export type DistractorKind = 'wrong-cut';

export type AssembledOption = {
  pieces: JigsawPiece[];
  isCorrect: boolean;
  distractorKind: DistractorKind | 'correct';
  explanation: string;
};

export type JigsawPuzzle = {
  questionPieces: JigsawPiece[];
  options: AssembledOption[];
  correctIndex: number;
  pieceCount: number;
  targetKind: string;
  targetPolygon: Polygon;
};

export const DISTRACTOR_EXPLANATIONS: Record<DistractorKind | 'correct', string> = {
  correct: '✓ Correct: All pieces fit together perfectly with no gaps',
  'wrong-cut': '✗ Wrong cut — the join lines do not match the pieces',
};
