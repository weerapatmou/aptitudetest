import type { JigsawPiece, Polygon } from '../types';
import { makeRng } from '../../rotation-puzzle/generate/rng';
import { centroid } from '../../rotation-puzzle/generate/geometry';
import { sliceTargetWithRetry } from '../../polygon-assembly-puzzle/generate/slice';

/**
 * Build `count` distractor JigsawPiece arrays, each a different valid cut of
 * the same targetPolygon. All produce clean assembled shapes (no overlaps/protrusions)
 * that share the same outer boundary as the correct answer — only seam lines differ.
 */
export function buildJigsawDistractors(
  correctPieces: JigsawPiece[],
  targetPolygon: Polygon,
  baseSeed: number,
  count: number,
): JigsawPiece[][] {
  return Array.from({ length: count }, (_, k) => {
    const newRng = makeRng(baseSeed + k * 1000 + 1);
    const N = correctPieces.length;
    const newPieces = sliceTargetWithRetry(targetPolygon, N, newRng);
    return newPieces.map((poly) => {
      const c = centroid(poly);
      const local = poly.map(p => ({ x: p.x - c.x, y: p.y - c.y }));
      return {
        polygon: local,
        displayCenter: { x: 0, y: 0 },
        displayRotation: 0,
        displayScale: 1,
        assembledCenter: c,
        assembledRotation: 0,
        assembledFlipped: false,
        defective: true,
      };
    });
  });
}
