import type { Polygon, ShapeScope } from '../types';
import { signedArea } from '../../matching-parts-puzzle/generate/cuts';
import { centroid, polygonBounds, rotatePolygon } from '../../rotation-puzzle/generate/geometry';
import type { Rng } from '../../rotation-puzzle/generate/rng';

/** Target bounding size for every base shape, so they all render at one scale. */
export const SIDE = 140;

/** Axis-aligned rectangle centered on the origin. */
export function rectangle(w: number, h: number): Polygon {
  const hw = w / 2;
  const hh = h / 2;
  return [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
}

/** |area| of a polygon. */
export function area(poly: Polygon): number {
  return Math.abs(signedArea(poly));
}

/** Translate a polygon so its centroid sits at the origin. */
export function recenter(poly: Polygon): Polygon {
  const c = centroid(poly);
  return poly.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
}

/** Scale a polygon uniformly so its bounding box's larger side is `target`. */
function fitToSize(poly: Polygon, target: number): Polygon {
  const b = polygonBounds(poly);
  const span = Math.max(b.maxX - b.minX, b.maxY - b.minY) || 1;
  const s = target / span;
  return poly.map((p) => ({ x: p.x * s, y: p.y * s }));
}

// ---- convex base-shape generators (centered, ~SIDE bounding box) ----

function square(): Polygon {
  return rectangle(SIDE, SIDE);
}

function rectangleBase(rng: Rng): Polygon {
  const aspect = 1.2 + rng.next() * 0.45; // 1.2–1.65
  return rng.bool() ? rectangle(SIDE, SIDE / aspect) : rectangle(SIDE / aspect, SIDE);
}

function rotatedSquare(rng: Rng): Polygon {
  const deg = 22 + rng.next() * 46; // 22–68°
  return recenter(fitToSize(rotatePolygon(rectangle(SIDE, SIDE), deg), SIDE));
}

function parallelogram(rng: Rng): Polygon {
  const shear = (rng.bool() ? 1 : -1) * (0.4 + rng.next() * 0.35);
  const sheared = rectangle(SIDE, SIDE * (0.78 + rng.next() * 0.14)).map((p) => ({
    x: p.x + shear * p.y,
    y: p.y,
  }));
  return recenter(fitToSize(sheared, SIDE));
}

function trapezoid(rng: Rng): Polygon {
  const bw = SIDE;
  const tw = SIDE * (0.42 + rng.next() * 0.26); // narrower top
  const h = SIDE * (0.72 + rng.next() * 0.16);
  const off = (rng.next() - 0.5) * (bw - tw) * 0.6; // sometimes lopsided
  const poly: Polygon = [
    { x: -bw / 2, y: h / 2 },
    { x: bw / 2, y: h / 2 },
    { x: tw / 2 + off, y: -h / 2 },
    { x: -tw / 2 + off, y: -h / 2 },
  ];
  return recenter(fitToSize(poly, SIDE));
}

function pentagonHouse(rng: Rng): Polygon {
  const w = SIDE;
  const h = SIDE * (0.9 + rng.next() * 0.2);
  const eave = h * (0.12 + rng.next() * 0.16); // how far the peak rises above the eaves
  const poly: Polygon = [
    { x: -w / 2, y: h / 2 }, // bottom-left
    { x: w / 2, y: h / 2 }, // bottom-right
    { x: w / 2, y: -h / 2 + eave }, // right eave
    { x: 0, y: -h / 2 }, // peak
    { x: -w / 2, y: -h / 2 + eave }, // left eave
  ];
  return recenter(fitToSize(poly, SIDE));
}

function hexagon(rng: Rng): Polygon {
  const R = SIDE / 2;
  const flatTop = rng.bool();
  const theta0 = flatTop ? 0 : Math.PI / 6;
  const poly: Polygon = [];
  for (let i = 0; i < 6; i++) {
    const t = theta0 + (i / 6) * Math.PI * 2;
    poly.push({ x: R * Math.cos(t), y: R * Math.sin(t) });
  }
  return recenter(fitToSize(poly, SIDE));
}

const VARIED: Array<{ make: (rng: Rng) => Polygon; weight: number }> = [
  { make: () => square(), weight: 2 },
  { make: rectangleBase, weight: 2 },
  { make: rotatedSquare, weight: 2 },
  { make: parallelogram, weight: 2 },
  { make: trapezoid, weight: 2 },
  { make: pentagonHouse, weight: 2 },
  { make: hexagon, weight: 2 },
];
const VARIED_TOTAL = VARIED.reduce((s, b) => s + b.weight, 0);

/** Pick a completed base shape (centered on origin) for the requested scope. */
export function pickBase(scope: ShapeScope, rng: Rng): Polygon {
  if (scope === 'square') return square();
  if (scope === 'square-rect') return rng.bool(0.5) ? square() : rectangleBase(rng);
  let r = rng.next() * VARIED_TOTAL;
  for (const b of VARIED) {
    r -= b.weight;
    if (r <= 0) return b.make(rng);
  }
  return square();
}
