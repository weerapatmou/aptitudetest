import type { Angle, Face } from '../types';
import { cross, FACE_CENTER, FACES, glyphUpFor, type Vec3 } from './cube';

// 2:1 dimetric isometric projection, matching cube-counting-puzzle/iso.ts.
export const TW = 24; // tile half-width  (per x or y)
export const TH = 12; // tile half-height (per x or y)
export const CH = 24; // cube height (per z)

export type Pt = { x: number; y: number };

/** Project a lattice vector/point. x → lower-right, y → lower-left, z → up. */
export function projVec(d: Vec3): Pt {
  return { x: (d.x - d.y) * TW, y: (d.x + d.y) * TH - d.z * CH };
}
export function project(x: number, y: number, z: number): Pt {
  return projVec({ x, y, z });
}

/** The three camera-facing faces of the unit cube spanning [0,1]³. */
export const CUBE_FACES: Record<Face, Pt[]> = {
  top: [project(0, 0, 1), project(1, 0, 1), project(1, 1, 1), project(0, 1, 1)],
  right: [project(1, 0, 0), project(1, 1, 0), project(1, 1, 1), project(1, 0, 1)],
  left: [project(0, 1, 0), project(1, 1, 0), project(1, 1, 1), project(0, 1, 1)],
};

/** The three hidden back edges meeting at the occluded corner (0,0,0). */
export const HIDDEN_EDGES: Array<[Pt, Pt]> = [
  [project(0, 0, 0), project(1, 0, 0)],
  [project(0, 0, 0), project(0, 1, 0)],
  [project(0, 0, 0), project(0, 0, 1)],
];

/** Constant viewBox: the cube is a fixed size, so every figure shares one frame. */
export const VIEWBOX = '-36 -38 72 74';

/** Fraction of a face edge the mark glyph spans (half-extent). */
const MARK_SCALE = 0.34;

/**
 * Build a mapper from glyph-local coords (gx → right, gy → up, both in [-1,1])
 * to screen space, oriented for the given face + in-plane angle. Linear in the
 * lattice, so the parallelogram's foreshortening is handled automatically.
 */
export function markMapper(face: Face, angle: Angle): (gx: number, gy: number) => Pt {
  const f = FACES.find((d) => d.face === face)!;
  const up = glyphUpFor(face, angle);
  const right = cross(f.normal, up); // in-plane, perpendicular to up
  const C = projVec(FACE_CENTER[face]);
  const PU = projVec(up);
  const PV = projVec(right);
  return (gx, gy) => ({
    x: C.x + MARK_SCALE * (gx * PV.x + gy * PU.x),
    y: C.y + MARK_SCALE * (gx * PV.y + gy * PU.y),
  });
}

/**
 * The mark glyph as polylines in local coords: an asymmetric cross — a vertical
 * bar with an arrowhead at the top so 90° rotations are visually distinct.
 */
export const MARK_STROKES: Array<Array<[number, number]>> = [
  [
    [0, -0.78],
    [0, 0.92],
  ], // vertical bar
  [
    [-0.7, 0.06],
    [0.7, 0.06],
  ], // horizontal bar
  [
    [-0.26, 0.62],
    [0, 0.92],
    [0.26, 0.62],
  ], // arrowhead at top
];

export function polygonPath(pts: Pt[]): string {
  if (pts.length === 0) return '';
  let d = `M ${pts[0]!.x.toFixed(2)} ${pts[0]!.y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i]!.x.toFixed(2)} ${pts[i]!.y.toFixed(2)}`;
  return d + ' Z';
}
