import type { Rng } from '../../rotation-puzzle/generate/rng';
import type { Cell, Difficulty, Polycube } from '../types';
import { isChiral, normalize, orientations } from './polycube';
import { hiddenCellCount, renderSignature } from './iso';

/** Distinct fully-visible orientations (no hidden cube) of a solid. */
export function fullyVisibleOrientations(solid: Polycube): Polycube[] {
  const out: Polycube[] = [];
  const seenSig = new Set<string>();
  for (const o of orientations(solid)) {
    if (hiddenCellCount(o) !== 0) continue;
    const sig = renderSignature(o);
    if (seenSig.has(sig)) continue; // same picture — not a useful extra view
    seenSig.add(sig);
    out.push(o);
  }
  return out;
}

type SizeSpec = { cells: number; maxDim: number };

const SPEC: Record<Difficulty, SizeSpec> = {
  easy: { cells: 4, maxDim: 3 },
  normal: { cells: 5, maxDim: 3 },
  hard: { cells: 6, maxDim: 3 },
};

const OFFSETS: Cell[] = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
];

function extent(cells: Cell[]): { x: number; y: number; z: number } {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const c of cells) {
    minX = Math.min(minX, c.x);
    maxX = Math.max(maxX, c.x);
    minY = Math.min(minY, c.y);
    maxY = Math.max(maxY, c.y);
    minZ = Math.min(minZ, c.z);
    maxZ = Math.max(maxZ, c.z);
  }
  return { x: maxX - minX + 1, y: maxY - minY + 1, z: maxZ - minZ + 1 };
}

/** Grow a connected polycube of `count` cells within a `maxDim` cube. */
function grow(rng: Rng, count: number, maxDim: number): Polycube | null {
  const cells: Cell[] = [{ x: 0, y: 0, z: 0 }];
  const set = new Set<string>(['0,0,0']);
  let attempts = 0;
  while (cells.length < count && attempts < 400) {
    attempts++;
    const base = rng.pick(cells);
    const o = rng.pick(OFFSETS);
    const n = { x: base.x + o.x, y: base.y + o.y, z: base.z + o.z };
    const k = `${n.x},${n.y},${n.z}`;
    if (set.has(k)) continue;
    const trial = [...cells, n];
    const e = extent(trial);
    if (e.x > maxDim || e.y > maxDim || e.z > maxDim) continue;
    cells.push(n);
    set.add(k);
  }
  return cells.length === count ? normalize(cells) : null;
}

/**
 * A chiral base solid for the given difficulty. Chirality guarantees the mirror
 * distractor is a genuinely different orientation (not secretly a rotation) and
 * that the correct rotated choice is unambiguous.
 */
export function generateBase(difficulty: Difficulty, rng: Rng): Polycube {
  const { cells, maxDim } = SPEC[difficulty];
  for (let i = 0; i < 300; i++) {
    const solid = grow(rng, cells, maxDim);
    if (!solid) continue;
    // Require some height variation so it reads as a 3D block, not a flat tile.
    const e = extent(solid);
    const spreadAxes = [e.x > 1, e.y > 1, e.z > 1].filter(Boolean).length;
    if (spreadAxes < 2) continue;
    if (!isChiral(solid)) continue;
    // Need ≥2 distinct fully-visible views so the reference and the correct
    // (re-oriented) choice can each show every cube while looking different.
    if (fullyVisibleOrientations(solid).length < 2) continue;
    return solid;
  }
  // Fallback: a known chiral hexomino "screw" shape (always chiral).
  return normalize([
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 1, y: 1, z: 0 },
    { x: 1, y: 1, z: 1 },
  ]);
}
