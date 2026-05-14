import type { Piece, Polygon } from '../types';
import { centroid, rotatePoint } from '../../rotation-puzzle/generate/geometry';
import type { Rng } from '../../rotation-puzzle/generate/rng';

const SLOT_X = 78;          // horizontal offset of each slot from option center
const ROT_MIN = 25;          // degrees — exclude near-zero rotations so pieces look "scrambled"
const ROT_MAX = 335;

/**
 * Take two raw piece polygons (in reference-shape local coords) and produce
 * display-ready `Piece` records: each piece gets a random rotation and a slot
 * inside the option viewBox.
 */
export function layoutPieces(
  pieceA: Polygon,
  pieceB: Polygon,
  rng: Rng,
): [Piece, Piece] {
  return [
    {
      polygon: pieceA,
      displayRotation: rng.int(ROT_MIN, ROT_MAX),
      displayCenter: { x: -SLOT_X, y: 0 },
    },
    {
      polygon: pieceB,
      displayRotation: rng.int(ROT_MIN, ROT_MAX),
      displayCenter: { x: SLOT_X, y: 0 },
    },
  ];
}

/**
 * Maximum distance from a polygon's centroid to any of its vertices — the
 * radius of the bounding circle around the centroid.
 */
export function maxRadius(poly: Polygon): number {
  const c = centroid(poly);
  let r = 0;
  for (const p of poly) {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > r) r = d;
  }
  return r;
}

/** Scale a polygon uniformly about its centroid by factor `s`. Used by the scale-error distractor. */
export function scalePolygonAboutCentroid(poly: Polygon, s: number): Polygon {
  const c = centroid(poly);
  return poly.map((p) => ({
    x: c.x + (p.x - c.x) * s,
    y: c.y + (p.y - c.y) * s,
  }));
}

/**
 * Compute a viewBox that fits both pieces in both their scrambled (displayCenter +
 * displayRotation) and snapped (origin, zero rotation) poses, plus padding.
 *
 * The bounding circle of a piece (radius = maxRadius around its centroid) is used
 * as a conservative envelope — any rotation around displayCenter keeps the piece
 * inside this circle, and the framer-motion tween from scrambled → snapped passes
 * through positions on the segment between the two centers, all of which are also
 * inside the union of the two bounding circles.
 */
export function computeOptionBounds(
  pieces: [Piece, Piece],
  padding = 10,
): { vbX: number; vbY: number; vbW: number; vbH: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const piece of pieces) {
    const r = maxRadius(piece.polygon);
    // Scrambled-pose bounds: circle of radius r around (displayCenter.x, displayCenter.y)
    expand(piece.displayCenter.x - r, piece.displayCenter.y - r);
    expand(piece.displayCenter.x + r, piece.displayCenter.y + r);
    // Snapped-pose bounds: circle of radius r around (0, 0) — but use the actual
    // polygon bbox there (tighter, since orientation is fixed at snap pose).
    const pieceMinX = Math.min(...piece.polygon.map((p) => p.x));
    const pieceMinY = Math.min(...piece.polygon.map((p) => p.y));
    const pieceMaxX = Math.max(...piece.polygon.map((p) => p.x));
    const pieceMaxY = Math.max(...piece.polygon.map((p) => p.y));
    expand(pieceMinX, pieceMinY);
    expand(pieceMaxX, pieceMaxY);
  }
  return {
    vbX: minX - padding,
    vbY: minY - padding,
    vbW: (maxX - minX) + 2 * padding,
    vbH: (maxY - minY) + 2 * padding,
  };

  function expand(x: number, y: number) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
}

/** Used by tests: returns the screen-space bbox of a piece in its scrambled pose. */
export function piecePoseBounds(piece: Piece): { minX: number; minY: number; maxX: number; maxY: number } {
  const c = centroid(piece.polygon);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of piece.polygon) {
    const local = { x: p.x - c.x, y: p.y - c.y };
    const rotated = rotatePoint(local, piece.displayRotation);
    const x = rotated.x + piece.displayCenter.x;
    const y = rotated.y + piece.displayCenter.y;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}
