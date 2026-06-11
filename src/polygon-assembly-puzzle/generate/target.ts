import type { Polygon, Pt } from '../types';
import type { Rng } from '../../rotation-puzzle/generate/rng';
import { centroid, pointInPolygon } from '../../rotation-puzzle/generate/geometry';

export type TargetKind =
  | 'rect'
  | 'pentagon'
  | 'hexagon'
  | 'lShape'
  | 'tShape'
  | 'trapezoid'
  | 'arrow'
  | 'plus'
  | 'chevron'
  | 'parallelogram'
  | 'octagon'
  | 'house'
  | 'heptagon'
  | 'rightTrap';

const KINDS: TargetKind[] = [
  'rect',
  'pentagon',
  'hexagon',
  'lShape',
  'tShape',
  'trapezoid',
  'arrow',
  'plus',
  'chevron',
  'parallelogram',
  'octagon',
  'house',
  'heptagon',
  'rightTrap',
];

/**
 * A null-object Rng used when builders are invoked without a generator (e.g. the
 * `makeTarget(kind)` test entry point). It always returns the midpoint of any
 * `range`, giving the deterministic "default" silhouette for each kind.
 */
const FIXED_RNG: Rng = {
  next: () => 0.5,
  range: (min, max) => (min + max) / 2,
  int: (a, b) => Math.floor((a + b) / 2),
  pick: <T,>(arr: readonly T[]): T => arr[Math.floor(arr.length / 2)]!,
  bool: () => false,
  shuffle: <T,>(arr: T[]): T[] => arr.slice(),
};

function regularPolygon(rng: Rng, n: number, rMin: number, rMax: number): Polygon {
  const R = rng.range(rMin, rMax);
  const phase = rng.range(0, (2 * Math.PI) / n);
  const pts: Polygon = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i * 2 * Math.PI) / n;
    pts.push({ x: R * Math.cos(a), y: R * Math.sin(a) });
  }
  return pts;
}

function pentagon(rng: Rng): Polygon {
  return regularPolygon(rng, 5, 34, 44);
}

function hexagon(rng: Rng): Polygon {
  return regularPolygon(rng, 6, 34, 44);
}

function rect(rng: Rng): Polygon {
  const w = rng.range(36, 48);
  const h = rng.range(26, 38);
  return [
    { x: -w, y: -h },
    { x: w, y: -h },
    { x: w, y: h },
    { x: -w, y: h },
  ];
}

function lShape(rng: Rng): Polygon {
  // Outer square half-extent, plus arm thickness for the notch.
  const ext = rng.range(30, 38);
  const arm = rng.range(24, 34); // thickness of the two legs
  // Square spans [-ext, ext]; cut a rectangle out of the top-right corner.
  const innerX = -ext + arm;
  const innerY = -ext + arm;
  return [
    { x: -ext, y: -ext },
    { x: innerX, y: -ext },
    { x: innerX, y: innerY },
    { x: ext, y: innerY },
    { x: ext, y: ext },
    { x: -ext, y: ext },
  ];
}

function tShape(rng: Rng): Polygon {
  const halfW = rng.range(34, 42); // half-width of the top bar
  const barH = rng.range(22, 30); // height of the top bar
  const stemHalf = rng.range(12, 18); // half-width of the stem
  const stemH = rng.range(26, 34); // height of the stem below the bar
  const top = -barH;
  const mid = barH; // bottom of the bar
  return [
    { x: -halfW, y: top },
    { x: halfW, y: top },
    { x: halfW, y: 0 },
    { x: stemHalf, y: 0 },
    { x: stemHalf, y: mid + stemH - barH },
    { x: -stemHalf, y: mid + stemH - barH },
    { x: -stemHalf, y: 0 },
    { x: -halfW, y: 0 },
  ];
}

function trapezoid(rng: Rng): Polygon {
  const bottomHalf = rng.range(36, 46);
  const topHalf = rng.range(16, 28); // narrower top
  const h = rng.range(20, 28);
  const lean = rng.range(-10, 10); // horizontal shift of the top edge
  return [
    { x: -bottomHalf, y: h },
    { x: -topHalf + lean, y: -h },
    { x: topHalf + lean, y: -h },
    { x: bottomHalf, y: h },
  ];
}

function parallelogram(rng: Rng): Polygon {
  const halfW = rng.range(34, 44);
  const h = rng.range(22, 30);
  const slant = rng.range(14, 26);
  return [
    { x: -halfW - slant, y: h },
    { x: -halfW + slant, y: -h },
    { x: halfW + slant, y: -h },
    { x: halfW - slant, y: h },
  ];
}

function arrow(rng: Rng): Polygon {
  // Right-pointing arrow: rectangular shaft + triangular head (concave at the neck).
  const shaftHalf = rng.range(16, 22); // half-height of the shaft
  const headHalf = rng.range(30, 38); // half-height of the arrowhead base
  const shaftStartX = rng.range(-44, -36);
  const neckX = rng.range(4, 14); // where shaft meets head
  const tipX = rng.range(36, 46);
  return [
    { x: shaftStartX, y: -shaftHalf },
    { x: neckX, y: -shaftHalf },
    { x: neckX, y: -headHalf },
    { x: tipX, y: 0 },
    { x: neckX, y: headHalf },
    { x: neckX, y: shaftHalf },
    { x: shaftStartX, y: shaftHalf },
  ];
}

function plus(rng: Rng): Polygon {
  // Symmetric cross / plus sign. `ext` = outer half-extent, `arm` = half-thickness.
  const ext = rng.range(34, 44);
  const arm = rng.range(14, 20); // half-thickness of each bar
  return [
    { x: -arm, y: -ext },
    { x: arm, y: -ext },
    { x: arm, y: -arm },
    { x: ext, y: -arm },
    { x: ext, y: arm },
    { x: arm, y: arm },
    { x: arm, y: ext },
    { x: -arm, y: ext },
    { x: -arm, y: arm },
    { x: -ext, y: arm },
    { x: -ext, y: -arm },
    { x: -arm, y: -arm },
  ];
}

function chevron(rng: Rng): Polygon {
  // Right-pointing chevron (arrowhead with a concave back notch).
  const halfH = rng.range(28, 36);
  const frontX = rng.range(30, 42); // tip x
  const backX = rng.range(-42, -30); // outer back x
  const notch = rng.range(16, 26); // depth of the back concavity
  return [
    { x: backX, y: -halfH },
    { x: frontX, y: 0 },
    { x: backX, y: halfH },
    { x: backX + notch, y: 0 },
  ];
}

function octagon(rng: Rng): Polygon {
  // Regular-ish octagon (convex) with a flat-top orientation phase.
  const R = rng.range(36, 46);
  const phase = Math.PI / 8; // flat top/bottom, distinct from hexagon
  const pts: Polygon = [];
  for (let i = 0; i < 8; i++) {
    const a = phase + (i * 2 * Math.PI) / 8;
    pts.push({ x: R * Math.cos(a), y: R * Math.sin(a) });
  }
  return pts;
}

function house(rng: Rng): Polygon {
  // Convex "home plate" pentagon: rectangular body with a pitched roof apex.
  const halfW = rng.range(34, 44);
  const bodyH = rng.range(20, 28); // half-height of the rectangular body
  const roof = rng.range(22, 32); // roof rise above the body top
  return [
    { x: -halfW, y: bodyH },
    { x: -halfW, y: -bodyH },
    { x: 0, y: -bodyH - roof },
    { x: halfW, y: -bodyH },
    { x: halfW, y: bodyH },
  ];
}

function heptagon(rng: Rng): Polygon {
  // Convex regular-ish heptagon with a flat-bottom phase.
  const R = rng.range(36, 46);
  const phase = -Math.PI / 2 + Math.PI / 7; // point-up-ish, distinct from penta/hexagon
  const pts: Polygon = [];
  for (let i = 0; i < 7; i++) {
    const a = phase + (i * 2 * Math.PI) / 7;
    pts.push({ x: R * Math.cos(a), y: R * Math.sin(a) });
  }
  return pts;
}

function rightTrap(rng: Rng): Polygon {
  // Right trapezoid: one vertical side, one slanted side (convex quad).
  const w = rng.range(40, 52);
  const tall = rng.range(26, 36); // half-height on the vertical (left) side
  const shortTop = rng.range(10, 20); // how much the top edge is shortened on the right
  return [
    { x: -w / 2, y: tall },
    { x: -w / 2, y: -tall },
    { x: w / 2 - shortTop, y: -tall },
    { x: w / 2, y: tall },
  ];
}

function buildKind(kind: TargetKind, rng: Rng): Polygon {
  switch (kind) {
    case 'rect': return rect(rng);
    case 'pentagon': return pentagon(rng);
    case 'hexagon': return hexagon(rng);
    case 'lShape': return lShape(rng);
    case 'tShape': return tShape(rng);
    case 'trapezoid': return trapezoid(rng);
    case 'arrow': return arrow(rng);
    case 'plus': return plus(rng);
    case 'chevron': return chevron(rng);
    case 'parallelogram': return parallelogram(rng);
    case 'octagon': return octagon(rng);
    case 'house': return house(rng);
    case 'heptagon': return heptagon(rng);
    case 'rightTrap': return rightTrap(rng);
  }
}

/**
 * Sanity-check that a freshly built target is a usable SIMPLE polygon for the
 * straight-chord slicer: enough vertices, positive area, and a centroid that
 * lies inside (guards the concave kinds the way two-d's partition does).
 */
function targetIsValid(poly: Polygon): boolean {
  if (poly.length < 3) return false;
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  if (Math.abs(a / 2) < 2000) return false; // generous floor so N slices clear 80px²
  // For concave shapes the centroid can fall outside; require an interior anchor
  // so the slicer always has substantial interior to cut through.
  const c = centroid(poly);
  if (pointInPolygon(c, poly)) return true;
  // Fallback: probe a few edge-midpoint-to-centroid samples for any interior point.
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const mid: Pt = { x: (p.x + c.x) / 2, y: (p.y + c.y) / 2 };
    if (pointInPolygon(mid, poly)) return true;
  }
  return false;
}

export function pickTarget(rng: Rng): { kind: TargetKind; polygon: Polygon } {
  const kind = rng.pick(KINDS);
  // Re-sample parameters a few times in case a concave kind comes out degenerate.
  let polygon = buildKind(kind, rng);
  for (let attempt = 0; attempt < 6 && !targetIsValid(polygon); attempt++) {
    polygon = buildKind(kind, rng);
  }
  return { kind, polygon };
}

/**
 * Deterministic, parameter-free builder used by tests. Returns the canonical
 * "default" silhouette for a kind (all rng ranges resolve to their midpoint).
 */
export function makeTarget(kind: TargetKind, rng?: Rng): Polygon {
  return buildKind(kind, rng ?? FIXED_RNG);
}
