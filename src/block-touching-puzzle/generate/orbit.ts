import type { Block, Pt, Vec3 } from '../types';
import { FACES, boxCells, buildOccupancy, cellKey, step, type Face } from './geometry';

/** A drawable, depth-sorted face for the rotatable 3D inspector. */
export type OrbitQuad = { points: Pt[]; fill: string; depth: number; key: string };
export type OrbitView = { quads: OrbitQuad[]; viewBox: string };

/** Distinct per-block hues (clusters are ≤ ~9 blocks), indexed by sorted label. */
export const BLOCK_PALETTE: readonly [number, number, number][] = [
  [56, 224, 255], // cyan / accent
  [251, 191, 36], // amber
  [167, 139, 250], // violet
  [52, 211, 153], // emerald
  [251, 113, 133], // rose
  [96, 165, 250], // sky
  [163, 230, 53], // lime
  [251, 146, 60], // orange
  [232, 121, 249], // fuchsia
];

export function blockColorIndex(blocks: Block[]): Map<number, number> {
  const order = blocks.slice().sort((a, b) => a.label.localeCompare(b.label));
  return new Map(order.map((b, i) => [b.id, i % BLOCK_PALETTE.length]));
}

/** Yaw about the world up-axis (z), then pitch about the screen x-axis. */
export function rotate(p: Vec3, yaw: number, pitch: number): Vec3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = cy * p.x - sy * p.y;
  const y1 = sy * p.x + cy * p.y;
  const z1 = p.z;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return { x: x1, y: cp * y1 - sp * z1, z: sp * y1 + cp * z1 };
}

/** Orthographic screen point (SVG y is down). Larger `depth` is nearer the camera. */
export function projectRotated(p: Vec3): { screen: Pt; depth: number } {
  return { screen: { x: p.x, y: -p.z }, depth: p.y };
}

/** The four corners of a unit cell's face (cell occupies [c, c+1] on each axis). */
function cellFaceCorners(c: Vec3, f: Face): Vec3[] {
  const lo = c;
  const hi = { x: c.x + 1, y: c.y + 1, z: c.z + 1 };
  // The two axes spanning the face.
  const span: ('x' | 'y' | 'z')[] = (['x', 'y', 'z'] as const).filter((ax) => ax !== f.axis);
  const fixed = f.dir === 1 ? hi[f.axis] : lo[f.axis];
  const make = (u: boolean, v: boolean): Vec3 => {
    const p = { x: lo.x, y: lo.y, z: lo.z };
    p[f.axis] = fixed;
    p[span[0]!] = u ? hi[span[0]!] : lo[span[0]!];
    p[span[1]!] = v ? hi[span[1]!] : lo[span[1]!];
    return p;
  };
  // Ring order so the quad isn't self-intersecting.
  return [make(false, false), make(true, false), make(true, true), make(false, true)];
}

function faceNormal(f: Face): Vec3 {
  return {
    x: f.axis === 'x' ? f.dir : 0,
    y: f.axis === 'y' ? f.dir : 0,
    z: f.axis === 'z' ? f.dir : 0,
  };
}

type RawFace = { corners: Vec3[]; normal: Vec3; blockId: number };

/** Exterior cell faces only — a face whose outward neighbour is occupied is never seen. */
function buildFaces(blocks: Block[]): RawFace[] {
  const occ = buildOccupancy(blocks);
  const faces: RawFace[] = [];
  for (const b of blocks) {
    for (const c of boxCells(b)) {
      for (const f of FACES) {
        if (occ.has(cellKey(step(c, f)))) continue; // interior / contact face — hidden
        faces.push({ corners: cellFaceCorners(c, f), normal: faceNormal(f), blockId: b.id });
      }
    }
  }
  return faces;
}

function clusterCentroid(blocks: Block[]): Vec3 {
  let sx = 0;
  let sy = 0;
  let sz = 0;
  let n = 0;
  for (const b of blocks) {
    for (const c of boxCells(b)) {
      sx += c.x + 0.5;
      sy += c.y + 0.5;
      sz += c.z + 0.5;
      n++;
    }
  }
  return n ? { x: sx / n, y: sy / n, z: sz / n } : { x: 0, y: 0, z: 0 };
}

const LIGHT = (() => {
  const l = { x: -0.3, y: 0.6, z: 0.72 };
  const m = Math.hypot(l.x, l.y, l.z);
  return { x: l.x / m, y: l.y / m, z: l.z / m };
})();

function shadeColor(base: readonly [number, number, number], nrot: Vec3): string {
  const dot = nrot.x * LIGHT.x + nrot.y * LIGHT.y + nrot.z * LIGHT.z;
  const f = 0.5 + 0.5 * Math.max(0, dot); // 0.5 … 1.0
  const r = Math.round(base[0] * f);
  const g = Math.round(base[1] * f);
  const b = Math.round(base[2] * f);
  return `rgb(${r}, ${g}, ${b})`;
}

/** A fixed square viewBox sized to the bounding sphere, so the model never rescales while spinning. */
export function orbitViewBox(blocks: Block[], pad = 0.7): string {
  const c = clusterCentroid(blocks);
  let r = 0;
  for (const b of blocks) {
    for (const cell of boxCells(b)) {
      for (const dx of [0, 1])
        for (const dy of [0, 1])
          for (const dz of [0, 1]) {
            const d = Math.hypot(cell.x + dx - c.x, cell.y + dy - c.y, cell.z + dz - c.z);
            if (d > r) r = d;
          }
    }
  }
  const s = r + pad;
  return `${(-s).toFixed(3)} ${(-s).toFixed(3)} ${(2 * s).toFixed(3)} ${(2 * s).toFixed(3)}`;
}

/** Build the depth-sorted, shaded, back-face-culled faces for the given orientation. */
export function buildOrbitView(blocks: Block[], yaw: number, pitch: number): OrbitView {
  const centroid = clusterCentroid(blocks);
  const colorIdx = blockColorIndex(blocks);
  const raw = buildFaces(blocks);
  const quads: OrbitQuad[] = [];
  let i = 0;
  for (const f of raw) {
    const nrot = rotate(f.normal, yaw, pitch);
    if (nrot.y <= 0.0001) {
      i++;
      continue; // back-face: normal points away from the camera (+y is toward viewer)
    }
    const rotated = f.corners.map((p) =>
      rotate({ x: p.x - centroid.x, y: p.y - centroid.y, z: p.z - centroid.z }, yaw, pitch),
    );
    const projected = rotated.map((p) => projectRotated(p));
    const depth = projected.reduce((s, p) => s + p.depth, 0) / projected.length;
    const base = BLOCK_PALETTE[colorIdx.get(f.blockId) ?? 0]!;
    quads.push({
      points: projected.map((p) => p.screen),
      fill: shadeColor(base, nrot),
      depth,
      key: `${f.blockId}-${i++}`,
    });
  }
  quads.sort((a, b) => a.depth - b.depth); // far → near
  return { quads, viewBox: orbitViewBox(blocks) };
}
