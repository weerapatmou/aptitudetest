import type { Piece, Polygon } from '../types';
import { maxRadius } from '../../matching-parts-puzzle/generate/layout';
import type { Rng } from '../../rotation-puzzle/generate/rng';

export { maxRadius };

// Exclude near-zero rotations so a piece never sits at its "true" orientation.
const ROT_MIN = 20;
const ROT_MAX = 340;

/** Give a piece polygon a random display rotation, centered in its own card. */
export function layoutPiece(polygon: Polygon, rng: Rng): Piece {
  return {
    polygon,
    displayRotation: rng.int(ROT_MIN, ROT_MAX),
    displayCenter: { x: 0, y: 0 },
  };
}

/**
 * Square viewBox that fits a single piece at any rotation around its centroid
 * (which renders centered on the origin), plus padding.
 */
export function choiceViewBox(
  piece: Piece,
  padding = 14,
): { x: number; y: number; w: number; h: number } {
  const r = maxRadius(piece.polygon) + padding;
  return { x: -r, y: -r, w: 2 * r, h: 2 * r };
}
