import type { Block, Pt, Vec3 } from '../types';

/** Screen size of one grid unit. */
export const U = 28;
const A = (U * Math.sqrt(3)) / 2; // U * cos30
const B = U / 2; // U * sin30

/**
 * Classic 2:1 isometric projection. The eye sits toward (+x,+y,+z): the +z (top),
 * +x and +y faces are the camera-facing ones. The view direction (1,1,1) maps to
 * the screen origin, so cells differing by a multiple of (1,1,1) share a footprint
 * — which makes occlusion testing exact (see fairness.ts).
 */
export function project(p: Vec3): Pt {
  return { x: (p.x - p.y) * A, y: (p.x + p.y) * B - p.z * U };
}

function corner(o: Vec3, dx: number, dy: number, dz: number): Pt {
  return project({ x: o.x + dx, y: o.y + dy, z: o.z + dz });
}

/** The three camera-facing faces of a box, projected, as [top, right(+x), left(+y)]. */
export function boxVisibleFaces(block: Block): { top: Pt[]; right: Pt[]; left: Pt[] } {
  const { origin: o, size: s } = block;
  return {
    top: [
      corner(o, 0, 0, s.z),
      corner(o, s.x, 0, s.z),
      corner(o, s.x, s.y, s.z),
      corner(o, 0, s.y, s.z),
    ],
    right: [
      corner(o, s.x, 0, 0),
      corner(o, s.x, s.y, 0),
      corner(o, s.x, s.y, s.z),
      corner(o, s.x, 0, s.z),
    ],
    left: [
      corner(o, 0, s.y, 0),
      corner(o, s.x, s.y, 0),
      corner(o, s.x, s.y, s.z),
      corner(o, 0, s.y, s.z),
    ],
  };
}

/**
 * 2D convex hull (monotone chain) with collinear points dropped. Under this affine
 * projection the hull of a box's eight projected corners is exactly the box's visible
 * silhouette — used to draw a bold outline so same-colour blocks never visually merge.
 */
export function convexHull(points: Pt[]): Pt[] {
  const pts = points
    .slice()
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  if (pts.length <= 2) return pts;
  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const build = (src: Pt[]): Pt[] => {
    const h: Pt[] = [];
    for (const p of src) {
      while (h.length >= 2 && cross(h[h.length - 2]!, h[h.length - 1]!, p) <= 0) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  const lower = build(pts);
  const upper = build(pts.slice().reverse());
  return lower.concat(upper);
}

/** All eight projected corners of a box. */
export function boxCorners(block: Block): Pt[] {
  const { origin: o, size: s } = block;
  const pts: Pt[] = [];
  for (const dx of [0, s.x])
    for (const dy of [0, s.y]) for (const dz of [0, s.z]) pts.push(corner(o, dx, dy, dz));
  return pts;
}

/**
 * Internal unit-cell grid lines across one visible face, projected — drawn thin so
 * a beam reads as a row of unit cubes (isometric "pixel-art" depth cues). Excludes
 * the outer border (covered by the bold block silhouette).
 */
export function faceGridLines(block: Block, face: 'top' | 'left' | 'right'): [Pt, Pt][] {
  const { origin: o, size: s } = block;
  const P = (x: number, y: number, z: number) => project({ x, y, z });
  const segs: [Pt, Pt][] = [];
  if (face === 'top') {
    const z = o.z + s.z;
    for (let i = 1; i < s.x; i++) segs.push([P(o.x + i, o.y, z), P(o.x + i, o.y + s.y, z)]);
    for (let j = 1; j < s.y; j++) segs.push([P(o.x, o.y + j, z), P(o.x + s.x, o.y + j, z)]);
  } else if (face === 'right') {
    const x = o.x + s.x;
    for (let j = 1; j < s.y; j++) segs.push([P(x, o.y + j, o.z), P(x, o.y + j, o.z + s.z)]);
    for (let k = 1; k < s.z; k++) segs.push([P(x, o.y, o.z + k), P(x, o.y + s.y, o.z + k)]);
  } else {
    const y = o.y + s.y;
    for (let i = 1; i < s.x; i++) segs.push([P(o.x + i, y, o.z), P(o.x + i, y, o.z + s.z)]);
    for (let k = 1; k < s.z; k++) segs.push([P(o.x, y, o.z + k), P(o.x + s.x, y, o.z + k)]);
  }
  return segs;
}

/** A faint isometric floor grid at z=0 spanning the footprint (+1 margin) to anchor depth. */
export function floorGrid(blocks: Block[]): [Pt, Pt][] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of blocks) {
    minX = Math.min(minX, b.origin.x);
    minY = Math.min(minY, b.origin.y);
    maxX = Math.max(maxX, b.origin.x + b.size.x);
    maxY = Math.max(maxY, b.origin.y + b.size.y);
  }
  minX -= 1;
  minY -= 1;
  maxX += 1;
  maxY += 1;
  const P = (x: number, y: number) => project({ x, y, z: 0 });
  const segs: [Pt, Pt][] = [];
  for (let x = minX; x <= maxX; x++) segs.push([P(x, minY), P(x, maxY)]);
  for (let y = minY; y <= maxY; y++) segs.push([P(minX, y), P(maxX, y)]);
  return segs;
}

/** Centroid of the projected top face — where the block's letter label sits. */
export function topFaceCentroid(block: Block): Pt {
  const t = boxVisibleFaces(block).top;
  const sum = t.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / t.length, y: sum.y / t.length };
}

/** Projected centre of a single unit cell's top face — a robust label anchor. */
export function cellTopCentroid(cell: Vec3): Pt {
  return project({ x: cell.x + 0.5, y: cell.y + 0.5, z: cell.z + 1 });
}

/** A padded SVG viewBox string covering every box corner (with room for the floor grid). */
export function computeViewBox(blocks: Block[], pad = U * 1.15): string {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of blocks) {
    for (const p of boxCorners(b)) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  const x = minX - pad;
  const y = minY - pad;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  return `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`;
}
