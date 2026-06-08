import type { Cell, Polycube } from '../types';

export type Pt = { x: number; y: number };

export type Facet3D = {
  /** Projected 2D polygon (4 points), centered on the solid's centroid. */
  points: Pt[];
  /** Lambert shade in [0,1] (1 = fully lit) used to pick a fill colour. */
  shade: number;
};

type Vec3 = { x: number; y: number; z: number };

// Matched to iso.ts so that at yaw=pitch=0 a block renders pixel-identically to
// the static BlockFigure used while answering.
const COS30 = Math.cos(Math.PI / 6); // ≈ 0.866
const SIN30 = 0.5;
const S = 10; // screen units per cube edge

// The iso camera looks along +(1,1,1); a face is visible when its (rotated)
// outward normal points toward it. This shows +x/+y/+z at rest, exactly like
// iso.ts `facets()`.
const EYE: Vec3 = { x: 1, y: 1, z: 1 };

// Frame factor: the iso image of a sphere of radius ρ fits within √1.5·ρ on each
// screen axis, for ANY rotation — so this constant frame never clips or
// rescales while spinning.
const FRAME = Math.sqrt(1.5) + 0.05; // ≈ 1.275

// ---- vector / matrix helpers ----

type Mat3 = [number, number, number, number, number, number, number, number, number];

function mul(a: Mat3, b: Mat3): Mat3 {
  const m: number[] = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      m[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return m as Mat3;
}

function apply(m: Mat3, v: Vec3): Vec3 {
  return {
    x: m[0] * v.x + m[1] * v.y + m[2] * v.z,
    y: m[3] * v.x + m[4] * v.y + m[5] * v.z,
    z: m[6] * v.x + m[7] * v.y + m[8] * v.z,
  };
}

function rotX(a: number): Mat3 {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}
function rotZ(a: number): Mat3 {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

/**
 * User rotation applied to the model before the fixed iso projection: yaw spins
 * about the vertical Z axis (turntable), pitch tilts about model X. At (0,0)
 * it's the identity, so the projection below equals the static iso view.
 */
export function rotationMatrix(yawDeg: number, pitchDeg: number): Mat3 {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  return mul(rotX(pitch), rotZ(yaw));
}

/** Project a model point (already rotated) with the iso camera. Screen y is down. */
function project(q: Vec3): Pt {
  return { x: (q.x - q.y) * COS30 * S, y: ((q.x + q.y) * SIN30 - q.z) * S };
}

// The six faces of a unit cube: outward normal, neighbour offset (for culling),
// and the four corners (relative to the cube's min corner).
const FACE_DEFS: Array<{ normal: Vec3; neighbour: Cell; corners: Vec3[] }> = [
  { normal: { x: 0, y: 0, z: 1 }, neighbour: { x: 0, y: 0, z: 1 }, corners: [ { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 }, { x: 1, y: 1, z: 1 }, { x: 0, y: 1, z: 1 } ] },
  { normal: { x: 0, y: 0, z: -1 }, neighbour: { x: 0, y: 0, z: -1 }, corners: [ { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 0, z: 0 } ] },
  { normal: { x: 1, y: 0, z: 0 }, neighbour: { x: 1, y: 0, z: 0 }, corners: [ { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 1, z: 1 }, { x: 1, y: 0, z: 1 } ] },
  { normal: { x: -1, y: 0, z: 0 }, neighbour: { x: -1, y: 0, z: 0 }, corners: [ { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 1 }, { x: 0, y: 1, z: 0 } ] },
  { normal: { x: 0, y: 1, z: 0 }, neighbour: { x: 0, y: 1, z: 0 }, corners: [ { x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 1 }, { x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 0 } ] },
  { normal: { x: 0, y: -1, z: 0 }, neighbour: { x: 0, y: -1, z: 0 }, corners: [ { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 1 }, { x: 0, y: 0, z: 1 } ] },
];

// Light from the upper-front; mostly top-down (+z) with a slight right bias so
// the three rest faces read as top (brightest) / right (mid) / left (darker).
const LIGHT: Vec3 = (() => {
  const l = { x: 0.35, y: 0.2, z: 0.95 };
  const n = Math.hypot(l.x, l.y, l.z);
  return { x: l.x / n, y: l.y / n, z: l.z / n };
})();

function centroid(solid: Polycube): Vec3 {
  let x = 0,
    y = 0,
    z = 0;
  for (const c of solid) {
    x += c.x + 0.5;
    y += c.y + 0.5;
    z += c.z + 0.5;
  }
  const n = solid.length || 1;
  return { x: x / n, y: y / n, z: z / n };
}

function key(c: Cell): string {
  return `${c.x},${c.y},${c.z}`;
}

/**
 * Project a solid to 2D under a free rotation, with back-face culling, painter
 * ordering (back→front), and Lambert shading. At yaw=pitch=0 this reproduces the
 * static iso view (same camera as iso.ts), so revealing/rotating never makes the
 * block jump. Coordinates are centered on the centroid so it spins in place.
 */
export function renderSolid(solid: Polycube, yawDeg: number, pitchDeg: number): Facet3D[] {
  const m = rotationMatrix(yawDeg, pitchDeg);
  const occupied = new Set(solid.map(key));
  const ctr = centroid(solid);

  const out: Array<{ points: Pt[]; shade: number; depth: number; tie: number }> = [];
  for (const c of solid) {
    for (const def of FACE_DEFS) {
      const nb = { x: c.x + def.neighbour.x, y: c.y + def.neighbour.y, z: c.z + def.neighbour.z };
      if (occupied.has(key(nb))) continue; // internal face

      const rn = apply(m, def.normal);
      if (rn.x * EYE.x + rn.y * EYE.y + rn.z * EYE.z <= 1e-4) continue; // back-facing the iso eye

      let depth = 0;
      const points: Pt[] = def.corners.map((corner) => {
        const q = apply(m, {
          x: c.x + corner.x - ctr.x,
          y: c.y + corner.y - ctr.y,
          z: c.z + corner.z - ctr.z,
        });
        depth += q.x + q.y + q.z; // nearer to the (1,1,1) eye = larger
        return project(q);
      });
      const shade = 0.45 + 0.55 * Math.max(0, rn.x * LIGHT.x + rn.y * LIGHT.y + rn.z * LIGHT.z);
      // Stable tiebreaker for equal-depth faces so draw order is a pure function
      // of the cell set (independent of input array order).
      const tie = points.reduce((s, p) => s + p.x * 1000 + p.y, 0);
      out.push({ points, shade, depth: depth / 4, tie });
    }
  }

  out.sort((a, b) => a.depth - b.depth || a.tie - b.tie); // far (small sum) first
  return out.map((f) => ({ points: f.points, shade: f.shade }));
}

/** Bounding-sphere radius of the solid in screen units (rotation-invariant). */
export function boundingRadius(solid: Polycube): number {
  const ctr = centroid(solid);
  let r = 0;
  for (const c of solid)
    for (let dx = 0; dx <= 1; dx++)
      for (let dy = 0; dy <= 1; dy++)
        for (let dz = 0; dz <= 1; dz++)
          r = Math.max(r, Math.hypot(c.x + dx - ctr.x, c.y + dy - ctr.y, c.z + dz - ctr.z));
  return r * S;
}

/**
 * Origin-centered square viewBox sized so the iso projection of the solid fits
 * at any rotation (FRAME·radius) — constant, so the block never clips or
 * rescales while spinning.
 */
export function viewBoxFor(solid: Polycube, padding = 3): string {
  const r = FRAME * boundingRadius(solid) + padding;
  return `${-r} ${-r} ${2 * r} ${2 * r}`;
}

/** Largest bounding radius across solids — for one shared frame/scale. */
export function sharedRadius(solids: Polycube[]): number {
  let r = 0;
  for (const s of solids) r = Math.max(r, boundingRadius(s));
  return r;
}

/** Origin-centered square viewBox that fits every given solid at one scale. */
export function sharedViewBox3D(solids: Polycube[], padding = 3): string {
  const r = FRAME * sharedRadius(solids) + padding;
  return `${-r} ${-r} ${2 * r} ${2 * r}`;
}

/** SVG path for a facet polygon. */
export function facet3dPath(f: Facet3D): string {
  if (f.points.length === 0) return '';
  let d = `M ${f.points[0]!.x.toFixed(2)} ${f.points[0]!.y.toFixed(2)}`;
  for (let i = 1; i < f.points.length; i++) d += ` L ${f.points[i]!.x.toFixed(2)} ${f.points[i]!.y.toFixed(2)}`;
  return d + ' Z';
}
