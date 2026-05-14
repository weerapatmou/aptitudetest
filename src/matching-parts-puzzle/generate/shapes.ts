import type { Polygon, ReferenceShape, ReferenceShapeKind } from '../types';
import { TAU } from '../../rotation-puzzle/generate/geometry';

export const CURVE_SAMPLES = 64;

export function generateReferenceShape(kind: ReferenceShapeKind): ReferenceShape {
  switch (kind) {
    case 'hexagon':
      return { kind, polygon: recenter(regularPolygon(6, 78, -Math.PI / 2)) };
    case 'square':
      return { kind, polygon: recenter(rectangle(140, 140)) };
    case 'circle':
      return { kind, polygon: recenter(ellipse(76, 76, CURVE_SAMPLES)) };
    case 'oval':
      return { kind, polygon: recenter(ellipse(92, 60, CURVE_SAMPLES)) };
    case 'kite':
      return { kind, polygon: recenter(kite(64, 70, 92)) };
    case 'triangle':
      return { kind, polygon: recenter(equilateralTriangle(84)) };
  }
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
export function nearTwinShape(kind: ReferenceShapeKind): ReferenceShape {
  switch (kind) {
    case 'circle':
      return { kind: 'oval', polygon: recenter(ellipse(88, 64, CURVE_SAMPLES)) };
    case 'oval':
      return { kind: 'circle', polygon: recenter(ellipse(76, 76, CURVE_SAMPLES)) };
    case 'square':
      return { kind: 'square', polygon: recenter(rectangle(170, 110)) };
    case 'hexagon':
      return { kind: 'hexagon', polygon: recenter(irregularHexagon(78)) };
    case 'kite':
      return { kind: 'kite', polygon: recenter(kite(78, 44, 66)) };
    case 'triangle':
      return { kind: 'triangle', polygon: recenter(scaleneTriangle(84)) };
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
