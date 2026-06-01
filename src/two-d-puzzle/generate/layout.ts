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
 * Half-extent of the shared, origin-centered square frame for a question. It is
 * anchored to the target square and the CORRECT pieces only — never the
 * distractors — so an over-scaled wrong piece can't inflate the frame and shrink
 * the reference. Fits the main shape and any correct piece at any rotation
 * (pieces render centroid-shifted to the origin, so `maxRadius` is a rotation-safe
 * bound), plus padding so nothing touches the card border.
 */
export function frameHalfExtent(completed: Polygon, correctPieces: Polygon[], padding = 14): number {
  const b = polygonBounds(completed);
  let half = Math.max(b.maxX - b.minX, b.maxY - b.minY) / 2;
  for (const p of correctPieces) half = Math.max(half, maxRadius(p));
  return half + padding;
}

/** Build the shared viewBox string from a half-extent. */
export function viewBoxFromHalf(half: number): string {
  return `${-half} ${-half} ${2 * half} ${2 * half}`;
}
