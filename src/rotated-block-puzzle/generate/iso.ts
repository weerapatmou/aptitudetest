import type { Cell, Polycube } from '../types';

export type Pt = { x: number; y: number };
export type FaceKind = 'top' | 'right' | 'left';

export type Facet = {
  /** Projected, centered 2D polygon (4 points). */
  points: Pt[];
  kind: FaceKind;
};

const COS30 = Math.cos(Math.PI / 6); // ≈ 0.866
const SIN30 = 0.5;
const S = 10; // projected edge length of a unit cube

/** Project a 3D lattice point to 2D isometric screen space (y grows downward). */
function project(p: Cell): Pt {
  return {
    x: (p.x - p.y) * COS30 * S,
    y: ((p.x + p.y) * SIN30 - p.z) * S,
  };
}

function key(c: Cell): string {
  return `${c.x},${c.y},${c.z}`;
}

// The three camera-facing faces (view vector (1,1,1)), with their outward
// neighbour offset and the four lattice corners (relative to the cell origin).
const FACE_DEFS: Array<{ kind: FaceKind; neighbour: Cell; corners: Cell[] }> = [
  {
    kind: 'top', // +z
    neighbour: { x: 0, y: 0, z: 1 },
    corners: [
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 0, z: 1 },
      { x: 1, y: 1, z: 1 },
      { x: 0, y: 1, z: 1 },
    ],
  },
  {
    kind: 'right', // +x
    neighbour: { x: 1, y: 0, z: 0 },
    corners: [
      { x: 1, y: 0, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: 1, y: 0, z: 1 },
    ],
  },
  {
    kind: 'left', // +y
    neighbour: { x: 0, y: 1, z: 0 },
    corners: [
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: 0, y: 1, z: 1 },
    ],
  },
];

/**
 * Visible facets of a solid, culled (a face touching another cell is hidden)
 * and painter-ordered back→front. Camera sits along +(1,1,1); the farthest
 * cell has the smallest x+y+z, so we draw ascending by that depth. Returned
 * points are centered about the solid's projected bounding-box midpoint.
 */
export function facets(solid: Polycube): Facet[] {
  const occupied = new Set(solid.map(key));
  const raw: Array<{ pts: Pt[]; kind: FaceKind; depth: number }> = [];

  for (const c of solid) {
    const depth = c.x + c.y + c.z;
    for (const def of FACE_DEFS) {
      const n = { x: c.x + def.neighbour.x, y: c.y + def.neighbour.y, z: c.z + def.neighbour.z };
      if (occupied.has(key(n))) continue; // hidden internal face
      const pts = def.corners.map((corner) =>
        project({ x: c.x + corner.x, y: c.y + corner.y, z: c.z + corner.z }),
      );
      raw.push({ pts, kind: def.kind, depth });
    }
  }

  // Center about the projected bounding-box midpoint.
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const f of raw)
    for (const p of f.pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  raw.sort((a, b) => a.depth - b.depth);
  return raw.map((f) => ({
    kind: f.kind,
    points: f.pts.map((p) => ({ x: p.x - cx, y: p.y - cy })),
  }));
}

/** Half-extent (from center) of a solid's centered projection, both axes. */
function halfExtent(solid: Polycube): number {
  let h = 0;
  for (const f of facets(solid))
    for (const p of f.points) h = Math.max(h, Math.abs(p.x), Math.abs(p.y));
  return h;
}

/**
 * One origin-centered, square viewBox sized to fit the largest of the given
 * solids — so the reference and all choices share a single scale.
 */
export function sharedViewBox(solids: Polycube[], padding = 6): string {
  let half = 0;
  for (const s of solids) half = Math.max(half, halfExtent(s));
  half += padding;
  return `${-half} ${-half} ${2 * half} ${2 * half}`;
}

/**
 * Visible facets after occlusion. The cubic lattice projects to a rhombille
 * tiling, so two un-culled faces coincide only when they map to the *exact*
 * same projected quad — the nearer cube (greater x+y+z) wins it. We key each
 * un-centered facet by its rounded quad and keep the one drawn last (facets()
 * is painter-sorted back→front, so the last write is the nearest/visible one).
 */
type VisibleFacet = { pts: Pt[]; kind: FaceKind; owner: string };

function visibleFacets(solid: Polycube): VisibleFacet[] {
  const occupied = new Set(solid.map(key));
  const withDepth: Array<{ pts: Pt[]; kind: FaceKind; owner: string; depth: number }> = [];
  for (const c of solid) {
    const owner = key(c);
    const depth = c.x + c.y + c.z;
    for (const def of FACE_DEFS) {
      const n = { x: c.x + def.neighbour.x, y: c.y + def.neighbour.y, z: c.z + def.neighbour.z };
      if (occupied.has(key(n))) continue; // internal face
      const pts = def.corners.map((corner) =>
        project({ x: c.x + corner.x, y: c.y + corner.y, z: c.z + corner.z }),
      );
      withDepth.push({ pts, kind: def.kind, owner, depth });
    }
  }
  withDepth.sort((a, b) => a.depth - b.depth);
  // Painter occlusion: nearer face wins each exact projected quad.
  const map = new Map<string, VisibleFacet>();
  for (const f of withDepth) {
    const quad = f.pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).sort().join(';');
    map.set(quad, { pts: f.pts, kind: f.kind, owner: f.owner });
  }
  return [...map.values()];
}

/**
 * A stable string of the solid's *visible* image (the rhombi a viewer actually
 * sees), made **translation-invariant** by centering on the visible bounding
 * box — exactly the centering `facets()` applies when drawing. Two solids with
 * the same signature therefore render to an identical card.
 */
export function renderSignature(solid: Polycube): string {
  const vis = visibleFacets(solid);
  if (vis.length === 0) return '';
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const f of vis)
    for (const p of f.pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return vis
    .map((f) => {
      const quad = f.pts
        .map((p) => `${(p.x - cx).toFixed(2)},${(p.y - cy).toFixed(2)}`)
        .sort()
        .join(';');
      return `${f.kind}@${quad}`;
    })
    .sort()
    .join('|');
}

/** Cells that contribute no visible facet (buried, or fully overlapped). */
export function hiddenCellCount(solid: Polycube): number {
  const seen = new Set<string>();
  for (const f of visibleFacets(solid)) seen.add(f.owner);
  return solid.filter((c) => !seen.has(key(c))).length;
}

/** SVG path data for one facet polygon. */
export function facetPath(f: Facet): string {
  if (f.points.length === 0) return '';
  let d = `M ${f.points[0]!.x.toFixed(2)} ${f.points[0]!.y.toFixed(2)}`;
  for (let i = 1; i < f.points.length; i++) {
    d += ` L ${f.points[i]!.x.toFixed(2)} ${f.points[i]!.y.toFixed(2)}`;
  }
  return d + ' Z';
}
