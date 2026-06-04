import type { Cell, Polycube } from '../types';

export type Pt = { x: number; y: number };

export type Facet3D = {
  /** Projected 2D polygon (4 points), centered on the solid's centroid. */
  points: Pt[];
  /** Lambert shade in [0,1] (1 = fully lit) used to pick a fill colour. */
  shade: number;
};

type Vec3 = { x: number; y: number; z: number };

const S = 10; // screen units per cube edge (matched by the viewBox)

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
function rotY(a: number): Mat3 {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

// Base 3/4 tilt so the solid starts at a pleasant isometric-ish angle.
const BASE_PITCH = (Math.atan(Math.SQRT1_2) * 180) / Math.PI; // ≈ 35.26°
const BASE_YAW = 45;

/** Rotation matrix for the given yaw/pitch (degrees), on top of the base tilt. */
export function rotationMatrix(yawDeg: number, pitchDeg: number): Mat3 {
  const yaw = ((yawDeg + BASE_YAW) * Math.PI) / 180;
  const pitch = ((pitchDeg + BASE_PITCH) * Math.PI) / 180;
  // Pitch about screen-X applied after yaw about world-Y.
  return mul(rotX(pitch), rotY(yaw));
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

// Camera looks along -Z (toward the screen); a face is visible when its rotated
// normal points toward the viewer (+Z). Light comes from the upper-front.
const LIGHT: Vec3 = (() => {
  const l = { x: -0.3, y: 0.5, z: 0.8 };
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
 * ordering (back→front), and Lambert shading. Coordinates are centered on the
 * solid's centroid so it spins in place.
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
      if (rn.z <= 0.0001) continue; // back-facing

      let depth = 0;
      const points: Pt[] = def.corners.map((corner) => {
        const world = { x: c.x + corner.x - ctr.x, y: c.y + corner.y - ctr.y, z: c.z + corner.z - ctr.z };
        const r = apply(m, world);
        depth += r.z;
        // Screen Y grows downward.
        return { x: r.x * S, y: -r.y * S };
      });
      const shade = 0.45 + 0.55 * Math.max(0, rn.x * LIGHT.x + rn.y * LIGHT.y + rn.z * LIGHT.z);
      // Stable tiebreaker for equal-depth faces so the draw order is a pure
      // function of the cell set (independent of input array order).
      const tie = points.reduce((s, p) => s + p.x * 1000 + p.y, 0);
      out.push({ points, shade, depth: depth / 4, tie });
    }
  }

  out.sort((a, b) => a.depth - b.depth || a.tie - b.tie); // far (small z) first
  return out.map((f) => ({ points: f.points, shade: f.shade }));
}

/**
 * Radius of the solid's bounding sphere in screen units — a constant frame so
 * the solid never clips or rescales while spinning.
 */
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

/** Origin-centered square viewBox sized to the bounding sphere (+padding). */
export function viewBoxFor(solid: Polycube, padding = 4): string {
  const r = boundingRadius(solid) + padding;
  return `${-r} ${-r} ${2 * r} ${2 * r}`;
}

/** Largest bounding radius across solids — for one shared frame/scale. */
export function sharedRadius(solids: Polycube[]): number {
  let r = 0;
  for (const s of solids) r = Math.max(r, boundingRadius(s));
  return r;
}

/** Origin-centered square viewBox that fits every given solid at one scale. */
export function sharedViewBox3D(solids: Polycube[], padding = 4): string {
  const r = sharedRadius(solids) + padding;
  return `${-r} ${-r} ${2 * r} ${2 * r}`;
}

/** SVG path for a facet polygon. */
export function facet3dPath(f: Facet3D): string {
  if (f.points.length === 0) return '';
  let d = `M ${f.points[0]!.x.toFixed(2)} ${f.points[0]!.y.toFixed(2)}`;
  for (let i = 1; i < f.points.length; i++) d += ` L ${f.points[i]!.x.toFixed(2)} ${f.points[i]!.y.toFixed(2)}`;
  return d + ' Z';
}
