import type { Arrangement, Cell, Difficulty } from '../types';
import type { Rng } from './rng';
import { hiddenCubes } from './counting';

type Archetype =
  | 'box'
  | 'staircase'
  | 'pyramid'
  | 'tower-on-box'
  | 'l-prism'
  | 'frame'
  | 'well'
  | 'plus';

type Cfg = {
  cols: [number, number]; // inclusive footprint width range
  rows: [number, number]; // inclusive footprint depth range
  hMin: number;
  hMax: number;
  archetypes: Archetype[];
  totalMin: number;
  totalMax: number;
  hiddenMin: number; // require at least this many enclosed cubes
};

// Only readable, unambiguous archetypes per tier — no random per-column noise,
// no carving. Difficulty scales size/height, not messiness.
export const DIFFICULTY_CONFIG: Record<Difficulty, Cfg> = {
  easy: {
    cols: [2, 3],
    rows: [2, 3],
    hMin: 1,
    hMax: 3,
    archetypes: ['box', 'staircase', 'pyramid'],
    totalMin: 4,
    totalMax: 14,
    hiddenMin: 1,
  },
  normal: {
    cols: [3, 4],
    rows: [3, 4],
    hMin: 1,
    hMax: 4,
    archetypes: ['box', 'staircase', 'pyramid', 'tower-on-box', 'l-prism', 'plus'],
    totalMin: 10,
    totalMax: 30,
    hiddenMin: 3,
  },
  hard: {
    cols: [4, 5],
    rows: [4, 5],
    hMin: 1,
    hMax: 5,
    archetypes: ['box', 'staircase', 'pyramid', 'tower-on-box', 'l-prism', 'plus', 'frame', 'well'],
    totalMin: 18,
    totalMax: 60,
    hiddenMin: 6,
  },
};

const MAX_ATTEMPTS = 120;

function zeros(cols: number, rows: number): number[][] {
  return Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
}

function clampH(h: number, cfg: Cfg): number {
  return Math.max(0, Math.min(cfg.hMax, h));
}

function materialize(cols: number, rows: number, height: number[][]): Arrangement {
  const cells: Cell[] = [];
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const h = height[x]![y]!;
      for (let z = 0; z < h; z++) cells.push({ x, y, z });
    }
  }
  return { cols, rows, height, cells, total: cells.length };
}

// ---- archetype builders (each returns a heightmap) ----

function buildBox(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  const h = rng.int(Math.max(2, cfg.hMin), cfg.hMax + 1);
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) height[x]![y] = h;
  return height;
}

function buildStaircase(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  const dir = rng.pick(['x+', 'x-', 'y+', 'y-', 'xy'] as const);
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let step: number;
      switch (dir) {
        case 'x+': step = x; break;
        case 'x-': step = cols - 1 - x; break;
        case 'y+': step = y; break;
        case 'y-': step = rows - 1 - y; break;
        default: step = x + y; break; // 'xy'
      }
      height[x]![y] = clampH(cfg.hMin + step, cfg);
    }
  }
  return height;
}

function buildPyramid(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // Apex at a corner or (for big enough footprints) the centre. Height falls off
  // by 1 per Chebyshev ring — a clean stepped pyramid.
  const useCenter = cols >= 3 && rows >= 3 && rng.bool();
  const ax = useCenter ? (cols - 1) / 2 : rng.pick([0, cols - 1]);
  const ay = useCenter ? (rows - 1) / 2 : rng.pick([0, rows - 1]);
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const dist = Math.max(Math.abs(x - ax), Math.abs(y - ay));
      height[x]![y] = clampH(cfg.hMax - Math.floor(dist), cfg);
      if (height[x]![y]! < 1) height[x]![y] = 1; // keep footprint solid
    }
  }
  return height;
}

function buildTowerOnBox(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  const base = rng.int(1, Math.max(2, cfg.hMax)); // [1, hMax-1] so the cap shows
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) height[x]![y] = base;

  // A contiguous sub-rectangle pinned to a corner gets stacked higher.
  const sw = rng.int(1, cols + 1);
  const sh = rng.int(1, rows + 1);
  const atRight = rng.bool();
  const atFront = rng.bool();
  const x0 = atRight ? cols - sw : 0;
  const y0 = atFront ? rows - sh : 0;
  const area = sw * sh;
  const bump = area === 1 ? 1 : rng.int(1, 3); // avoid 1×1 spikes taller than +1
  for (let x = x0; x < x0 + sw; x++) {
    for (let y = y0; y < y0 + sh; y++) height[x]![y] = clampH(base + bump, cfg);
  }
  return height;
}

function buildLPrism(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  const h = rng.int(2, cfg.hMax + 1); // uniform, ≥2 so the thick part hides cubes
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) height[x]![y] = h;

  // Remove a corner rectangle (clean notch — keeps the rest 4-connected).
  const cw = rng.int(1, cols); // 1..cols-1
  const ch = rng.int(1, rows); // 1..rows-1
  const atRight = rng.bool();
  const atFront = rng.bool();
  const x0 = atRight ? cols - cw : 0;
  const y0 = atFront ? rows - ch : 0;
  for (let x = x0; x < x0 + cw; x++) {
    for (let y = y0; y < y0 + ch; y++) height[x]![y] = 0;
  }
  return height;
}

function buildFrame(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // Solid outer rectangle with the inner rectangle removed to the floor — a
  // hollow ring/frame. Wall thickness 1 keeps the inner hole ≥2 wide for
  // footprints ≥4×4 (so it reads, and passes isReadable). ⇒ fig 8–10, 19
  const h = rng.int(2, cfg.hMax + 1);
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) height[x]![y] = h;
  for (let x = 1; x < cols - 1; x++) {
    for (let y = 1; y < rows - 1; y++) height[x]![y] = 0;
  }
  return height;
}

function buildWell(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // Box with a sunken centre — a recessed well you look down into. ⇒ fig 14–16
  const wall = rng.int(3, cfg.hMax + 1);
  const inner = rng.int(1, wall); // [1, wall-1] → a visible recess
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) height[x]![y] = wall;
  for (let x = 1; x < cols - 1; x++) {
    for (let y = 1; y < rows - 1; y++) height[x]![y] = inner;
  }
  return height;
}

function buildPlus(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // A plus/cross footprint extruded, optionally with a raised centre. ⇒ fig 17–18
  const h = rng.int(2, cfg.hMax + 1);
  const midXs = cols % 2 ? [(cols - 1) / 2] : [cols / 2 - 1, cols / 2];
  const midYs = rows % 2 ? [(rows - 1) / 2] : [rows / 2 - 1, rows / 2];
  const onBar = (x: number, y: number) => midXs.includes(x) || midYs.includes(y);
  const bump = rng.int(0, 3); // 0..2 extra cubes stacked on the centre
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (!onBar(x, y)) continue;
      const center = midXs.includes(x) && midYs.includes(y);
      height[x]![y] = clampH(h + (center ? bump : 0), cfg);
    }
  }
  return height;
}

function buildArchetype(kind: Archetype, cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  switch (kind) {
    case 'box': return buildBox(cols, rows, rng, cfg);
    case 'staircase': return buildStaircase(cols, rows, rng, cfg);
    case 'pyramid': return buildPyramid(cols, rows, rng, cfg);
    case 'tower-on-box': return buildTowerOnBox(cols, rows, rng, cfg);
    case 'l-prism': return buildLPrism(cols, rows, rng, cfg);
    case 'frame': return buildFrame(cols, rows, rng, cfg);
    case 'well': return buildWell(cols, rows, rng, cfg);
    case 'plus': return buildPlus(cols, rows, rng, cfg);
  }
}

// ---- validity / readability ----

/** True when all occupied columns form one 4-connected footprint region. */
export function isConnected(cols: number, rows: number, height: number[][]): boolean {
  const occupied: Array<[number, number]> = [];
  for (let x = 0; x < cols; x++)
    for (let y = 0; y < rows; y++) if (height[x]![y]! > 0) occupied.push([x, y]);
  if (occupied.length === 0) return false;

  const seen = new Set<string>();
  const stack = [occupied[0]!];
  seen.add(`${occupied[0]![0]},${occupied[0]![1]}`);
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (
        nx >= 0 &&
        nx < cols &&
        ny >= 0 &&
        ny < rows &&
        height[nx]![ny]! > 0 &&
        !seen.has(key)
      ) {
        seen.add(key);
        stack.push([nx, ny]);
      }
    }
  }
  return seen.size === occupied.length;
}

/**
 * Reject heightmaps that read ambiguously in isometric view:
 *  - interior hole: an empty column enclosed by occupied columns on all 4 sides,
 *  - deep pit: an occupied column ≥2 lower than occupied neighbors on opposite sides,
 *  - isolated spike: an occupied column ≥2 taller than every occupied neighbor.
 * The archetypes never produce these; this is a defensive guard + test contract.
 */
export function isReadable(cols: number, rows: number, height: number[][]): boolean {
  const at = (x: number, y: number): number | null =>
    x >= 0 && x < cols && y >= 0 && y < rows ? height[x]![y]! : null;

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const h = height[x]![y]!;
      const l = at(x - 1, y);
      const r = at(x + 1, y);
      const u = at(x, y - 1);
      const d = at(x, y + 1);

      // interior hole
      if (h === 0 && l && r && u && d) return false;
      if (h === 0) continue;

      // deep pit: hemmed in on an axis by taller columns
      if (l && r && l - h >= 2 && r - h >= 2) return false;
      if (u && d && u - h >= 2 && d - h >= 2) return false;

      // isolated spike: every occupied neighbor is ≥2 shorter
      const occ = [l, r, u, d].filter((v): v is number => v !== null && v > 0);
      if (occ.length > 0 && occ.every((v) => h - v >= 2)) return false;
    }
  }
  return true;
}

function solidFallback(cfg: Cfg): Arrangement {
  // A small solid box at the minimum footprint, height 2 — guaranteed connected,
  // readable, support-valid, within the total range and with enough hidden cubes.
  const cols = cfg.cols[0];
  const rows = cfg.rows[0];
  const h = 2;
  const height = Array.from({ length: cols }, () => new Array<number>(rows).fill(h));
  return materialize(cols, rows, height);
}

/** Generate a readable, support-valid cube stack meeting the difficulty constraints. */
export function buildArrangement(difficulty: Difficulty, rng: Rng): Arrangement {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const cols = rng.int(cfg.cols[0], cfg.cols[1] + 1);
    const rows = rng.int(cfg.rows[0], cfg.rows[1] + 1);
    const kind = rng.pick(cfg.archetypes);
    const height = buildArchetype(kind, cols, rows, rng, cfg);

    if (!isConnected(cols, rows, height)) continue;
    if (!isReadable(cols, rows, height)) continue;
    const a = materialize(cols, rows, height);
    if (a.total < cfg.totalMin || a.total > cfg.totalMax) continue;
    // Solid convex shapes earn their difficulty from hidden support cubes, so
    // require a minimum. Structural shapes (rings/wells/cross/L) are challenging
    // through their geometry instead — exempt them from the hidden floor.
    const structural =
      kind === 'frame' || kind === 'well' || kind === 'plus' || kind === 'l-prism';
    if (!structural && hiddenCubes(a) < cfg.hiddenMin) continue;
    return a;
  }
  return solidFallback(cfg);
}
