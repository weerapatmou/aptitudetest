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

function octagon(rng: Rng): Polygon {
  const R = SIDE / 2;
  // Jitter the cut-corner depth so it ranges from a stubby to a near-regular octagon.
  const cut = 0.28 + rng.next() * 0.14; // how far each corner is chamfered (0.28–0.42)
  const flatTop = rng.bool();
  const theta0 = flatTop ? Math.PI / 8 : 0;
  const poly: Polygon = [];
  for (let i = 0; i < 8; i++) {
    const t = theta0 + (i / 8) * Math.PI * 2;
    // Push alternate vertices in/out slightly to vary the silhouette a touch.
    const rad = R * (1 - (i % 2 === 0 ? 0 : cut * 0.12));
    poly.push({ x: rad * Math.cos(t), y: rad * Math.sin(t) });
  }
  return recenter(fitToSize(poly, SIDE));
}

function rightTrapezoid(rng: Rng): Polygon {
  // A trapezoid with one vertical (right-angled) side; the slanted side varies.
  const w = SIDE;
  const h = SIDE * (0.72 + rng.next() * 0.18);
  const topFrac = 0.42 + rng.next() * 0.28; // top edge as a share of the bottom
  const tw = w * topFrac;
  const flip = rng.bool() ? 1 : -1; // which side carries the right angle
  const poly: Polygon = [
    { x: (-w / 2) * flip, y: h / 2 },
    { x: (w / 2) * flip, y: h / 2 },
    { x: (w / 2) * flip, y: -h / 2 },
    { x: (w / 2 - tw) * flip, y: -h / 2 },
  ];
  return recenter(fitToSize(poly, SIDE));
}

function arrow(rng: Rng): Polygon {
  // A concave block arrow pointing right: rectangular shaft + triangular head.
  const w = SIDE;
  const h = SIDE * (0.6 + rng.next() * 0.22);
  const headFrac = 0.34 + rng.next() * 0.18; // head length as a share of total width
  const shaftFrac = 0.4 + rng.next() * 0.18; // shaft height as a share of total height
  const headX = w / 2 - w * headFrac;
  const sh = (h * shaftFrac) / 2; // half shaft height
  const hh = h / 2; // half head height (full)
  const poly: Polygon = [
    { x: -w / 2, y: -sh }, // shaft top-left
    { x: headX, y: -sh }, // shaft top-right
    { x: headX, y: -hh }, // head top corner
    { x: w / 2, y: 0 }, // tip
    { x: headX, y: hh }, // head bottom corner
    { x: headX, y: sh }, // shaft bottom-right
    { x: -w / 2, y: sh }, // shaft bottom-left
  ];
  return recenter(fitToSize(poly, SIDE));
}

const VARIED: Array<{ kind: string; make: (rng: Rng) => Polygon; weight: number }> = [
  { kind: 'square', make: () => square(), weight: 2 },
  { kind: 'rectangle', make: rectangleBase, weight: 2 },
  { kind: 'rotatedSquare', make: rotatedSquare, weight: 2 },
  { kind: 'parallelogram', make: parallelogram, weight: 2 },
  { kind: 'trapezoid', make: trapezoid, weight: 2 },
  { kind: 'pentagonHouse', make: pentagonHouse, weight: 2 },
  { kind: 'hexagon', make: hexagon, weight: 2 },
  { kind: 'octagon', make: octagon, weight: 2 },
  { kind: 'rightTrapezoid', make: rightTrapezoid, weight: 2 },
  { kind: 'arrow', make: arrow, weight: 1 },
];
const VARIED_TOTAL = VARIED.reduce((s, b) => s + b.weight, 0);

/** A completed base shape plus the identifier of the generator that produced it. */
export type PickedBase = { kind: string; polygon: Polygon };

/** Pick a completed base shape (centered on origin) for the requested scope. */
export function pickBase(scope: ShapeScope, rng: Rng): PickedBase {
  if (scope === 'square') return { kind: 'square', polygon: square() };
  if (scope === 'square-rect')
    return rng.bool(0.5)
      ? { kind: 'square', polygon: square() }
      : { kind: 'rectangle', polygon: rectangleBase(rng) };
  let r = rng.next() * VARIED_TOTAL;
  for (const b of VARIED) {
    r -= b.weight;
    if (r <= 0) return { kind: b.kind, polygon: b.make(rng) };
  }
  return { kind: 'square', polygon: square() };
}
