import type { Angle, Command, Face, Placement } from '../types';

// ---------------------------------------------------------------------------
// Cube orientation algebra.
//
// Orientation is an integer 3×3 rotation matrix (one of the 24 in the cube
// rotation group; entries in {-1,0,1}). World axes match the isometric view in
// iso.ts: +x → lower-right face, +y → lower-left face, +z → top. A face is
// visible exactly when its world normal is one of +x, +y, +z.
// ---------------------------------------------------------------------------

export type Vec3 = { x: number; y: number; z: number };
/** Row-major 3×3 matrix. */
export type Mat3 = [number, number, number, number, number, number, number, number, number];

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function mul(a: Mat3, b: Mat3): Mat3 {
  const m = new Array(9) as number[];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      m[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return m as Mat3;
}

export function apply(m: Mat3, v: Vec3): Vec3 {
  return {
    x: m[0] * v.x + m[1] * v.y + m[2] * v.z,
    y: m[3] * v.x + m[4] * v.y + m[5] * v.z,
    z: m[6] * v.x + m[7] * v.y + m[8] * v.z,
  };
}

function transpose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

// 90° right-handed rotations (consistent with render3d's rotX/rotY conventions).
const ROT_X90: Mat3 = [1, 0, 0, 0, 0, -1, 0, 1, 0]; // +y → +z
const ROT_Y90: Mat3 = [0, 0, 1, 0, 1, 0, -1, 0, 0]; // +z → +x
const ROT_Z90: Mat3 = [0, -1, 0, 1, 0, 0, 0, 0, 1]; // +x → +y
// A rotation matrix's inverse is its transpose, so −90° = transpose(+90°).
const ROT_Xn90 = transpose(ROT_X90);
const ROT_Yn90 = transpose(ROT_Y90);
const ROT_Zn90 = transpose(ROT_Z90);

/**
 * Each command is a single ±90° rotation about a world axis, matched to the
 * worksheet's directions: "forwards" tips the top toward the viewer (onto a
 * visible front face), "backwards" tips it away (to the hidden back); "flip
 * right" tips the top onto the right face, "flip left" onto the hidden left.
 */
export const COMMAND_ROT: Record<Command, Mat3> = {
  'turn-left': ROT_Z90,
  'turn-right': ROT_Zn90,
  'turn-forwards': ROT_Xn90,
  'turn-backwards': ROT_X90,
  'flip-left': ROT_Yn90,
  'flip-right': ROT_Y90,
};

/**
 * Apply one command. Commands are given from the viewer's fixed perspective, so
 * the rotation is premultiplied (world frame): M' = R · M.
 */
export function applyCommand(m: Mat3, cmd: Command): Mat3 {
  return mul(COMMAND_ROT[cmd], m);
}

// ---- the marker, in the cube's original frame ----

/** The marked face's normal at orientation = identity (starts on top). */
export const MARK_NORMAL0: Vec3 = { x: 0, y: 0, z: 1 };
/** The mark's in-plane "up" reference at orientation = identity. */
export const MARK_UP0: Vec3 = { x: 0, y: -1, z: 0 };

// ---- faces & in-plane geometry ----

export const FACES: ReadonlyArray<{ face: Face; normal: Vec3; refUp: Vec3 }> = [
  { face: 'top', normal: { x: 0, y: 0, z: 1 }, refUp: { x: 0, y: -1, z: 0 } },
  { face: 'right', normal: { x: 1, y: 0, z: 0 }, refUp: { x: 0, y: 0, z: 1 } },
  { face: 'left', normal: { x: 0, y: 1, z: 0 }, refUp: { x: 0, y: 0, z: 1 } },
];

/** Lattice-space center of each visible face on a unit cube spanning [0,1]³. */
export const FACE_CENTER: Record<Face, Vec3> = {
  top: { x: 0.5, y: 0.5, z: 1 },
  right: { x: 1, y: 0.5, z: 0.5 },
  left: { x: 0.5, y: 1, z: 0.5 },
};

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function trig(angle: Angle): { c: number; s: number } {
  switch (angle) {
    case 0:
      return { c: 1, s: 0 };
    case 90:
      return { c: 0, s: 1 };
    case 180:
      return { c: -1, s: 0 };
    case 270:
      return { c: 0, s: -1 };
  }
}

const ANGLES: Angle[] = [0, 90, 180, 270];

function round(v: Vec3): Vec3 {
  return { x: Math.round(v.x), y: Math.round(v.y), z: Math.round(v.z) };
}

function eq(a: Vec3, b: Vec3): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

/** The world-space in-plane "up" of the mark for a given face + angle. */
export function glyphUpFor(face: Face, angle: Angle): Vec3 {
  const f = FACES.find((d) => d.face === face)!;
  const refRight = cross(f.normal, f.refUp);
  const { c, s } = trig(angle);
  return {
    x: c * f.refUp.x + s * refRight.x,
    y: c * f.refUp.y + s * refRight.y,
    z: c * f.refUp.z + s * refRight.z,
  };
}

/** Resolve an orientation to the mark's placement (visible face + angle, or hidden). */
export function resolvePlacement(m: Mat3): Placement {
  const normal = round(apply(m, MARK_NORMAL0));
  const up = round(apply(m, MARK_UP0));
  const f = FACES.find((d) => eq(d.normal, normal));
  if (!f) return { face: null, angle: 0 };
  for (const angle of ANGLES) {
    if (eq(glyphUpFor(f.face, angle), up)) return { face: f.face, angle };
  }
  return { face: f.face, angle: 0 };
}

export function placementKey(p: Placement): string {
  return `${p.face ?? 'hidden'}:${p.angle}`;
}
