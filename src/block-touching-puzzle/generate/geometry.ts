import type { Rng } from '../../rotation-puzzle/generate/rng';
import type { Block, Vec3 } from '../types';

export type Axis = 'x' | 'y' | 'z';
export type Face = { axis: Axis; dir: 1 | -1 };

/** The six axis-aligned face directions of a box. */
export const FACES: readonly Face[] = [
  { axis: 'x', dir: 1 },
  { axis: 'x', dir: -1 },
  { axis: 'y', dir: 1 },
  { axis: 'y', dir: -1 },
  { axis: 'z', dir: 1 },
  { axis: 'z', dir: -1 },
];

const AXES: readonly Axis[] = ['x', 'y', 'z'];

export function cellKey(c: Vec3): string {
  return `${c.x},${c.y},${c.z}`;
}

export function step(c: Vec3, f: Face): Vec3 {
  return { ...c, [f.axis]: c[f.axis] + f.dir };
}

/** All unit cells occupied by a block's box. */
export function boxCells(block: Block): Vec3[] {
  const cells: Vec3[] = [];
  const { origin: o, size: s } = block;
  for (let x = 0; x < s.x; x++)
    for (let y = 0; y < s.y; y++)
      for (let z = 0; z < s.z; z++)
        cells.push({ x: o.x + x, y: o.y + y, z: o.z + z });
  return cells;
}

/** Map every occupied cell to the id of the block that owns it. */
export function buildOccupancy(blocks: Block[]): Map<string, number> {
  const occ = new Map<string, number>();
  for (const b of blocks) {
    for (const c of boxCells(b)) occ.set(cellKey(c), b.id);
  }
  return occ;
}

/**
 * Does any cell of `block` overlap an already-occupied cell? Used while growing
 * the cluster so blocks never intersect.
 */
function overlapsOccupancy(block: Block, occ: Map<string, number>): boolean {
  for (const c of boxCells(block)) {
    if (occ.has(cellKey(c))) return true;
  }
  return false;
}

/**
 * Is the block supported — resting on the ground (z=0) or on existing structure
 * (a cell directly below is occupied)? Keeps clusters grounded and compact (no
 * floating mid-air beams), so the static figure reads like a solid on a floor.
 */
function isSupported(block: Block, occ: Map<string, number>): boolean {
  for (const c of boxCells(block)) {
    if (c.z === 0) return true;
    if (occ.has(cellKey({ x: c.x, y: c.y, z: c.z - 1 }))) return true;
  }
  return false;
}

/** Every block rests on the ground or on a *different* block (no floating). */
export function isGrounded(blocks: Block[]): boolean {
  const occ = buildOccupancy(blocks);
  return blocks.every((b) =>
    boxCells(b).some((c) => {
      if (c.z === 0) return true;
      const below = occ.get(cellKey({ x: c.x, y: c.y, z: c.z - 1 }));
      return below !== undefined && below !== b.id;
    }),
  );
}

/**
 * Is one of the block's faces touched by a *different* block? A face is touched
 * when any cell on that wall has its outward neighbour owned by another block.
 * Iterating every cell is fine: an interior cell's neighbour belongs to the same
 * block (same id), so only boundary cells can trigger a hit. Edge/corner contact
 * is excluded for free — only the 6-neighbourhood is ever tested.
 */
function faceTouched(block: Block, f: Face, occ: Map<string, number>): boolean {
  for (const c of boxCells(block)) {
    const owner = occ.get(cellKey(step(c, f)));
    if (owner !== undefined && owner !== block.id) return true;
  }
  return false;
}

/** How many of the block's six faces touch another block (0–6). */
export function countTouchingFaces(block: Block, occ: Map<string, number>): number {
  let n = 0;
  for (const f of FACES) if (faceTouched(block, f, occ)) n++;
  return n;
}

/** Fill in `touchingFaces` for every block (mutates in place). */
export function computeAllTouching(blocks: Block[]): void {
  const occ = buildOccupancy(blocks);
  for (const b of blocks) b.touchingFaces = countTouchingFaces(b, occ);
}

/** Two half-open intervals overlap with strictly positive length (edge-only contact = false). */
function intervalsOverlapPositive(a0: number, a1: number, b0: number, b1: number): boolean {
  return Math.min(a1, b1) - Math.max(a0, b0) > 0;
}

/**
 * Independent re-count of touching faces via box interval-overlap — deliberately
 * uses NO occupancy/cell machinery, so it cross-checks `countTouchingFaces`. A
 * neighbour touches a given face iff its opposite face is coplanar AND the two
 * perpendicular extents overlap with positive area (so edge/corner contact = 0).
 * Each of the 6 faces counts at most once. Used as a correctness oracle in tests.
 */
export function countTouchingFacesGeometric(block: Block, others: Block[]): number {
  const ax0 = block.origin.x;
  const ax1 = ax0 + block.size.x;
  const ay0 = block.origin.y;
  const ay1 = ay0 + block.size.y;
  const az0 = block.origin.z;
  const az1 = az0 + block.size.z;
  let n = 0;
  for (const f of FACES) {
    const touched = others.some((b) => {
      if (b.id === block.id) return false;
      const bx0 = b.origin.x;
      const bx1 = bx0 + b.size.x;
      const by0 = b.origin.y;
      const by1 = by0 + b.size.y;
      const bz0 = b.origin.z;
      const bz1 = bz0 + b.size.z;
      if (f.axis === 'x') {
        const plane = f.dir === 1 ? ax1 : ax0;
        const bFace = f.dir === 1 ? bx0 : bx1;
        return (
          bFace === plane &&
          intervalsOverlapPositive(ay0, ay1, by0, by1) &&
          intervalsOverlapPositive(az0, az1, bz0, bz1)
        );
      }
      if (f.axis === 'y') {
        const plane = f.dir === 1 ? ay1 : ay0;
        const bFace = f.dir === 1 ? by0 : by1;
        return (
          bFace === plane &&
          intervalsOverlapPositive(ax0, ax1, bx0, bx1) &&
          intervalsOverlapPositive(az0, az1, bz0, bz1)
        );
      }
      const plane = f.dir === 1 ? az1 : az0;
      const bFace = f.dir === 1 ? bz0 : bz1;
      return (
        bFace === plane &&
        intervalsOverlapPositive(ax0, ax1, bx0, bx1) &&
        intervalsOverlapPositive(ay0, ay1, by0, by1)
      );
    });
    if (touched) n++;
  }
  return n;
}

/** Are all blocks connected through face-adjacency (read as one cluster)? */
export function isConnected(blocks: Block[]): boolean {
  if (blocks.length <= 1) return true;
  const occ = buildOccupancy(blocks);
  const seen = new Set<number>([blocks[0]!.id]);
  const queue: Block[] = [blocks[0]!];
  const byId = new Map(blocks.map((b) => [b.id, b]));
  while (queue.length) {
    const b = queue.shift()!;
    for (const c of boxCells(b)) {
      for (const f of FACES) {
        const owner = occ.get(cellKey(step(c, f)));
        if (owner !== undefined && owner !== b.id && !seen.has(owner)) {
          seen.add(owner);
          queue.push(byId.get(owner)!);
        }
      }
    }
  }
  return seen.size === blocks.length;
}

/** All distinct axis-aligned orientations of a box with the given dimensions. */
export function orientationsOf(size: Vec3): Vec3[] {
  const dims = [size.x, size.y, size.z];
  const max = Math.max(...dims);
  const min = Math.min(...dims);
  // We only ever use cubes (1,1,1) or beams (1,1,L), so a beam has one long axis.
  if (max === min) return [{ x: max, y: max, z: max }];
  return [
    { x: max, y: 1, z: 1 },
    { x: 1, y: max, z: 1 },
    { x: 1, y: 1, z: max },
  ];
}

/**
 * Grow a connected, non-overlapping cluster of `k` congruent blocks on the grid.
 * Each new block is anchored to a cell face-adjacent to the existing cluster, so
 * the whole structure reads as one solid like the PDF figures. `maxZ` caps the
 * stacking height (number of layers). Returns null if it gets stuck.
 */
export function growCluster(rng: Rng, baseSize: Vec3, k: number, maxZ: number): Block[] | null {
  const orientations = orientationsOf(baseSize);
  const blocks: Block[] = [];
  const occ = new Map<string, number>();

  const add = (b: Block) => {
    blocks.push(b);
    for (const c of boxCells(b)) occ.set(cellKey(c), b.id);
  };

  const fitsZ = (origin: Vec3, size: Vec3) =>
    origin.z >= 0 && origin.z + size.z - 1 <= maxZ - 1;

  // First block at the origin.
  const firstSize = rng.pick(orientations);
  const first: Block = { id: 0, label: '', origin: { x: 0, y: 0, z: 0 }, size: firstSize, touchingFaces: 0 };
  if (!fitsZ(first.origin, first.size)) return null;
  add(first);

  let attempts = 0;
  while (blocks.length < k && attempts < 1000) {
    attempts++;
    const keys = [...occ.keys()];
    const [cx, cy, cz] = rng.pick(keys).split(',').map(Number) as [number, number, number];
    const f = rng.pick(FACES);
    const anchor: Vec3 = step({ x: cx, y: cy, z: cz }, f); // a cell of the new block
    if (anchor.z < 0 || occ.has(cellKey(anchor))) continue;

    const size = rng.pick(orientations);
    const lengthAxis: Axis = size.x > 1 ? 'x' : size.y > 1 ? 'y' : 'z';
    const L = size[lengthAxis];
    const t = rng.int(0, L); // which cell along the beam lands on the anchor
    const origin: Vec3 = { ...anchor, [lengthAxis]: anchor[lengthAxis] - t };

    const cand: Block = { id: blocks.length, label: '', origin, size, touchingFaces: 0 };
    if (!fitsZ(origin, size) || overlapsOccupancy(cand, occ) || !isSupported(cand, occ)) continue;
    add(cand);
  }

  if (blocks.length < k) return null;

  normalize(blocks);
  return blocks;
}

/** Center-sum depth: larger is nearer the viewer (the +(1,1,1) direction). */
function centerSum(b: Block): number {
  return (
    b.origin.x + b.size.x / 2 + (b.origin.y + b.size.y / 2) + (b.origin.z + b.size.z / 2)
  );
}

/**
 * Occlusion pairs as `"front->back"` ids: `front` covers `back` because some cell of
 * `front` sits on `back`'s view ray nearer the camera (`back-cell + t·(1,1,1)`, t ≥ 1).
 * The `(1,1,1)` view direction collapses to one screen point, so this is exact.
 */
function occlusionPairs(blocks: Block[]): Set<string> {
  const occ = buildOccupancy(blocks);
  let maxX = 0;
  let maxY = 0;
  let maxZ = 0;
  for (const b of blocks) {
    maxX = Math.max(maxX, b.origin.x + b.size.x);
    maxY = Math.max(maxY, b.origin.y + b.size.y);
    maxZ = Math.max(maxZ, b.origin.z + b.size.z);
  }
  const pairs = new Set<string>();
  for (const b of blocks) {
    for (const c of boxCells(b)) {
      for (let t = 1; c.x + t < maxX && c.y + t < maxY && c.z + t < maxZ; t++) {
        const owner = occ.get(cellKey({ x: c.x + t, y: c.y + t, z: c.z + t }));
        if (owner !== undefined && owner !== b.id) pairs.add(`${owner}->${b.id}`);
      }
    }
  }
  return pairs;
}

type Graph = { adj: Map<number, number[]>; indeg: Map<number, number> };

/** Build the "draw-before" graph: an edge back → front means back must be drawn first. */
function buildGraph(blocks: Block[]): Graph {
  const adj = new Map<number, number[]>(blocks.map((b) => [b.id, []]));
  const indeg = new Map<number, number>(blocks.map((b) => [b.id, 0]));
  for (const pair of occlusionPairs(blocks)) {
    const [front, back] = pair.split('->').map(Number) as [number, number];
    adj.get(back)!.push(front);
    indeg.set(front, indeg.get(front)! + 1);
  }
  return { adj, indeg };
}

/**
 * Painter draw order (far → near) via a deterministic Kahn topological sort over the
 * occlusion relation, so interlocking beams never paint over a nearer neighbour.
 * Any residual cycle (should be rejected upstream) falls back to center-sum order.
 */
export function drawOrder(blocks: Block[]): Block[] {
  const { adj, indeg } = buildGraph(blocks);
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const cmp = (i: number, j: number) =>
    centerSum(byId.get(i)!) - centerSum(byId.get(j)!) || i - j;

  const avail = blocks.filter((b) => indeg.get(b.id) === 0).map((b) => b.id);
  const order: Block[] = [];
  while (avail.length) {
    avail.sort(cmp);
    const id = avail.shift()!;
    order.push(byId.get(id)!);
    for (const next of adj.get(id)!) {
      indeg.set(next, indeg.get(next)! - 1);
      if (indeg.get(next) === 0) avail.push(next);
    }
  }
  if (order.length < blocks.length) {
    const placed = new Set(order.map((b) => b.id));
    const rest = blocks
      .filter((b) => !placed.has(b.id))
      .sort((a, b) => centerSum(a) - centerSum(b) || a.id - b.id);
    order.push(...rest);
  }
  return order;
}

/** True when the occlusion relation has a cycle — no valid single draw order exists. */
export function hasOcclusionCycle(blocks: Block[]): boolean {
  const { adj, indeg } = buildGraph(blocks);
  const avail = blocks.filter((b) => indeg.get(b.id) === 0).map((b) => b.id);
  let placed = 0;
  while (avail.length) {
    const id = avail.shift()!;
    placed++;
    for (const next of adj.get(id)!) {
      indeg.set(next, indeg.get(next)! - 1);
      if (indeg.get(next) === 0) avail.push(next);
    }
  }
  return placed < blocks.length;
}

/** Shift the whole cluster so its minimum cell sits at (0,0,0). */
function normalize(blocks: Block[]): void {
  let min: Vec3 = { x: Infinity, y: Infinity, z: Infinity };
  for (const b of blocks) {
    for (const a of AXES) min[a] = Math.min(min[a], b.origin[a]);
  }
  for (const b of blocks) {
    b.origin = { x: b.origin.x - min.x, y: b.origin.y - min.y, z: b.origin.z - min.z };
  }
}
