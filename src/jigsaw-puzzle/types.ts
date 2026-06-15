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
  correct: '✓ ถูกต้อง: ชิ้นส่วนทั้งหมดประกอบกันได้พอดี ไม่มีช่องว่าง',
  'wrong-cut': '✗ แนวตัดต่างกัน — เส้นต่อไม่ตรงกับชิ้นส่วน',
};
