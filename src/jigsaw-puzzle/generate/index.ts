import type { JigsawPiece, JigsawPuzzle, AssembledOption } from '../types';
import { DISTRACTOR_EXPLANATIONS } from '../types';
import { makeRng } from '../../rotation-puzzle/generate/rng';
import { centroid } from '../../rotation-puzzle/generate/geometry';
import { sliceTargetWithRetry } from '../../polygon-assembly-puzzle/generate/slice';
import { pickTarget } from '../../polygon-assembly-puzzle/generate/target';
import { layoutPieces } from './layout';
import { buildJigsawDistractors } from './distractors';

const DISTRACTOR_COUNT = 4;

function makeCorrectPieces(piecesInTargetFrame: ReturnType<typeof sliceTargetWithRetry>): JigsawPiece[] {
  return piecesInTargetFrame.map((poly) => {
    const c = centroid(poly);
    const localPoly = poly.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
    return {
      polygon: localPoly,
      displayCenter: { x: 0, y: 0 },
      displayRotation: 0,
      displayScale: 1,
      assembledCenter: { x: c.x, y: c.y },
      assembledRotation: 0,
      assembledFlipped: false,
      defective: false,
    };
  });
}

export function generateJigsawPuzzle(seed?: number, pieceCount: number | 'mix' = 3): JigsawPuzzle {
  const rng = makeRng(seed);
  const target = pickTarget(rng);
  const actualCount = pieceCount === 'mix' ? 3 + Math.floor(rng.range(0, 3)) : pieceCount;
  const targetPieces = sliceTargetWithRetry(target.polygon, actualCount, rng);
  const correctPieces = makeCorrectPieces(targetPieces);

  layoutPieces(correctPieces, rng);

  const correctOption: AssembledOption = {
    pieces: correctPieces,
    isCorrect: true,
    distractorKind: 'correct',
    explanation: DISTRACTOR_EXPLANATIONS['correct'],
  };

  const baseSeed = (seed ?? 0) + 10000;

  const distractorPieceArrays = buildJigsawDistractors(
    correctPieces,
    target.polygon,
    baseSeed,
    DISTRACTOR_COUNT,
  );

  const distractorOptions: AssembledOption[] = distractorPieceArrays.map((pieces) => ({
    pieces,
    isCorrect: false,
    distractorKind: 'wrong-cut' as const,
    explanation: DISTRACTOR_EXPLANATIONS['wrong-cut'],
  }));

  const allOptions = [correctOption, ...distractorOptions];
  const shuffled = rng.shuffle(allOptions);
  const correctIndex = shuffled.indexOf(correctOption);

  return {
    questionPieces: correctPieces,
    options: shuffled,
    correctIndex,
    pieceCount: actualCount,
    targetKind: target.kind,
    targetPolygon: target.polygon,
  };
}

export function signatureOf(puzzle: JigsawPuzzle): string {
  return `jigsaw:${puzzle.targetKind}:${puzzle.pieceCount}`;
}
