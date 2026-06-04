import type { Block, Vec3 } from '../types';
import { boxCells, buildOccupancy, cellKey, hasOcclusionCycle, step, type Face } from './geometry';

/** Fraction of cells allowed to be hidden behind the front layer — caps figure depth. */
const MAX_HIDDEN_RATIO = 0.5;
/** The three camera-facing face directions in this isometric view. */
const CAMERA_FACES: readonly Face[] = [
  { axis: 'x', dir: 1 },
  { axis: 'y', dir: 1 },
  { axis: 'z', dir: 1 },
];

/**
 * In this isometric projection the view direction (1,1,1) collapses to a single
 * screen point, so a cell at `c` is fully hidden iff some occupied cell sits at
 * `c + t·(1,1,1)` for t ≥ 1 (directly in front of it). A cell with nothing in
 * front is "front-most" and is guaranteed to show at least its hexagon centre —
 * i.e. the owning block is genuinely visible in the drawing.
 */
export function frontMostCellsByBlock(blocks: Block[]): Map<number, Vec3[]> {
  const occ = buildOccupancy(blocks);
  let maxX = 0;
  let maxY = 0;
  let maxZ = 0;
  for (const b of blocks) {
    maxX = Math.max(maxX, b.origin.x + b.size.x);
    maxY = Math.max(maxY, b.origin.y + b.size.y);
    maxZ = Math.max(maxZ, b.origin.z + b.size.z);
  }
  const result = new Map<number, Vec3[]>();
  for (const b of blocks) result.set(b.id, []);

  for (const b of blocks) {
    for (const c of boxCells(b)) {
      let hidden = false;
      for (let t = 1; ; t++) {
        const ahead: Vec3 = { x: c.x + t, y: c.y + t, z: c.z + t };
        if (ahead.x >= maxX || ahead.y >= maxY || ahead.z >= maxZ) break;
        if (occ.has(cellKey(ahead))) {
          hidden = true;
          break;
        }
      }
      if (!hidden) result.get(b.id)!.push(c);
    }
  }
  return result;
}

export function frontMostCellCount(blocks: Block[]): Map<number, number> {
  const cells = frontMostCellsByBlock(blocks);
  return new Map([...cells].map(([id, cs]) => [id, cs.length]));
}

/** Is this block elongated (a beam) rather than a unit cube? */
function isBeam(block: Block): boolean {
  return block.size.x > 1 || block.size.y > 1 || block.size.z > 1;
}

/**
 * A layout is readable — and answerable from the single static view — when:
 *  1. it has a valid draw order (no mutually-occluding "weave"),
 *  2. every block has a front-most (visible) cell (beams ≥2 so length reads),
 *  3. every block shows at least one camera-facing face to empty space (you can
 *     actually see a real face of each block, not just a sliver behind others),
 *  4. at most half the cells are hidden behind the front layer (keeps the figure
 *     shallow, so fewer contacts sit on faces the solver can't see).
 * Conservative on purpose — the generator's retry loop discards layouts that fail.
 */
export function isReadable(blocks: Block[]): boolean {
  if (hasOcclusionCycle(blocks)) return false;

  const frontByBlock = frontMostCellsByBlock(blocks);
  const occ = buildOccupancy(blocks);

  let cellTotal = 0;
  let frontTotal = 0;
  for (const b of blocks) {
    const front = frontByBlock.get(b.id) ?? [];
    const visible = front.length;
    if (visible < 1) return false;
    if (isBeam(b) && visible < 2) return false;

    // Rule 3: a front-most cell with an empty camera-facing neighbour is a face you can see.
    const showsFace = front.some((c) => CAMERA_FACES.some((f) => !occ.has(cellKey(step(c, f)))));
    if (!showsFace) return false;

    cellTotal += b.size.x * b.size.y * b.size.z;
    frontTotal += visible;
  }

  // Rule 4: cap hidden volume.
  if (cellTotal > 0 && (cellTotal - frontTotal) / cellTotal > MAX_HIDDEN_RATIO) return false;

  return true;
}
