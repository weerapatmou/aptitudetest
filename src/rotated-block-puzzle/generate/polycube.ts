import type { Rng } from '../../rotation-puzzle/generate/rng';
import type { Cell, Polycube } from '../types';

/** A 3×3 integer matrix, row-major. */
type Mat = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
];

function det(m: Mat): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

/** Every signed permutation matrix is a column with a single ±1 per row/col. */
function buildSignedPermutations(): Mat[] {
  const perms: number[][] = [];
  const base = [0, 1, 2];
  const permute = (arr: number[], k: number) => {
    if (k === arr.length) {
      perms.push(arr.slice());
      return;
    }
    for (let i = k; i < arr.length; i++) {
      [arr[k]!, arr[i]!] = [arr[i]!, arr[k]!];
      permute(arr, k + 1);
      [arr[k]!, arr[i]!] = [arr[i]!, arr[k]!];
    }
  };
  permute(base, 0);

  const mats: Mat[] = [];
  for (const p of perms) {
    for (let signs = 0; signs < 8; signs++) {
      const s = [signs & 1 ? -1 : 1, signs & 2 ? -1 : 1, signs & 4 ? -1 : 1];
      const rows: number[][] = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ];
      for (let r = 0; r < 3; r++) rows[r]![p[r]!] = s[r]!;
      mats.push(rows as unknown as Mat);
    }
  }
  return mats;
}

const SIGNED_PERMS = buildSignedPermutations();

/** The 24 orientation-preserving rotations of the cube symmetry group. */
export const ROTATIONS: Mat[] = SIGNED_PERMS.filter((m) => det(m) === 1);

/** All 48 symmetries (24 rotations + 24 reflections). */
export const SYMMETRIES: Mat[] = SIGNED_PERMS;

function applyMat(m: Mat, c: Cell): Cell {
  return {
    x: m[0][0] * c.x + m[0][1] * c.y + m[0][2] * c.z,
    y: m[1][0] * c.x + m[1][1] * c.y + m[1][2] * c.z,
    z: m[2][0] * c.x + m[2][1] * c.y + m[2][2] * c.z,
  };
}

/** Apply a matrix to every cell of a solid. */
export function transform(solid: Polycube, m: Mat): Polycube {
  return solid.map((c) => applyMat(m, c));
}

/** Shift a solid so its minimum corner sits at (0,0,0). */
export function normalize(solid: Polycube): Polycube {
  if (solid.length === 0) return [];
  let mx = Infinity,
    my = Infinity,
    mz = Infinity;
  for (const c of solid) {
    if (c.x < mx) mx = c.x;
    if (c.y < my) my = c.y;
    if (c.z < mz) mz = c.z;
  }
  return solid.map((c) => ({ x: c.x - mx, y: c.y - my, z: c.z - mz }));
}

/** A stable, order-independent string for a normalized solid. */
function cellsKey(solid: Polycube): string {
  return solid
    .map((c) => `${c.x},${c.y},${c.z}`)
    .sort()
    .join('|');
}

/**
 * Canonical form under the 24 rotations: the lexicographically smallest
 * normalized cell key over every rotation. Two solids are rotation-equivalent
 * iff their canonical keys are equal.
 */
export function canonicalForm(solid: Polycube): Polycube {
  let best: string | null = null;
  let bestSolid: Polycube = solid;
  for (const m of ROTATIONS) {
    const o = normalize(transform(solid, m));
    const key = cellsKey(o);
    if (best === null || key < best) {
      best = key;
      bestSolid = o;
    }
  }
  return bestSolid;
}

export function canonicalKey(solid: Polycube): string {
  return cellsKey(canonicalForm(solid));
}

/** True if `a` can be rotated (no reflection) to coincide with `b`. */
export function isRotationCongruent(a: Polycube, b: Polycube): boolean {
  if (a.length !== b.length) return false;
  return canonicalKey(a) === canonicalKey(b);
}

/** Reflect a solid across the x = 0 plane (a chirality flip). */
export function reflect(solid: Polycube): Polycube {
  return solid.map((c) => ({ x: -c.x, y: c.y, z: c.z }));
}

/**
 * A solid is chiral when its mirror image is NOT a rotation of itself — i.e. the
 * mirror is a genuinely different orientation. Only chiral solids make the
 * "mirror" distractor a valid trap and rotations unambiguously distinguishable.
 */
export function isChiral(solid: Polycube): boolean {
  return canonicalKey(solid) !== canonicalKey(reflect(solid));
}

/** A random rotation drawn from the 24. */
export function randomRotation(rng: Rng): Mat {
  return rng.pick(ROTATIONS);
}

/**
 * Every distinct normalized orientation of a solid under the 24 rotations.
 * Deduplicated by cell key, so a symmetric solid yields fewer than 24.
 */
export function orientations(solid: Polycube): Polycube[] {
  const seen = new Set<string>();
  const out: Polycube[] = [];
  for (const m of ROTATIONS) {
    const o = normalize(transform(solid, m));
    const k = cellsKey(o);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(o);
    }
  }
  return out;
}

/**
 * Apply a random rotation, then (optionally) keep drawing until the projected
 * silhouette differs from `avoid` so the correct choice never renders as a
 * pixel-identical copy of the reference.
 */
export function orientDistinct(solid: Polycube, rng: Rng, avoidKey: string): Polycube {
  for (let i = 0; i < 24; i++) {
    const r = transform(solid, randomRotation(rng));
    if (cellsKey(normalize(r)) !== avoidKey) return normalize(r);
  }
  return normalize(transform(solid, randomRotation(rng)));
}

export { cellsKey };

// ---- mutation helpers (used to build distractors) ----

const NEIGHBOUR_OFFSETS: Cell[] = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
];

function has(set: Set<string>, c: Cell): boolean {
  return set.has(`${c.x},${c.y},${c.z}`);
}

function toSet(solid: Polycube): Set<string> {
  return new Set(solid.map((c) => `${c.x},${c.y},${c.z}`));
}

/** Cells whose removal keeps the remaining solid face-connected. */
function connected(solid: Polycube): boolean {
  if (solid.length <= 1) return true;
  const set = toSet(solid);
  const seen = new Set<string>();
  const start = `${solid[0]!.x},${solid[0]!.y},${solid[0]!.z}`;
  const queue = [solid[0]!];
  seen.add(start);
  while (queue.length) {
    const c = queue.shift()!;
    for (const o of NEIGHBOUR_OFFSETS) {
      const n = { x: c.x + o.x, y: c.y + o.y, z: c.z + o.z };
      const k = `${n.x},${n.y},${n.z}`;
      if (set.has(k) && !seen.has(k)) {
        seen.add(k);
        queue.push(n);
      }
    }
  }
  return seen.size === solid.length;
}

/** Remove one cell, keeping the solid connected. Returns null if impossible. */
export function removeBlock(solid: Polycube, rng: Rng): Polycube | null {
  const order = rng.shuffle(solid.map((_, i) => i));
  for (const i of order) {
    const candidate = solid.filter((_, j) => j !== i);
    if (candidate.length >= 2 && connected(candidate)) return normalize(candidate);
  }
  return null;
}

/** Add one cell on a free face-adjacent position. */
export function addBlock(solid: Polycube, rng: Rng): Polycube | null {
  const set = toSet(solid);
  const candidates: Cell[] = [];
  for (const c of solid) {
    for (const o of NEIGHBOUR_OFFSETS) {
      const n = { x: c.x + o.x, y: c.y + o.y, z: c.z + o.z };
      if (!has(set, n)) candidates.push(n);
    }
  }
  if (candidates.length === 0) return null;
  const add = rng.pick(candidates);
  return normalize([...solid.map((c) => ({ ...c })), add]);
}

/**
 * Relocate one block: remove a removable cell and re-attach it at a different
 * free face-adjacent spot, keeping cell count the same but changing the shape.
 */
export function moveBlock(solid: Polycube, rng: Rng): Polycube | null {
  const reduced = removeBlock(solid, rng);
  if (!reduced) return null;
  const grown = addBlock(reduced, rng);
  if (!grown) return null;
  // Guard: must not accidentally reproduce the original shape.
  if (isRotationCongruent(grown, solid)) return null;
  return grown;
}

/**
 * Stretch the solid by duplicating it shifted one step along an axis where it is
 * thin — lengthens a run so the proportions read wrong.
 */
export function stretch(solid: Polycube, rng: Rng): Polycube | null {
  const axis = rng.pick(['x', 'y', 'z'] as const);
  const set = toSet(solid);
  const out = solid.map((c) => ({ ...c }));
  let added = 0;
  for (const c of solid) {
    const n = { ...c, [axis]: c[axis] + 1 } as Cell;
    if (!has(set, n)) {
      out.push(n);
      set.add(`${n.x},${n.y},${n.z}`);
      added++;
    }
  }
  if (added === 0) return null;
  return normalize(out);
}
