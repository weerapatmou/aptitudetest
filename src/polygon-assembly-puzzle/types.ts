import type { Pt, Polygon } from '../rotation-puzzle/types';

export type { Pt, Polygon };

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type Mode = 'mirror' | 'strict';

export type Defect =
  | 'correct'
  | 'mirror-trap'
  | 'scale'
  | 'edge-length'
  | 'angle'
  | 'substitution'
  | 'rotation-trap';

export type ScatteredPiece = {
  polygon: Polygon;
  scatterCenter: Pt;
  scatterRotation: number;
  scatterFlipped: boolean;
  scatterScale: number;
  assembledCenter: Pt;
  assembledRotation: number;
  assembledFlipped: boolean;
  defective: boolean;
};

export type AssemblyOption = {
  pieces: ScatteredPiece[];
  defect: Defect;
  explanation: string;
};

export type AssemblyPuzzle = {
  target: { polygon: Polygon };
  options: AssemblyOption[];
  correctIndex: number;
  difficulty: Difficulty;
  mode: Mode;
  pieceCount: number;
  targetKind: string;
};

export const DEFECT_LABELS: Record<Defect, string> = {
  'correct': '✓ Correct: Perfect fit.',
  'scale': '✗ Scale mismatch — one piece is the wrong size.',
  'angle': '✗ Angle altered — gap/overlap at vertex.',
  'edge-length': '✗ Joining edge does not match.',
  'substitution': '✗ One piece has the wrong shape.',
  'mirror-trap': '✗ Mirror required — strict 2D mode forbids flipping.',
  'rotation-trap': '✗ One piece is rotated — it no longer seats in its slot.',
};
