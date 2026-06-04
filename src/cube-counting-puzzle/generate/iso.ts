import type { Arrangement, Cell, Pt } from '../types';

// 2:1 dimetric isometric projection. Screen px per lattice unit.
export const TW = 24; // tile half-width  (horizontal step per x or y)
export const TH = 12; // tile half-height (vertical step per x or y)
export const CH = 24; // cube height in screen px (per z)

/**
 * Project a lattice CORNER (X, Y, Z) to screen space.
 * x → lower-right, y → lower-left, z → up. Screen y grows downward.
 */
export function project(X: number, Y: number, Z: number): Pt {
  return { x: (X - Y) * TW, y: (X + Y) * TH - Z * CH };
}

export type CubeFaces = { top: Pt[]; left: Pt[]; right: Pt[] };

/** The three camera-facing faces of the cube occupying `cell`. */
export function cubeFaces(cell: Cell): CubeFaces {
  const { x, y, z } = cell;
  const p = (X: number, Y: number, Z: number) => project(x + X, y + Y, z + Z);
  return {
    // z = top plane, normal +z
    top: [p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)],
    // x = right plane, normal +x (lower-right)
    right: [p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)],
    // y = left plane, normal +y (lower-left)
    left: [p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(0, 1, 1)],
  };
}

export function cellKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export function occupancySet(cells: Cell[]): Set<string> {
  const s = new Set<string>();
  for (const c of cells) s.add(cellKey(c.x, c.y, c.z));
  return s;
}

/** Which of the three camera-facing faces are exposed (neighbor cell empty). */
export function faceVisibility(
  cell: Cell,
  occ: Set<string>,
): { top: boolean; right: boolean; left: boolean } {
  const { x, y, z } = cell;
  return {
    top: !occ.has(cellKey(x, y, z + 1)),
    right: !occ.has(cellKey(x + 1, y, z)),
    left: !occ.has(cellKey(x, y + 1, z)),
  };
}

/**
 * A cube is visible when at least one camera-facing neighbor (+x, +y, +z) is
 * empty. Cubes with all three filled are fully enclosed behind other cubes —
 * the hidden support cubes a solver tends to forget. Exact for convex stacks.
 */
export function isVisible(cell: Cell, occ: Set<string>): boolean {
  const v = faceVisibility(cell, occ);
  return v.top || v.right || v.left;
}

/**
 * Painter's-algorithm order: back-to-front so nearer cubes overpaint farther
 * ones. Nearer = larger (x + y + z); tie-break by (x + y) then z ascending.
 */
export function paintOrder(cells: Cell[]): Cell[] {
  return cells.slice().sort((a, b) => {
    const da = a.x + a.y + a.z;
    const db = b.x + b.y + b.z;
    if (da !== db) return da - db;
    const sa = a.x + a.y;
    const sb = b.x + b.y;
    if (sa !== sb) return sa - sb;
    return a.z - b.z;
  });
}

/**
 * The ground baseplate: the footprint rectangle at z=0, expanded slightly so a
 * thin rim peeks out from under the stack. Drawn faintly behind the cubes as a
 * depth anchor so columns of different heights don't read as floating.
 */
export function floorPolygon(cols: number, rows: number, expand = 0.18): Pt[] {
  const e = expand;
  return [
    project(-e, -e, 0),
    project(cols + e, -e, 0),
    project(cols + e, rows + e, 0),
    project(-e, rows + e, 0),
  ];
}

/** Project every drawn corner (cubes + floor) to compute a padded viewBox string. */
export function computeViewBox(
  cells: Cell[],
  footprint?: { cols: number; rows: number },
  pad = 14,
): string {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const include = (pt: Pt) => {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  };
  for (const c of cells) {
    const { top, left, right } = cubeFaces(c);
    for (const pt of [...top, ...left, ...right]) include(pt);
  }
  if (footprint) for (const pt of floorPolygon(footprint.cols, footprint.rows)) include(pt);
  if (!Number.isFinite(minX)) return '-50 -50 100 100';
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  return `${minX - pad} ${minY - pad} ${w} ${h}`;
}

export type SceneCube = {
  cell: Cell;
  faces: CubeFaces;
  show: { top: boolean; right: boolean; left: boolean };
};

/** Build a ready-to-render scene: cubes in paint order with culled faces. */
export function buildScene(arrangement: Arrangement): {
  cubes: SceneCube[];
  floor: Pt[];
  viewBox: string;
} {
  const occ = occupancySet(arrangement.cells);
  const ordered = paintOrder(arrangement.cells);
  const cubes: SceneCube[] = ordered.map((cell) => ({
    cell,
    faces: cubeFaces(cell),
    show: faceVisibility(cell, occ),
  }));
  const footprint = { cols: arrangement.cols, rows: arrangement.rows };
  return {
    cubes,
    floor: floorPolygon(arrangement.cols, arrangement.rows),
    viewBox: computeViewBox(arrangement.cells, footprint),
  };
}
