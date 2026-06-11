/**
 * D4-canonical form of a cols×rows heightmap. A staircase facing left and one
 * facing right are the *same* puzzle to a solver, so for anti-repeat purposes we
 * collapse a heightmap over its dihedral group (4 rotations × 2 reflections = 8
 * orientations) and keep the lexicographically-smallest flattened string. Two
 * heightmaps that are rotations/reflections of each other therefore share one
 * canonical signature.
 */

type Grid = number[][]; // grid[x][y], x in [0,cols), y in [0,rows)

function rotate90(g: Grid, cols: number, rows: number): Grid {
  // New grid is rows×cols. (x,y) -> (rows-1-y, x).
  const out: Grid = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      out[rows - 1 - y]![x] = g[x]![y]!;
    }
  }
  return out;
}

function reflectX(g: Grid, cols: number, rows: number): Grid {
  const out: Grid = Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      out[cols - 1 - x]![y] = g[x]![y]!;
    }
  }
  return out;
}

function flatten(g: Grid): string {
  const c = g.length;
  const r = c > 0 ? g[0]!.length : 0;
  const parts: string[] = [`${c}x${r}`];
  for (let x = 0; x < c; x++) parts.push(g[x]!.join(','));
  return parts.join('|');
}

/**
 * Normalize a heightmap over the D4 symmetry group and return the
 * lexicographically-smallest flattened string. Dimensions are folded into the
 * string so a 2×3 and a 3×2 (a rotation of each other) compare correctly.
 */
export function canonicalHeightmap(height: Grid): string {
  const cols = height.length;
  const rows = cols > 0 ? height[0]!.length : 0;

  let best: string | null = null;
  // Generate all 8 orientations: 4 rotations of the original + 4 of its mirror.
  for (const seed of [height, reflectX(height, cols, rows)]) {
    let g = seed;
    let c = g.length;
    let r = c > 0 ? g[0]!.length : 0;
    for (let i = 0; i < 4; i++) {
      const s = flatten(g);
      if (best === null || s < best) best = s;
      g = rotate90(g, c, r);
      // dimensions swap after a 90° turn
      const nc = r;
      const nr = c;
      c = nc;
      r = nr;
    }
  }
  return best!;
}
