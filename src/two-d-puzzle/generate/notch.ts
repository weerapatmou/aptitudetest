import type { Polygon, Pt, ShapeScope } from '../types';
import {
  cutPolygon,
  splitPolygonByPolyline,
} from '../../matching-parts-puzzle/generate/cuts';
import { centroid, polygonBounds, pointInPolygon } from '../../rotation-puzzle/generate/geometry';
import type { Rng } from '../../rotation-puzzle/generate/rng';
import { area, pickBase, recenter, rectangle, SIDE } from './bases';

// Base-shape primitives live in bases.ts; re-export so existing importers
// (distractors.ts, congruence.ts, tests) keep importing them from here.
export { area, recenter, rectangle, SIDE };

export type Base = {
  /** The full square/rectangle the pieces complete. */
  completed: Polygon;
  /** The notched main shape (the larger piece). */
  main: Polygon;
  /** The missing region the pieces must fill (the smaller piece). */
  missing: Polygon;
};

// ---- boundary helpers (work on any convex base polygon) ----

type BP = { pt: Pt; edgeIdx: number; edgeT: number };

/** A point at parameter `t` along edge `e` of a polygon. */
function bp(poly: Polygon, e: number, t: number): BP {
  const a = poly[e]!;
  const b = poly[(e + 1) % poly.length]!;
  return { pt: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, edgeIdx: e, edgeT: t };
}

function edgeLen(poly: Polygon, e: number): number {
  const a = poly[e]!;
  const b = poly[(e + 1) % poly.length]!;
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Unit normal of edge `e` pointing into the polygon (toward the origin centroid). */
function inwardNormal(poly: Polygon, e: number): Pt {
  const a = poly[e]!;
  const b = poly[(e + 1) % poly.length]!;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  if (nx * -mx + ny * -my < 0) {
    nx = -nx;
    ny = -ny;
  }
  return { x: nx, y: ny };
}

/** Unit direction along edge `e`. */
function edgeDir(poly: Polygon, e: number): Pt {
  const a = poly[e]!;
  const b = poly[(e + 1) % poly.length]!;
  const len = edgeLen(poly, e) || 1;
  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
}

const add = (p: Pt, q: Pt, s = 1): Pt => ({ x: p.x + q.x * s, y: p.y + q.y * s });

/**
 * Split `completed` along the path b1 → bends → b2, validate the result, and
 * return the smaller piece as the gap. Rejects bites that are too small/large
 * or too sliver-thin to read as a clear notch.
 */
function cutOff(completed: Polygon, b1: BP, b2: BP, bends: Pt[]): Base | null {
  const total = area(completed);
  const [p0, p1] = splitPolygonByPolyline(completed, b1, b2, bends);
  if (p0.length < 3 || p1.length < 3) return null;
  const a0 = area(p0);
  const a1 = area(p1);
  const frac = Math.min(a0, a1) / total;
  if (frac < 0.14 || frac > 0.46) return null;
  const [main, missing] = a0 >= a1 ? [p0, p1] : [p1, p0];
  const mb = polygonBounds(missing);
  const mw = mb.maxX - mb.minX;
  const mh = mb.maxY - mb.minY;
  if (Math.min(mw, mh) / Math.max(mw, mh) < 0.34) return null;
  return { completed, main, missing };
}

// ---- notch templates ----
// Each carves a distinctive missing region out of the completed base shape.

/** Diagonal slice off a corner → triangular gap (PDF #21). */
function cornerTriangle(c: Polygon, rng: Rng): Base | null {
  const n = c.length;
  const v = rng.int(0, n);
  const e1 = (v + n - 1) % n; // edge ending at corner v
  const e2 = v; // edge leaving corner v
  const f1 = 0.42 + rng.next() * 0.32;
  const f2 = 0.42 + rng.next() * 0.32;
  return cutOff(c, bp(c, e1, 1 - f1), bp(c, e2, f2), []);
}

/** Parallelogram bite out of a corner → L-shaped main (PDF #29). */
function cornerRect(c: Polygon, rng: Rng): Base | null {
  const n = c.length;
  const v = rng.int(0, n);
  const e1 = (v + n - 1) % n;
  const e2 = v;
  const f1 = 0.36 + rng.next() * 0.3;
  const f2 = 0.36 + rng.next() * 0.3;
  const b1 = bp(c, e1, 1 - f1);
  const b2 = bp(c, e2, f2);
  const corner = c[v]!;
  // Parallelogram completion of the corner — a rectangle at right angles, a
  // parallelogram at slanted ones. Skip if the inner vertex falls outside.
  const inner: Pt = { x: b1.pt.x + b2.pt.x - corner.x, y: b1.pt.y + b2.pt.y - corner.y };
  if (!pointInPolygon(inner, c)) return null;
  return cutOff(c, b1, b2, [inner]);
}

/** Rectangular notch cut into the middle of an edge (PDF #32/#40). */
function edgeRect(c: Polygon, rng: Rng): Base | null {
  const e = rng.int(0, c.length);
  const minDim = Math.min(
    polygonBounds(c).maxX - polygonBounds(c).minX,
    polygonBounds(c).maxY - polygonBounds(c).minY,
  );
  const t1 = 0.16 + rng.next() * 0.2;
  const t2 = t1 + (0.32 + rng.next() * 0.22);
  if (t2 > 0.86) return null;
  const nrm = inwardNormal(c, e);
  const depth = (0.32 + rng.next() * 0.26) * minDim;
  const b1 = bp(c, e, t1);
  const b2 = bp(c, e, t2);
  return cutOff(c, b1, b2, [add(b1.pt, nrm, depth), add(b2.pt, nrm, depth)]);
}

/** Triangular (V) notch cut into an edge. */
function edgeTriangle(c: Polygon, rng: Rng): Base | null {
  const e = rng.int(0, c.length);
  const minDim = Math.min(
    polygonBounds(c).maxX - polygonBounds(c).minX,
    polygonBounds(c).maxY - polygonBounds(c).minY,
  );
  const t1 = 0.14 + rng.next() * 0.18;
  const t2 = t1 + (0.36 + rng.next() * 0.24);
  if (t2 > 0.88) return null;
  const nrm = inwardNormal(c, e);
  const depth = (0.4 + rng.next() * 0.28) * minDim;
  const b1 = bp(c, e, t1);
  const b2 = bp(c, e, t2);
  const apex: Pt = { x: (b1.pt.x + b2.pt.x) / 2 + nrm.x * depth, y: (b1.pt.y + b2.pt.y) / 2 + nrm.y * depth };
  return cutOff(c, b1, b2, [apex]);
}

/** Trapezoidal notch (narrower at the base) cut into an edge. */
function edgeTrapezoid(c: Polygon, rng: Rng): Base | null {
  const e = rng.int(0, c.length);
  const len = edgeLen(c, e);
  const minDim = Math.min(
    polygonBounds(c).maxX - polygonBounds(c).minX,
    polygonBounds(c).maxY - polygonBounds(c).minY,
  );
  const t1 = 0.16 + rng.next() * 0.18;
  const t2 = t1 + (0.34 + rng.next() * 0.22);
  if (t2 > 0.86) return null;
  const nrm = inwardNormal(c, e);
  const dir = edgeDir(c, e);
  const depth = (0.34 + rng.next() * 0.24) * minDim;
  const inset = (t2 - t1) * len * (0.2 + rng.next() * 0.12);
  const b1 = bp(c, e, t1);
  const b2 = bp(c, e, t2);
  const i1 = add(add(b1.pt, nrm, depth), dir, inset);
  const i2 = add(add(b2.pt, nrm, depth), dir, -inset);
  return cutOff(c, b1, b2, [i1, i2]);
}

/** Stepped (L-shaped) notch cut into an edge → two-level bite. */
function edgeStep(c: Polygon, rng: Rng): Base | null {
  const e = rng.int(0, c.length);
  const minDim = Math.min(
    polygonBounds(c).maxX - polygonBounds(c).minX,
    polygonBounds(c).maxY - polygonBounds(c).minY,
  );
  const t1 = 0.16 + rng.next() * 0.14;
  const t2 = t1 + (0.34 + rng.next() * 0.2);
  if (t2 > 0.84) return null;
  const tm = (t1 + t2) / 2;
  const nrm = inwardNormal(c, e);
  const d1 = (0.22 + rng.next() * 0.12) * minDim;
  const d2 = d1 + (0.2 + rng.next() * 0.16) * minDim;
  const b1 = bp(c, e, t1);
  const b2 = bp(c, e, t2);
  const mid = bp(c, e, tm).pt;
  const i1 = add(b1.pt, nrm, d1);
  const i2 = add(mid, nrm, d1);
  const i3 = add(mid, nrm, d2);
  const i4 = add(b2.pt, nrm, d2);
  return cutOff(c, b1, b2, [i1, i2, i3, i4]);
}

/** Deep, narrow rectangular slit cut into an edge (PDF #26/#40 look). */
function edgeSlit(c: Polygon, rng: Rng): Base | null {
  const e = rng.int(0, c.length);
  const minDim = Math.min(
    polygonBounds(c).maxX - polygonBounds(c).minX,
    polygonBounds(c).maxY - polygonBounds(c).minY,
  );
  const t1 = 0.28 + rng.next() * 0.18;
  const t2 = t1 + (0.18 + rng.next() * 0.12); // narrow mouth
  if (t2 > 0.84) return null;
  const nrm = inwardNormal(c, e);
  const depth = (0.5 + rng.next() * 0.22) * minDim; // deep
  const b1 = bp(c, e, t1);
  const b2 = bp(c, e, t2);
  return cutOff(c, b1, b2, [add(b1.pt, nrm, depth), add(b2.pt, nrm, depth)]);
}

/** Crenellated (W-shaped) notch with two prongs cut into an edge. */
function doubleNotch(c: Polygon, rng: Rng): Base | null {
  const e = rng.int(0, c.length);
  const minDim = Math.min(
    polygonBounds(c).maxX - polygonBounds(c).minX,
    polygonBounds(c).maxY - polygonBounds(c).minY,
  );
  const t1 = 0.14 + rng.next() * 0.12;
  const t2 = t1 + (0.4 + rng.next() * 0.2); // wide mouth spanning both prongs
  if (t2 > 0.86) return null;
  const span = t2 - t1;
  // Two equal-depth bays separated by a central tooth that does NOT reach the
  // edge — keeps the missing region a single connected piece.
  const ta = t1 + span * (0.3 + rng.next() * 0.08);
  const tb = t2 - span * (0.3 + rng.next() * 0.08);
  const nrm = inwardNormal(c, e);
  const depth = (0.32 + rng.next() * 0.2) * minDim;
  const tooth = depth * (0.34 + rng.next() * 0.22); // central tooth rises partway in
  const b1 = bp(c, e, t1);
  const b2 = bp(c, e, t2);
  const a = bp(c, e, ta).pt;
  const b = bp(c, e, tb).pt;
  return cutOff(c, b1, b2, [
    add(b1.pt, nrm, depth),
    add(a, nrm, depth),
    add(a, nrm, tooth),
    add(b, nrm, tooth),
    add(b, nrm, depth),
    add(b2.pt, nrm, depth),
  ]);
}

/** Staircase step cut out of a corner → two-tread L on the diagonal. */
function cornerStep(c: Polygon, rng: Rng): Base | null {
  const n = c.length;
  const v = rng.int(0, n);
  const e1 = (v + n - 1) % n; // edge ending at corner v
  const e2 = v; // edge leaving corner v
  const f1 = 0.4 + rng.next() * 0.26;
  const f2 = 0.4 + rng.next() * 0.26;
  const corner = c[v]!;
  const b1 = bp(c, e1, 1 - f1);
  const b2 = bp(c, e2, f2);
  // Mid-points along each leg and the inner staircase knee, all relative to the
  // corner so the step nests inside the shape for both right and slanted angles.
  const m1: Pt = { x: (b1.pt.x + corner.x) / 2, y: (b1.pt.y + corner.y) / 2 };
  const m2: Pt = { x: (b2.pt.x + corner.x) / 2, y: (b2.pt.y + corner.y) / 2 };
  const knee: Pt = { x: m1.x + m2.x - corner.x, y: m1.y + m2.y - corner.y };
  const inner: Pt = { x: b1.pt.x + b2.pt.x - corner.x, y: b1.pt.y + b2.pt.y - corner.y };
  if (!pointInPolygon(inner, c) || !pointInPolygon(knee, c)) return null;
  return cutOff(c, b1, b2, [inner, m2, knee, m1]);
}

/** Organic free cut (random chord or single bend) — keeps some variety smooth. */
function organicCut(c: Polygon, rng: Rng): Base | null {
  const cut = cutPolygon(c, rng.bool(0.5) ? 'straight-chord' : 'polyline', rng);
  if (!cut) return null;
  const [p0, p1] = cut.pieces;
  const total = area(c);
  const a0 = area(p0);
  const a1 = area(p1);
  const frac = Math.min(a0, a1) / total;
  if (frac < 0.15 || frac > 0.45) return null;
  const [main, missing] = a0 >= a1 ? [p0, p1] : [p1, p0];
  const mb = polygonBounds(missing);
  const mw = mb.maxX - mb.minX;
  const mh = mb.maxY - mb.minY;
  if (Math.min(mw, mh) / Math.max(mw, mh) < 0.4) return null;
  return { completed: c, main, missing };
}

type Template = (c: Polygon, rng: Rng) => Base | null;

/** Notch templates with relative weights (higher = drawn more often). */
const TEMPLATES: Array<{ fn: Template; weight: number }> = [
  { fn: cornerTriangle, weight: 3 },
  { fn: cornerRect, weight: 3 },
  { fn: edgeRect, weight: 3 },
  { fn: edgeTriangle, weight: 2 },
  { fn: edgeTrapezoid, weight: 2 },
  { fn: edgeStep, weight: 2 },
  { fn: edgeSlit, weight: 2 },
  { fn: doubleNotch, weight: 2 },
  { fn: cornerStep, weight: 2 },
  { fn: organicCut, weight: 2 },
];

const TEMPLATE_TOTAL_WEIGHT = TEMPLATES.reduce((s, t) => s + t.weight, 0);

function pickTemplate(rng: Rng): Template {
  let r = rng.next() * TEMPLATE_TOTAL_WEIGHT;
  for (const t of TEMPLATES) {
    r -= t.weight;
    if (r <= 0) return t.fn;
  }
  return TEMPLATES[TEMPLATES.length - 1]!.fn;
}

/**
 * Build the completed shape, then carve a varied, clearly-readable notch out of
 * it. The smaller piece becomes the gap to fill; the larger is the main shape.
 */
export function buildBase(scope: ShapeScope, rng: Rng): Base | null {
  const completed = pickBase(scope, rng);

  for (let attempt = 0; attempt < 40; attempt++) {
    const base = pickTemplate(rng)(completed, rng);
    if (base) return base;
  }
  // Last resort: an organic cut with relaxed retries.
  for (let attempt = 0; attempt < 20; attempt++) {
    const base = organicCut(completed, rng);
    if (base) return base;
  }
  return null;
}

/** Smallest piece area we allow when partitioning the gap — avoids slivers. */
const MIN_PIECE_AREA = 320;

/**
 * Split the missing region into exactly `k` pieces by repeatedly cutting the
 * largest current piece. Most cuts are straight chords, but ~40% are bent
 * polylines so multi-piece gaps yield concave dart/chevron pieces (PDF-like).
 * Returns the pieces in completed-shape local coords (their true positions),
 * or null if a clean partition couldn't be found.
 */
export function partition(missing: Polygon, k: number, rng: Rng): Polygon[] | null {
  if (k <= 1) return [missing];

  let pieces: Polygon[] = [missing];
  let guard = 0;
  while (pieces.length < k && guard++ < 80) {
    // Always split the largest piece so areas stay balanced.
    let li = 0;
    let best = -Infinity;
    for (let i = 0; i < pieces.length; i++) {
      const a = area(pieces[i]!);
      if (a > best) {
        best = a;
        li = i;
      }
    }
    const target = pieces[li]!;
    const strategy = rng.next() < 0.4 ? 'polyline' : 'straight-chord';
    const cut = cutPolygon(target, strategy, rng);
    if (!cut) continue;
    const [s0, s1] = cut.pieces;
    if (area(s0) < MIN_PIECE_AREA || area(s1) < MIN_PIECE_AREA) continue;
    // Reject cuts whose pieces don't tile the parent exactly.
    if (Math.abs(area(s0) + area(s1) - area(target)) > 0.5) continue;
    // Guard for concave targets (L-shape, step): a straight chord can exit the
    // polygon and re-enter, producing pieces that bleed into the main shape.
    // Check every segment-midpoint of the cut path is inside the target polygon.
    const path = cut.cut.cutPath;
    let cutIsInterior = true;
    for (let pi = 0; pi < path.length - 1; pi++) {
      const mid = { x: (path[pi]!.x + path[pi + 1]!.x) / 2, y: (path[pi]!.y + path[pi + 1]!.y) / 2 };
      if (!pointInPolygon(mid, target)) { cutIsInterior = false; break; }
    }
    if (!cutIsInterior) continue;
    // Final sanity: both piece centroids must be inside target (not inside main).
    if (!pointInPolygon(centroid(s0), target) || !pointInPolygon(centroid(s1), target)) continue;
    pieces = [...pieces.slice(0, li), s0, s1, ...pieces.slice(li + 1)];
  }

  return pieces.length === k ? pieces : null;
}
