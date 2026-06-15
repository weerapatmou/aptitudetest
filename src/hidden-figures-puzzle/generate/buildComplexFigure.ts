import type { Rng } from '../../rotation-puzzle/generate/rng';
import type { ComplexFigure, Segment, ShapeDef } from '../types';

type Pt = [number, number];

// ── Geometry helpers ─────────────────────────────────────────────────────────

function rotPt([x, y]: Pt, angle: number): Pt {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x * c - y * s, x * s + y * c];
}

function addPt([ax, ay]: Pt, [bx, by]: Pt): Pt { return [ax + bx, ay + by]; }
function scalePt([x, y]: Pt, f: number): Pt { return [x * f, y * f]; }
function subPt([ax, ay]: Pt, [bx, by]: Pt): Pt { return [ax - bx, ay - by]; }
function lenPt([x, y]: Pt): number { return Math.sqrt(x * x + y * y); }
function normPt(p: Pt): Pt { const l = lenPt(p) || 1; return [p[0] / l, p[1] / l]; }
function midPt(a: Pt, b: Pt): Pt { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function centroid(pts: Pt[]): Pt {
  return [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ];
}

function seg(a: Pt, b: Pt): Segment {
  return { x1: a[0], y1: a[1], x2: b[0], y2: b[1] };
}

function polySegs(pts: Pt[]): Segment[] {
  return pts.map((p, i) => seg(p, pts[(i + 1) % pts.length]!));
}

function computeViewBox(segs: Segment[], pad = 15): string {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const { x1, y1, x2, y2 } of segs) {
    minX = Math.min(minX, x1, x2);
    minY = Math.min(minY, y1, y2);
    maxX = Math.max(maxX, x1, x2);
    maxY = Math.max(maxY, y1, y2);
  }
  return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
}

function normalizeShape(pts: [number, number][], targetSize: number, rotAngle: number): Pt[] {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = targetSize / Math.max(maxX - minX, maxY - minY, 1);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return pts.map(([x, y]) => rotPt([(x - cx) * scale, (y - cy) * scale], rotAngle));
}

// ── Outward normal for edge A→B (away from shape centroid) ───────────────────

function outwardNormal(a: Pt, b: Pt, cen: Pt): Pt {
  const edge = subPt(b, a);
  const perp: Pt = [-edge[1], edge[0]];
  const n = normPt(perp);
  const mid = midPt(a, b);
  const toCen = subPt(cen, mid);
  return n[0] * toCen[0] + n[1] * toCen[1] < 0 ? n : [-n[0], -n[1]];
}

// ── Attachment helpers ────────────────────────────────────────────────────────

function attachTriangle(a: Pt, b: Pt, normal: Pt, height: number): Segment[] {
  const apex = addPt(midPt(a, b), scalePt(normal, height));
  return [seg(a, apex), seg(b, apex)];
}

function attachSkinnyTriangle(a: Pt, b: Pt, normal: Pt, height: number): Segment[] {
  const along = normPt(subPt(b, a));
  const edgeLen = lenPt(subPt(b, a));
  const apex = addPt(a, addPt(scalePt(along, edgeLen * 0.7), scalePt(normal, height * 0.6)));
  return [seg(a, apex), seg(b, apex)];
}

function attachWideTriangle(a: Pt, b: Pt, normal: Pt, height: number): Segment[] {
  // Apex shifted sideways (flatter angle) — 2 segments only, never closes into a quad
  const along = normPt(subPt(b, a));
  const edgeLen = lenPt(subPt(b, a));
  const apex = addPt(midPt(a, b), addPt(scalePt(along, edgeLen * 0.35), scalePt(normal, height * 0.45)));
  return [seg(a, apex), seg(b, apex)];
}

// ── Strategy A: edge-attach (triangle variants only — no closed quads) ────────

function strategyEdgeAttach(pts: Pt[], cen: Pt, rng: Rng): Segment[] {
  const segs: Segment[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    if (!rng.bool(0.70)) continue;
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    const normal = outwardNormal(a, b, cen);
    const edgeLen = lenPt(subPt(b, a));
    const height = rng.range(0.35, 0.75) * edgeLen;
    const kind = rng.next();
    if (kind < 0.55) {
      segs.push(...attachTriangle(a, b, normal, height));
    } else if (kind < 0.80) {
      segs.push(...attachSkinnyTriangle(a, b, normal, height));
    } else {
      segs.push(...attachWideTriangle(a, b, normal, height));
    }
  }
  return segs;
}

// ── Strategy B: bounding rectangle enclosure ──────────────────────────────────

function strategyBoundingRect(pts: Pt[]): Segment[] {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const pad = 12;
  const x1 = Math.min(...xs) - pad, y1 = Math.min(...ys) - pad;
  const x2 = Math.max(...xs) + pad, y2 = Math.max(...ys) + pad;
  const tl: Pt = [x1, y1], tr: Pt = [x2, y1];
  const br: Pt = [x2, y2], bl: Pt = [x1, y2];
  return [seg(tl, tr), seg(tr, br), seg(br, bl), seg(bl, tl)];
}

// ── Strategy C: radial fan from one vertex ────────────────────────────────────

function strategyRadialFan(pts: Pt[], rng: Rng): Segment[] {
  const n = pts.length;
  const vi = rng.int(0, n);
  const v = pts[vi]!;
  const segs: Segment[] = [];
  // Pick 2–3 non-adjacent edges to draw lines to
  const fanCount = rng.int(2, Math.min(4, n - 1));
  for (let f = 0; f < fanCount; f++) {
    const edgeIdx = (vi + 2 + f) % n; // skip the two adjacent edges
    const a = pts[edgeIdx]!;
    const b = pts[(edgeIdx + 1) % n]!;
    const t = rng.range(0.25, 0.75);
    const p = lerpPt(a, b, t);
    segs.push(seg(v, p));
  }
  return segs;
}

// ── Strategy D: outer frame extension ────────────────────────────────────────

function strategyOuterFrame(pts: Pt[], rng: Rng): Segment[] {
  const segs: Segment[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    const unit = normPt(subPt(b, a));
    const ext = rng.range(12, 25);
    const a2: Pt = subPt(a, scalePt(unit, ext));
    const b2: Pt = addPt(b, scalePt(unit, ext));
    segs.push(seg(a2, b2));
  }
  return segs;
}

// ── Interior chords (shared across strategies) ────────────────────────────────

function addInteriorChords(pts: Pt[], rng: Rng, maxChords: number): Segment[] {
  const segs: Segment[] = [];
  const n = pts.length;
  if (n < 4) return segs;
  const count = rng.int(0, maxChords + 1);
  for (let c = 0; c < count; c++) {
    const vi = rng.int(0, n);
    const skip = rng.int(2, n - 1);
    segs.push(seg(pts[vi]!, pts[(vi + skip) % n]!));
  }
  return segs;
}

// ── Main builder ─────────────────────────────────────────────────────────────

export function buildComplexFigure(shape: ShapeDef, rng: Rng): ComplexFigure {
  // Step 1: normalize — wider rotation (±30°), variable target size (65–90)
  const rotAngle = rng.range(-30, 30) * (Math.PI / 180);
  const targetSize = rng.range(65, 90);
  const pts = normalizeShape(shape.points, targetSize, rotAngle);
  const cen = centroid(pts);

  // Step 2: hidden shape edges (always first — these get highlighted on submit)
  const hiddenSegs = polySegs(pts);
  const hiddenSegmentCount = hiddenSegs.length;
  const allSegs: Segment[] = [...hiddenSegs];

  // Step 3: pick distractor strategy via weighted dice
  // Bounding rectangle is only safe for non-quads (a rect around a quad looks like another quad).
  const dice = rng.next();
  const isQuad = pts.length === 4;

  if (dice < 0.40) {
    // Strategy A: edge-attach (triangle variants only)
    allSegs.push(...strategyEdgeAttach(pts, cen, rng));
    allSegs.push(...addInteriorChords(pts, rng, 2));

  } else if (dice < 0.60) {
    // Strategy A + B: edge-attach AND bounding rectangle (quads fall back to radial fan)
    allSegs.push(...strategyEdgeAttach(pts, cen, rng));
    if (!isQuad) {
      allSegs.push(...strategyBoundingRect(pts));
      allSegs.push(...addInteriorChords(pts, rng, 1));
    } else {
      allSegs.push(...strategyRadialFan(pts, rng));
      allSegs.push(...addInteriorChords(pts, rng, 2));
    }

  } else if (dice < 0.75) {
    // Strategy B only: bounding rectangle (quads use radial fan instead)
    if (!isQuad) {
      allSegs.push(...strategyBoundingRect(pts));
      allSegs.push(...addInteriorChords(pts, rng, 3));
    } else {
      allSegs.push(...strategyRadialFan(pts, rng));
      allSegs.push(...addInteriorChords(pts, rng, 2));
    }

  } else if (dice < 0.88) {
    // Strategy C: radial fan from one vertex
    allSegs.push(...strategyRadialFan(pts, rng));
    allSegs.push(...addInteriorChords(pts, rng, 2));

  } else {
    // Strategy D: outer frame extension (edges elongated past vertices)
    allSegs.push(...strategyOuterFrame(pts, rng));
    allSegs.push(...addInteriorChords(pts, rng, 2));
  }

  return {
    segments: allSegs,
    hiddenSegmentCount,
    viewBox: computeViewBox(allSegs),
  };
}
