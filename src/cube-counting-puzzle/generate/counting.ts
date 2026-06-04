import type { Arrangement } from '../types';
import { isVisible, occupancySet, faceVisibility } from './iso';

/** Total cubes including hidden support cubes — the correct answer. */
export function totalCubes(a: Arrangement): number {
  return a.total;
}

/** Cubes with at least one exposed camera-facing neighbor. */
export function visibleCubes(a: Arrangement): number {
  const occ = occupancySet(a.cells);
  let n = 0;
  for (const c of a.cells) if (isVisible(c, occ)) n++;
  return n;
}

/** Fully enclosed cubes a solver tends to forget. */
export function hiddenCubes(a: Arrangement): number {
  return a.total - visibleCubes(a);
}

/** Number of occupied columns (the top-surface footprint). */
export function footprintCubes(a: Arrangement): number {
  let n = 0;
  for (let x = 0; x < a.cols; x++)
    for (let y = 0; y < a.rows; y++) if (a.height[x]![y]! > 0) n++;
  return n;
}

/** Count of every exposed square face — what you get counting faces, not cubes. */
export function faceTiles(a: Arrangement): number {
  const occ = occupancySet(a.cells);
  let n = 0;
  for (const c of a.cells) {
    const v = faceVisibility(c, occ);
    if (v.top) n++;
    if (v.right) n++;
    if (v.left) n++;
  }
  return n;
}
