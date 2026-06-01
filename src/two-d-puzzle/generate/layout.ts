import type { Piece, Polygon } from '../types';
import { maxRadius } from '../../matching-parts-puzzle/generate/layout';
import { polygonBounds } from '../../rotation-puzzle/generate/geometry';
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
 * One origin-centered square viewBox shared by the main shape and every choice
 * piece of a question, so they all render at the SAME scale (a piece that fills
 * the gap looks gap-sized). The half-extent fits the main shape AND any piece at
 * any rotation (pieces render centroid-shifted to the origin, so `maxRadius` is
 * a rotation-safe bound), plus padding so nothing touches the card border.
 */
export function frameViewBox(completed: Polygon, pieces: Piece[], padding = 14): string {
  const b = polygonBounds(completed);
  let half = Math.max(b.maxX - b.minX, b.maxY - b.minY) / 2;
  for (const pc of pieces) half = Math.max(half, maxRadius(pc.polygon));
  const h = half + padding;
  return `${-h} ${-h} ${2 * h} ${2 * h}`;
}
