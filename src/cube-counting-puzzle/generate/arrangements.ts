import type { Archetype, Arrangement, Cell, Difficulty } from '../types';
import type { Rng } from './rng';
import { hiddenCubes } from './counting';

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
    cols: [2, 4],
    rows: [2, 3],
    hMin: 1,
    hMax: 3,
    archetypes: [
      'box', 'staircase', 'pyramid', 't-prism', 'step-pyramid', 'zigzag-ridge',
      'checkerboard', 'chevron', 'double-stair', 'wall-pair',
    ],
    totalMin: 4,
    totalMax: 16,
    hiddenMin: 1,
  },
  normal: {
    cols: [3, 4],
    rows: [3, 4],
    hMin: 1,
    hMax: 4,
    archetypes: [
      'box', 'staircase', 'pyramid', 'tower-on-box', 'l-prism', 'plus',
      't-prism', 'two-towers', 'step-pyramid', 'stepped-l', 'zigzag-ridge', 'pinwheel',
      'spine', 'h-prism', 'crown', 'trench', 'ridge-valley', 'corner-step', 'two-ridges',
      's-shape',
    ],
    totalMin: 10,
    totalMax: 30,
    hiddenMin: 3,
  },
  hard: {
    cols: [4, 5],
    rows: [4, 5],
    hMin: 1,
    hMax: 5,
    archetypes: [
      'box', 'staircase', 'pyramid', 'tower-on-box', 'l-prism', 'plus',
      'frame', 'well', 'u-shape', 'two-towers', 't-prism', 'step-pyramid',
      'stepped-l', 'tunnel', 'zigzag-ridge', 'double-well', 'pinwheel',
      'battlement', 'tri-tower', 'diamond-mound', 'wave', 'diagonal-split',
      'x-cross', 's-shape', 'arrow', 'diamond-prism',
    ],
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

function materialize(
  archetype: Archetype,
  cols: number,
  rows: number,
  height: number[][],
): Arrangement {
  const cells: Cell[] = [];
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const h = height[x]![y]!;
      for (let z = 0; z < h; z++) cells.push({ x, y, z });
    }
  }
  return { archetype, cols, rows, height, cells, total: cells.length };
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

function buildUShape(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // Solid box with a rectangular bite taken out of the middle of one boundary
  // edge, down to the floor — a U / channel that opens to the outside (never an
  // enclosed hole, so it stays readable). Needs ≥3 along the notched axis to
  // leave a wall on each side of the opening.
  const h = rng.int(2, cfg.hMax + 1);
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) height[x]![y] = h;

  // Pick which boundary edge the mouth opens on. Notch runs inward from that edge.
  const edge = rng.pick(['x-', 'x+', 'y-', 'y+'] as const);
  const horizontal = edge === 'y-' || edge === 'y+';
  const along = horizontal ? cols : rows; // axis parallel to the opening edge
  const deep = horizontal ? rows : cols; // axis the notch cuts into
  if (along < 3 || deep < 2) return height; // too small to notch readably → plain box

  // Opening width 1..along-2 (leave ≥1 wall each side), centred-ish via offset.
  const w = rng.int(1, along - 1);
  const off = rng.int(1, along - w); // 1..along-1-w → walls on both sides
  // Notch depth 1..deep-1 (leave the back wall intact, keeping it connected).
  const depth = rng.int(1, deep);

  for (let i = 0; i < w; i++) {
    for (let j = 0; j < depth; j++) {
      const a = off + i; // position along the opening edge
      let x: number;
      let y: number;
      switch (edge) {
        case 'y-': x = a; y = j; break;
        case 'y+': x = a; y = rows - 1 - j; break;
        case 'x-': x = j; y = a; break;
        default: x = cols - 1 - j; y = a; break; // 'x+'
      }
      height[x]![y] = 0;
    }
  }
  return height;
}

function buildTwoTowers(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // A low base slab with two raised pads at opposite corners — connected through
  // the slab. Each pad is ≥2 columns wide so no pad column is an isolated spike
  // (its same-pad neighbour is equal height). ⇒ two-tower silhouette.
  const base = rng.int(1, Math.max(2, cfg.hMax - 1)); // [1, hMax-2] so pads show above
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) height[x]![y] = base;

  const padW = Math.min(cols, rng.int(1, 3)); // 1..2
  const padH = Math.min(rows, rng.int(1, 3));
  const bump = rng.int(1, 3); // +1..+2 above the base
  // Pad A at the (0,0) corner, pad B at the far corner — diagonally apart.
  const place = (x0: number, y0: number) => {
    for (let x = x0; x < x0 + padW; x++) {
      for (let y = y0; y < y0 + padH; y++) height[x]![y] = clampH(base + bump, cfg);
    }
  };
  place(0, 0);
  place(cols - padW, rows - padH);
  return height;
}

function buildTPrism(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // A T-shaped footprint extruded to a uniform height: one full edge bar plus a
  // perpendicular stem reaching the opposite edge. Uniform height ⇒ no pits or
  // spikes; the footprint gaps sit at the boundary corners, never enclosed.
  const h = rng.int(2, cfg.hMax + 1);
  const height = zeros(cols, rows);
  const edge = rng.pick(['y-', 'y+', 'x-', 'x+'] as const);
  const horizontal = edge === 'y-' || edge === 'y+';
  // Stem column/row index, kept off the very ends where possible so the T reads.
  const stemX = horizontal ? (cols % 2 ? (cols - 1) / 2 : cols / 2 - 1 + (rng.bool() ? 1 : 0)) : 0;
  const stemY = horizontal ? 0 : rows % 2 ? (rows - 1) / 2 : rows / 2 - 1 + (rng.bool() ? 1 : 0);

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let onBar = false;
      let onStem = false;
      switch (edge) {
        case 'y-': onBar = y === 0; onStem = x === stemX; break;
        case 'y+': onBar = y === rows - 1; onStem = x === stemX; break;
        case 'x-': onBar = x === 0; onStem = y === stemY; break;
        default: onBar = x === cols - 1; onStem = y === stemY; break; // 'x+'
      }
      if (onBar || onStem) height[x]![y] = h;
    }
  }
  return height;
}

function buildStepPyramid(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // Concentric square terraces: each Chebyshev ring inward is exactly 1 taller,
  // capped by a flat plateau. Monotonic ±1 steps ⇒ always readable, and the
  // solid footprint hides a stack of support cubes under each terrace.
  const ax = (cols - 1) / 2;
  const ay = (rows - 1) / 2;
  const maxRing = Math.max(ax, ay);
  // Lift the whole terrace by 0 or 1 — a uniform shift keeps the ±1 ring steps
  // (and thus readability) while varying the silhouette and hidden-cube count.
  const lift = rng.int(0, 2);
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const ring = Math.floor(Math.min(maxRing, Math.max(Math.abs(x - ax), Math.abs(y - ay))));
      // Outer ring = 1 (+lift), each step inward +1, capped at hMax.
      const h = clampH(cfg.hMin + lift + (Math.floor(maxRing) - ring), cfg);
      height[x]![y] = Math.max(1, h);
    }
  }
  return height;
}

function buildSteppedL(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // An L-shaped footprint (corner notch removed) extruded to a uniform height,
  // then the short arm lifted one step taller — a two-tier L. The +1 step keeps
  // it readable (no ≥2 jump), and the L footprint hides support cubes.
  const base = rng.int(1, cfg.hMax); // [1, hMax-1] so the +1 step still fits
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) height[x]![y] = base;

  // Remove a corner rectangle (1..cols-1 × 1..rows-1) → an L footprint.
  const cw = rng.int(1, cols);
  const ch = rng.int(1, rows);
  const atRight = rng.bool();
  const atFront = rng.bool();
  const nx0 = atRight ? cols - cw : 0;
  const ny0 = atFront ? rows - ch : 0;
  for (let x = nx0; x < nx0 + cw; x++) {
    for (let y = ny0; y < ny0 + ch; y++) height[x]![y] = 0;
  }

  // Lift one full edge band (the arm opposite the notch) by +1 so the L reads
  // as two tiers. Band runs along the edge farthest from the removed corner.
  const lift = clampH(base + 1, cfg);
  if (atRight) {
    for (let y = 0; y < rows; y++) if (height[0]![y]! > 0) height[0]![y] = lift;
  } else {
    for (let y = 0; y < rows; y++) if (height[cols - 1]![y]! > 0) height[cols - 1]![y] = lift;
  }
  return height;
}

function buildTunnel(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // A solid box with a one-column-deep channel cut straight through from one
  // boundary edge to the opposite edge (a tunnel/arch mouth at both ends). The
  // channel touches the outside on both ends, so it's never an enclosed hole.
  const h = rng.int(2, cfg.hMax + 1);
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) height[x]![y] = h;

  const alongX = rng.bool();
  if (alongX) {
    if (rows < 3) return height; // need a wall on each side of the channel
    const y = rng.int(1, rows - 1); // 1..rows-2 → interior lane, walls both sides
    for (let x = 0; x < cols; x++) height[x]![y] = 0;
  } else {
    if (cols < 3) return height;
    const x = rng.int(1, cols - 1);
    for (let y = 0; y < rows; y++) height[x]![y] = 0;
  }
  return height;
}

function buildZigzagRidge(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // Alternating-height ridges running along one axis: each row (or column) is one
  // step taller or shorter than its neighbor, but only by ±1 so it stays readable.
  // A corrugated roof of cubes — every column has a hidden support stack.
  const lo = Math.max(1, cfg.hMin);
  const hi = clampH(lo + 1, cfg);
  const alongRows = rng.bool();
  const phase = rng.int(0, 2);
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const idx = alongRows ? y : x;
      height[x]![y] = (idx + phase) % 2 === 0 ? hi : lo;
    }
  }
  return height;
}

function buildDoubleWell(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // A box with two separate single-column recesses sunk one step into the top
  // surface, placed apart so neither is hemmed on opposite sides. The −1 dip
  // keeps it readable (no deep pit), and the solid footprint hides support cubes.
  const wall = rng.int(2, cfg.hMax + 1);
  const inner = clampH(wall - 1, cfg); // exactly one step down → visible, not a pit
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) height[x]![y] = wall;
  if (cols < 3 || rows < 2) return height; // too small to dent readably → plain box

  // Two interior cells on the same interior row, separated by a wall column.
  const y = rng.int(1, rows - 1); // interior depth (so it's not on the very edge if possible)
  const yy = Math.min(rows - 1, Math.max(0, y));
  const ax = 0; // dips at opposite ends of the row, with the box wall between them
  const bx = cols - 1;
  height[ax]![yy] = inner;
  height[bx]![yy] = inner;
  return height;
}

function buildPinwheel(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // A low solid base with four short arms reaching out toward the edge midpoints,
  // each arm offset by a quarter-turn — a rotor silhouette. Arms sit one step
  // above the base (±1, readable) and the whole footprint is solid (hidden cubes).
  const base = rng.int(1, cfg.hMax); // [1, hMax-1] so arms show +1 above
  const arm = clampH(base + 1, cfg);
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) height[x]![y] = base;

  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  // Four arms, each a 2-cell stub rotated 90° from the previous — a pinwheel.
  const lift = (x: number, y: number) => {
    if (x >= 0 && x < cols && y >= 0 && y < rows) height[x]![y] = arm;
  };
  lift(cx, 0); lift(cx, 1); // up arm
  lift(cols - 1, cy); lift(cols - 2, cy); // right arm
  lift(cx, rows - 1); lift(cx, rows - 2); // down arm
  lift(0, cy); lift(1, cy); // left arm
  return height;
}

// ---- new archetype builders ----

function buildCheckerboard(cols: number, rows: number, _rng: Rng, cfg: Cfg): number[][] {
  const lo = Math.max(1, cfg.hMin);
  const hi = clampH(lo + 1, cfg);
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++)
    for (let y = 0; y < rows; y++) height[x]![y] = (x + y) % 2 === 0 ? hi : lo;
  return height;
}

function buildChevron(cols: number, rows: number, _rng: Rng, cfg: Cfg): number[][] {
  const cx = (cols - 1) / 2;
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++)
    for (let y = 0; y < rows; y++)
      height[x]![y] = clampH(cfg.hMax - Math.floor(Math.abs(x - cx)), cfg);
  return height;
}

function buildDoubleStair(cols: number, rows: number, _rng: Rng, cfg: Cfg): number[][] {
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++)
    for (let y = 0; y < rows; y++)
      height[x]![y] = clampH(cfg.hMin + Math.min(x, cols - 1 - x), cfg);
  return height;
}

function buildWallPair(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  const h = rng.int(2, cfg.hMax + 1);
  const height = zeros(cols, rows);
  const alongX = rng.bool();
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const onWall = alongX ? (x === 0 || x === cols - 1) : (y === 0 || y === rows - 1);
      height[x]![y] = onWall ? h : clampH(h - 1, cfg);
    }
  }
  return height;
}

function buildSpine(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  const h = rng.int(2, cfg.hMax + 1);
  const cy = (rows - 1) / 2;
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++)
    for (let y = 0; y < rows; y++)
      height[x]![y] = Math.max(1, clampH(h - Math.floor(Math.abs(y - cy)), cfg));
  return height;
}

function buildHPrism(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  const h = rng.int(2, cfg.hMax + 1);
  const midY = Math.floor((rows - 1) / 2);
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (x === 0 || x === cols - 1 || y === midY) height[x]![y] = h;
    }
  }
  return height;
}

function buildCrown(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  const base = rng.int(1, cfg.hMax);
  const corner = clampH(base + 1, cfg);
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) height[x]![y] = base;
  height[0]![0] = corner;
  height[cols - 1]![0] = corner;
  height[0]![rows - 1] = corner;
  height[cols - 1]![rows - 1] = corner;
  return height;
}

function buildTrench(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  const h = rng.int(2, cfg.hMax + 1);
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) height[x]![y] = h;
  // Two parallel channels along x, separated by a wall row.
  if (rows < 5) return height; // need space: wall + channel + wall + channel + wall
  const r1 = rng.int(1, Math.floor(rows / 2));
  const r2 = r1 + rng.int(2, Math.max(3, rows - r1 - 1)); // at least 1-gap between
  const r2c = Math.min(rows - 2, r2); // keep last row intact
  for (let x = 0; x < cols; x++) {
    height[x]![r1] = 0;
    if (r2c !== r1) height[x]![r2c] = 0;
  }
  return height;
}

function buildRidgeValley(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  const h = rng.int(2, cfg.hMax + 1);
  const lo = clampH(h - 1, cfg);
  const height = zeros(cols, rows);
  const alongX = rng.bool();
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const idx = alongX ? x : y;
      const len = alongX ? cols : rows;
      // Center third is the valley; outer thirds are ridges.
      const inValley = idx >= Math.floor(len / 3) && idx < Math.ceil(2 * len / 3);
      height[x]![y] = inValley ? lo : h;
    }
  }
  return height;
}

function buildCornerStep(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  const h = rng.int(2, cfg.hMax + 1);
  // Which corner the peak is at: top-left (0,0), top-right, bottom-left, bottom-right.
  const flipX = rng.bool();
  const flipY = rng.bool();
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const dx = flipX ? cols - 1 - x : x;
      const dy = flipY ? rows - 1 - y : y;
      height[x]![y] = Math.max(1, clampH(h - Math.min(dx, dy), cfg));
    }
  }
  return height;
}

function buildTwoRidges(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  const base = rng.int(1, cfg.hMax);
  const ridge = clampH(base + 1, cfg);
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) height[x]![y] = base;
  const alongX = rng.bool();
  const len = alongX ? rows : cols;
  if (len < 4) return height; // need room for base + ridge + gap + ridge
  // Two interior ridge lines separated by at least 1 gap row.
  const r1 = rng.int(1, Math.floor(len / 2));
  const r2min = Math.min(len - 1, r1 + 2);
  const r2 = rng.int(r2min, len - 1);
  for (let i = 0; i < (alongX ? cols : rows); i++) {
    if (alongX) { height[i]![r1] = ridge; height[i]![r2] = ridge; }
    else { height[r1]![i] = ridge; height[r2]![i] = ridge; }
  }
  return height;
}

function buildBattlement(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  const base = rng.int(1, cfg.hMax);
  const hi = clampH(base + 1, cfg);
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const onOuter = x === 0 || x === cols - 1 || y === 0 || y === rows - 1;
      height[x]![y] = onOuter ? (((x + y) % 2 === 0) ? hi : base) : base;
    }
  }
  return height;
}

function buildTriTower(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  const base = rng.int(1, cfg.hMax);
  const tower = clampH(base + 1, cfg);
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) height[x]![y] = base;
  // Raise 3 of the 4 corners (+1 only to avoid isolated-spike failure).
  const skip = rng.int(0, 4); // which corner to leave at base
  const corners: Array<[number, number]> = [[0, 0], [cols - 1, 0], [0, rows - 1], [cols - 1, rows - 1]];
  for (let i = 0; i < 4; i++) {
    if (i !== skip) height[corners[i]![0]!]![corners[i]![1]!] = tower;
  }
  return height;
}

function buildDiamondMound(cols: number, rows: number, _rng: Rng, cfg: Cfg): number[][] {
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++)
    for (let y = 0; y < rows; y++)
      height[x]![y] = Math.max(1, clampH(cfg.hMax - Math.floor(Math.abs(x - cx) + Math.abs(y - cy)), cfg));
  return height;
}

function buildWave(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  const lo = Math.max(1, cfg.hMin);
  const hi = clampH(lo + 1, cfg);
  const phase = rng.int(0, 2); // shift the wave by 0 or 1 block
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++)
    for (let y = 0; y < rows; y++)
      height[x]![y] = (Math.floor(x / 2) + Math.floor(y / 2) + phase) % 2 === 0 ? hi : lo;
  return height;
}

function buildDiagonalSplit(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  const h = rng.int(2, cfg.hMax + 1);
  const lo = clampH(h - 1, cfg);
  const threshold = (cols + rows - 2) / 2;
  const flip = rng.bool();
  const height = zeros(cols, rows);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const sum = flip ? (cols - 1 - x + y) : (x + y);
      height[x]![y] = sum < threshold ? h : lo;
    }
  }
  return height;
}

// ---- PDF-inspired archetype builders ----

function buildXCross(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // Diagonal X footprint: two crossing diagonal strips (arm width 1).
  // Uses min(cols,rows) as the square dimension so the anti-diagonal stays symmetric.
  const h = rng.int(2, cfg.hMax + 1);
  const height = zeros(cols, rows);
  const n = Math.min(cols, rows) - 1; // max index in the square space
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const onMain = Math.abs(x - y) <= 1;
      const onAnti = Math.abs(x - (n - y)) <= 1;
      if (onMain || onAnti) height[x]![y] = h;
    }
  }
  return height;
}

function buildSShape(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // Two offset rectangular blocks connected at their shared border —
  // top-right block + bottom-left block (S) or top-left + bottom-right (Z).
  const h = rng.int(2, cfg.hMax + 1);
  const height = zeros(cols, rows);
  const midY = Math.floor(rows / 2);
  const midX = Math.floor(cols / 2);
  const zShape = rng.bool(); // true → Z, false → S

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const inTop = y < midY;
      const inBottom = y >= midY;
      if (zShape) {
        // Z: top-left + bottom-right
        if ((inTop && x <= midX) || (inBottom && x >= midX)) height[x]![y] = h;
      } else {
        // S: top-right + bottom-left
        if ((inTop && x >= midX) || (inBottom && x <= midX)) height[x]![y] = h;
      }
    }
  }
  return height;
}

function buildArrow(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // Arrow shape: full base width on one side, linearly narrows to a single-cell tip.
  const h = rng.int(2, cfg.hMax + 1);
  const height = zeros(cols, rows);
  const dir = rng.pick(['x+', 'x-', 'y+', 'y-'] as const);

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let hw: number; // half-width at this cross-section (cells away from center)
      switch (dir) {
        case 'x+': { // tip at x=cols-1
          const cx = (rows - 1) / 2;
          hw = Math.floor(((rows - 1) / 2) * (cols - 1 - x) / Math.max(1, cols - 1));
          if (Math.abs(y - cx) <= hw) height[x]![y] = h;
          break;
        }
        case 'x-': { // tip at x=0
          const cx = (rows - 1) / 2;
          hw = Math.floor(((rows - 1) / 2) * x / Math.max(1, cols - 1));
          if (Math.abs(y - cx) <= hw) height[x]![y] = h;
          break;
        }
        case 'y+': { // tip at y=rows-1
          const cy = (cols - 1) / 2;
          hw = Math.floor(((cols - 1) / 2) * (rows - 1 - y) / Math.max(1, rows - 1));
          if (Math.abs(x - cy) <= hw) height[x]![y] = h;
          break;
        }
        default: { // 'y-', tip at y=0
          const cy = (cols - 1) / 2;
          hw = Math.floor(((cols - 1) / 2) * y / Math.max(1, rows - 1));
          if (Math.abs(x - cy) <= hw) height[x]![y] = h;
          break;
        }
      }
    }
  }
  return height;
}

function buildDiamondPrism(cols: number, rows: number, rng: Rng, cfg: Cfg): number[][] {
  // Diamond/rhombus footprint: cells within Manhattan radius from the grid centre.
  // At uniform height — the footprint's triangular arms are the counting challenge.
  const h = rng.int(2, cfg.hMax + 1);
  const height = zeros(cols, rows);
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  // Radius = distance from centre to the nearest edge-midpoint (so arms reach the edges).
  const radius = Math.min(cx, cy);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (Math.abs(x - cx) + Math.abs(y - cy) <= radius + 0.5) height[x]![y] = h;
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
    case 'u-shape': return buildUShape(cols, rows, rng, cfg);
    case 'two-towers': return buildTwoTowers(cols, rows, rng, cfg);
    case 't-prism': return buildTPrism(cols, rows, rng, cfg);
    case 'step-pyramid': return buildStepPyramid(cols, rows, rng, cfg);
    case 'stepped-l': return buildSteppedL(cols, rows, rng, cfg);
    case 'tunnel': return buildTunnel(cols, rows, rng, cfg);
    case 'zigzag-ridge': return buildZigzagRidge(cols, rows, rng, cfg);
    case 'double-well': return buildDoubleWell(cols, rows, rng, cfg);
    case 'pinwheel': return buildPinwheel(cols, rows, rng, cfg);
    case 'checkerboard': return buildCheckerboard(cols, rows, rng, cfg);
    case 'chevron': return buildChevron(cols, rows, rng, cfg);
    case 'double-stair': return buildDoubleStair(cols, rows, rng, cfg);
    case 'wall-pair': return buildWallPair(cols, rows, rng, cfg);
    case 'spine': return buildSpine(cols, rows, rng, cfg);
    case 'h-prism': return buildHPrism(cols, rows, rng, cfg);
    case 'crown': return buildCrown(cols, rows, rng, cfg);
    case 'trench': return buildTrench(cols, rows, rng, cfg);
    case 'ridge-valley': return buildRidgeValley(cols, rows, rng, cfg);
    case 'corner-step': return buildCornerStep(cols, rows, rng, cfg);
    case 'two-ridges': return buildTwoRidges(cols, rows, rng, cfg);
    case 'battlement': return buildBattlement(cols, rows, rng, cfg);
    case 'tri-tower': return buildTriTower(cols, rows, rng, cfg);
    case 'diamond-mound': return buildDiamondMound(cols, rows, rng, cfg);
    case 'wave': return buildWave(cols, rows, rng, cfg);
    case 'diagonal-split': return buildDiagonalSplit(cols, rows, rng, cfg);
    case 'x-cross': return buildXCross(cols, rows, rng, cfg);
    case 's-shape': return buildSShape(cols, rows, rng, cfg);
    case 'arrow': return buildArrow(cols, rows, rng, cfg);
    case 'diamond-prism': return buildDiamondPrism(cols, rows, rng, cfg);
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
  return materialize('box', cols, rows, height);
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
    const a = materialize(kind, cols, rows, height);
    if (a.total < cfg.totalMin || a.total > cfg.totalMax) continue;
    // Solid convex shapes earn their difficulty from hidden support cubes, so
    // require a minimum. Structural shapes (rings/wells/cross/L) are challenging
    // through their geometry instead — exempt them from the hidden floor.
    const structural =
      kind === 'frame' ||
      kind === 'well' ||
      kind === 'plus' ||
      kind === 'l-prism' ||
      kind === 'u-shape' ||
      kind === 't-prism' ||
      kind === 'stepped-l' || // L footprint gap
      kind === 'tunnel' || // channel cut to the floor
      kind === 'double-well' || // sunken interior cells
      kind === 'h-prism' || // open H footprint
      kind === 'trench' || // channels cut to floor
      // new archetypes — challenging through height pattern, not hidden count
      kind === 'checkerboard' ||
      kind === 'chevron' ||
      kind === 'double-stair' ||
      kind === 'wall-pair' ||
      kind === 'spine' ||
      kind === 'crown' ||
      kind === 'ridge-valley' ||
      kind === 'corner-step' ||
      kind === 'two-ridges' ||
      kind === 'battlement' ||
      kind === 'tri-tower' ||
      kind === 'diamond-mound' ||
      kind === 'wave' ||
      kind === 'diagonal-split';
    if (!structural && hiddenCubes(a) < cfg.hiddenMin) continue;
    return a;
  }
  return solidFallback(cfg);
}
