import type { Polygon, ReferenceShape, ReferenceShapeKind } from '../types';
import { TAU } from '../../rotation-puzzle/generate/geometry';
import type { Rng } from '../../rotation-puzzle/generate/rng';

export const CURVE_SAMPLES = 64;

/**
 * Sample a value in [min, max] from `rng`, or return `fallback` (default: the
 * midpoint) when no rng is supplied. Keeping rng optional lets the unit tests
 * call `generateReferenceShape(kind)` deterministically while real generation
 * gets per-instance variety.
 */
function vary(rng: Rng | undefined, min: number, max: number, fallback?: number): number {
  if (!rng) return fallback ?? (min + max) / 2;
  return min + (max - min) * rng.next();
}

export function generateReferenceShape(kind: ReferenceShapeKind, rng?: Rng): ReferenceShape {
  switch (kind) {
    case 'hexagon': {
      const R = vary(rng, 70, 86, 78);
      return { kind, polygon: recenter(regularPolygon(6, R, -Math.PI / 2)) };
    }
    case 'square': {
      // Square→rectangle: a mild aspect ratio so the reference outline varies.
      const w = vary(rng, 124, 156, 140);
      const aspect = vary(rng, 0.82, 1.18, 1);
      const h = clamp(w * aspect, 110, 168);
      return { kind, polygon: recenter(rectangle(w, h)) };
    }
    case 'circle': {
      const R = vary(rng, 70, 84, 76);
      return { kind, polygon: recenter(ellipse(R, R, CURVE_SAMPLES)) };
    }
    case 'oval': {
      const rx = vary(rng, 84, 100, 92);
      const ry = vary(rng, 54, 68, 60);
      return { kind, polygon: recenter(ellipse(rx, ry, CURVE_SAMPLES)) };
    }
    case 'kite': {
      const halfW = vary(rng, 56, 72, 64);
      const topRise = vary(rng, 60, 80, 70);
      const bottomDrop = vary(rng, 82, 100, 92);
      return { kind, polygon: recenter(kite(halfW, topRise, bottomDrop)) };
    }
    case 'triangle': {
      // Sample between equilateral, isosceles and scalene families.
      const roll = rng ? rng.next() : 0;
      const R = vary(rng, 78, 92, 84);
      if (roll < 0.34) return { kind, polygon: recenter(equilateralTriangle(R)) };
      if (roll < 0.67) return { kind, polygon: recenter(isoscelesTriangle(R, vary(rng, 0.7, 1.25, 1))) };
      return { kind, polygon: recenter(scaleneTriangle(R)) };
    }
    case 'pentagon': {
      const R = vary(rng, 76, 90, 82);
      return { kind, polygon: recenter(regularPolygon(5, R, -Math.PI / 2)) };
    }
    case 'parallelogram': {
      const w = vary(rng, 116, 138, 128);
      const h = vary(rng, 96, 118, 108);
      const skew = vary(rng, 20, 32, 26);
      return { kind, polygon: recenter(parallelogram(w, h, skew)) };
    }
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Translate the polygon so its vertex-mean centroid sits at the origin. */
function recenter(poly: Polygon): Polygon {
  let cx = 0, cy = 0;
  for (const p of poly) { cx += p.x; cy += p.y; }
  cx /= poly.length;
  cy /= poly.length;
  return poly.map((p) => ({ x: p.x - cx, y: p.y - cy }));
}

/** Near-twin for the `proportion-mismatch` distractor: same family but wrong proportions. */
export function nearTwinShape(kind: ReferenceShapeKind, rng?: Rng): ReferenceShape {
  switch (kind) {
    case 'circle':
      return { kind: 'oval', polygon: recenter(ellipse(vary(rng, 84, 92, 88), vary(rng, 60, 68, 64), CURVE_SAMPLES)) };
    case 'oval':
      return { kind: 'circle', polygon: recenter(ellipse(vary(rng, 72, 80, 76), vary(rng, 72, 80, 76), CURVE_SAMPLES)) };
    case 'square':
      return { kind: 'square', polygon: recenter(rectangle(vary(rng, 160, 180, 170), vary(rng, 100, 120, 110))) };
    case 'hexagon':
      return { kind: 'hexagon', polygon: recenter(irregularHexagon(vary(rng, 74, 84, 78))) };
    case 'kite':
      return { kind: 'kite', polygon: recenter(kite(vary(rng, 72, 84, 78), vary(rng, 40, 50, 44), vary(rng, 60, 72, 66))) };
    case 'triangle':
      return { kind: 'triangle', polygon: recenter(scaleneTriangle(vary(rng, 80, 90, 84))) };
    case 'pentagon':
      return { kind: 'pentagon', polygon: recenter(irregularPentagon(vary(rng, 78, 88, 82))) };
    case 'parallelogram':
      // Wrong proportions: shallower body + heavier skew.
      return { kind: 'parallelogram', polygon: recenter(parallelogram(vary(rng, 140, 156, 148), vary(rng, 78, 92, 84), vary(rng, 40, 52, 46))) };
  }
}

/** N-gon, radius R, first vertex at angle theta0 (radians, CCW from +x). Centered on origin. */
function regularPolygon(n: number, R: number, theta0: number): Polygon {
  const pts: Polygon = [];
  for (let i = 0; i < n; i++) {
    const t = theta0 + (i / n) * TAU;
    pts.push({ x: R * Math.cos(t), y: R * Math.sin(t) });
  }
  return pts;
}

function rectangle(w: number, h: number): Polygon {
  const hw = w / 2;
  const hh = h / 2;
  return [
    { x: -hw, y: -hh },
    { x:  hw, y: -hh },
    { x:  hw, y:  hh },
    { x: -hw, y:  hh },
  ];
}

/** Parallelogram: rectangle of w×h with the top edge sheared right by `skew`. */
function parallelogram(w: number, h: number, skew: number): Polygon {
  const hw = w / 2;
  const hh = h / 2;
  return [
    { x: -hw + skew, y: -hh },
    { x:  hw + skew, y: -hh },
    { x:  hw - skew, y:  hh },
    { x: -hw - skew, y:  hh },
  ];
}

function ellipse(rx: number, ry: number, n: number): Polygon {
  const pts: Polygon = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    pts.push({ x: rx * Math.cos(t), y: ry * Math.sin(t) });
  }
  return pts;
}

/** Kite with horizontal symmetry: top point, two side points, bottom point. */
function kite(halfW: number, topRise: number, bottomDrop: number): Polygon {
  return [
    { x: 0, y: -topRise },
    { x:  halfW, y: 0 },
    { x: 0, y:  bottomDrop },
    { x: -halfW, y: 0 },
  ];
}

function equilateralTriangle(R: number): Polygon {
  return [
    { x: 0, y: -R },
    { x:  R * Math.sin(TAU / 3), y: -R * Math.cos(TAU / 3) },
    { x: -R * Math.sin(TAU / 3), y: -R * Math.cos(TAU / 3) },
  ];
}

/** Isosceles triangle: symmetric about the vertical axis, base width scaled by `baseScale`. */
function isoscelesTriangle(R: number, baseScale: number): Polygon {
  const halfBase = R * Math.sin(TAU / 3) * baseScale;
  const baseY = -R * Math.cos(TAU / 3);
  return [
    { x: 0, y: -R },
    { x:  halfBase, y: baseY },
    { x: -halfBase, y: baseY },
  ];
}

function scaleneTriangle(R: number): Polygon {
  // Three vertices that are clearly not equilateral or isosceles.
  return [
    { x: -R * 0.95, y:  R * 0.55 },
    { x:  R * 0.78, y:  R * 0.66 },
    { x:  R * 0.10, y: -R * 0.92 },
  ];
}

function irregularHexagon(R: number): Polygon {
  // Same vertex count as regular hexagon but uneven side lengths.
  const base = regularPolygon(6, R, -Math.PI / 2);
  const scales = [1.0, 0.78, 1.05, 1.0, 0.78, 1.05];
  return base.map((p, i) => ({ x: p.x * scales[i]!, y: p.y * scales[i]! }));
}

function irregularPentagon(R: number): Polygon {
  // Same vertex count as regular pentagon but uneven radii.
  const base = regularPolygon(5, R, -Math.PI / 2);
  const scales = [1.1, 0.82, 1.06, 0.82, 1.1];
  return base.map((p, i) => ({ x: p.x * scales[i]!, y: p.y * scales[i]! }));
}
