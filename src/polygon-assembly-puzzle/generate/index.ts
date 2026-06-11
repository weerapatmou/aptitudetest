import type { AssemblyOption, AssemblyPuzzle, Defect, Difficulty, Mode, ScatteredPiece } from '../types';
import { DEFECT_LABELS } from '../types';
import { makeRng } from '../../rotation-puzzle/generate/rng';
import { pickTarget } from './target';
import { makeCorrectPieces, sliceTargetWithRetry } from './slice';
import { scatterPieces } from './scatter';
import {
  buildDefective,
  pickDistractorKinds,
  rankedAllIndices,
  rankedTopHalfIndices,
} from './distractors';

const PIECE_COUNTS: Record<Difficulty, number> = {
  easy: 3,
  medium: 4,
  hard: 5,
  expert: 6,
};

function cloneScattered(pieces: ScatteredPiece[]): ScatteredPiece[] {
  return pieces.map((p) => ({
    polygon: p.polygon.map((pt) => ({ x: pt.x, y: pt.y })),
    scatterCenter: { x: p.scatterCenter.x, y: p.scatterCenter.y },
    scatterRotation: p.scatterRotation,
    scatterFlipped: p.scatterFlipped,
    scatterScale: p.scatterScale,
    assembledCenter: { x: p.assembledCenter.x, y: p.assembledCenter.y },
    assembledRotation: p.assembledRotation,
    assembledFlipped: p.assembledFlipped,
    defective: p.defective,
  }));
}

export function generateAssemblyPuzzle(
  difficulty: Difficulty,
  mode: Mode,
  seed?: number,
): AssemblyPuzzle {
  const rng = makeRng(seed);
  const N = PIECE_COUNTS[difficulty];
  const target = pickTarget(rng);
  const targetPieces = sliceTargetWithRetry(target.polygon, N, rng);
  const correctMaster = makeCorrectPieces(targetPieces);

  // Build the correct option: scatter a fresh clone.
  const correctClone = cloneScattered(correctMaster);
  scatterPieces(correctClone, rng);
  const correctOption: AssemblyOption = {
    pieces: correctClone,
    defect: 'correct',
    explanation: DEFECT_LABELS['correct'],
  };

  // Build 3 distractors with distinct defect kinds AND distinct target piece indices.
  const defects = pickDistractorKinds(mode, difficulty, rng);
  const topHalf = rankedTopHalfIndices(correctMaster, rng);
  // If top-half doesn't have enough unique indices for our distractors, use the full pool.
  const pieceIdxPool = topHalf.length >= defects.length
    ? topHalf
    : rankedAllIndices(correctMaster, rng);
  const distractorOptions: AssemblyOption[] = defects.map((defect, k) => {
    const pieceIdx = pieceIdxPool[k % pieceIdxPool.length]!;
    const altered = buildDefective(correctMaster, defect, pieceIdx, rng);
    scatterPieces(altered, rng);
    return {
      pieces: altered,
      defect,
      explanation: DEFECT_LABELS[defect],
    };
  });

  const allOptions = [correctOption, ...distractorOptions];
  const shuffled = rng.shuffle(allOptions);
  const correctIndex = shuffled.indexOf(correctOption);

  return {
    target: { polygon: target.polygon },
    options: shuffled,
    correctIndex,
    difficulty,
    mode,
    pieceCount: N,
    targetKind: target.kind,
  };
}

/**
 * Compact, repeat-detection signature for a puzzle. Two puzzles with the same
 * target silhouette + piece count + mode look "the same" to the practiser, so
 * the anti-repeat picker treats them as equivalent.
 */
export function signatureOf(puzzle: AssemblyPuzzle): string {
  return `${puzzle.targetKind}:${puzzle.pieceCount}:${puzzle.mode}`;
}

export type { Defect };
