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
function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
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

export function normalizeShape(pts: [number, number][], targetSize: number, rotAngle: number): Pt[] {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = targetSize / Math.max(maxX - minX, maxY - minY, 1);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return pts.map(([x, y]) => rotPt([(x - cx) * scale, (y - cy) * scale], rotAngle));
}

// ── Strategy A: through-lines ─────────────────────────────────────────────────
// Lines cross from one edge to another and extend past both endpoints.
// They start/end at edge midpoints (not vertices) so they can never close into
// a recognizable polygon — unlike triangle attachments which share a hidden edge.

function strategyThroughLines(pts: Pt[], rng: Rng): Segment[] {
  const segs: Segment[] = [];
  const n = pts.length;
  const lineCount = rng.int(2, 4);
  const usedPairs = new Set<string>();

  for (let attempt = 0; attempt < lineCount * 3 && segs.length < lineCount; attempt++) {
    const e1 = rng.int(0, n);
    // Triangles: 1 edge gap is fine (crosses through). Quads+: need ≥2 to actually traverse the interior.
    const minSep = n <= 3 ? 1 : 2;
    const sep = rng.int(minSep, Math.max(minSep + 1, Math.floor(n / 2) + 1));
    const e2 = (e1 + sep) % n;

    const pairKey = `${Math.min(e1, e2)}-${Math.max(e1, e2)}`;
    if (usedPairs.has(pairKey)) continue;
    usedPairs.add(pairKey);

    const t1 = rng.range(0.2, 0.8);
    const t2 = rng.range(0.2, 0.8);
    const p1 = lerpPt(pts[e1]!, pts[(e1 + 1) % n]!, t1);
    const p2 = lerpPt(pts[e2]!, pts[(e2 + 1) % n]!, t2);

    const dir = normPt(subPt(p2, p1));
    const ext = rng.range(15, 30);
    segs.push(seg(
      subPt(p1, scalePt(dir, ext)),
      addPt(p2, scalePt(dir, ext)),
    ));
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
  const fanCount = rng.int(2, Math.min(4, n - 1));
  for (let f = 0; f < fanCount; f++) {
    const edgeIdx = (vi + 2 + f) % n;
    const a = pts[edgeIdx]!;
    const b = pts[(edgeIdx + 1) % n]!;
    const t = rng.range(0.25, 0.75);
    segs.push(seg(v, lerpPt(a, b, t)));
  }
  return segs;
}

// ── Strategy E: overlapping closed polygons ───────────────────────────────────
// 2–4 simple convex shapes are placed near the origin so they partially overlap
// the hidden shape. Every line in the figure belongs to a complete polygon, which
// forces the eye to trace carefully rather than dismissing crossing lines as noise.

const DISTRACTOR_POOL: Pt[][] = [
  // triangles
  [[0, -50], [43, 25], [-43, 25]],
  [[-45, -45], [45, -45], [-45, 45]],
  [[0, -52], [28, 40], [-28, 40]],
  [[-52, 30], [52, 30], [-10, -35]],
  // quadrilaterals
  [[-42, -42], [42, -42], [42, 42], [-42, 42]],
  [[-55, -28], [55, -28], [55, 28], [-55, 28]],
  [[-28, -35], [55, -35], [28, 35], [-55, 35]],
  [[-25, -35], [25, -35], [52, 35], [-52, 35]],
  // hexagon
  [[0, -52], [45, -26], [45, 26], [0, 52], [-45, 26], [-45, -26]],
];

function strategyOverlappingPolygons(rng: Rng): Segment[] {
  const allExtra: Segment[] = [];
  const numDistractors = rng.int(2, 4);
  for (let i = 0; i < numDistractors; i++) {
    const rawPts = DISTRACTOR_POOL[rng.int(0, DISTRACTOR_POOL.length)]!;
    const size = rng.range(45, 75);
    const angle = rng.range(-60, 60) * (Math.PI / 180);
    const distPts = normalizeShape(rawPts, size, angle);
    const dx = rng.range(-35, 35);
    const dy = rng.range(-35, 35);
    const offsetPts = distPts.map((p) => addPt(p, [dx, dy]));
    allExtra.push(...polySegs(offsetPts));
  }
  return allExtra;
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
    segs.push(seg(subPt(a, scalePt(unit, ext)), addPt(b, scalePt(unit, ext))));
  }
  return segs;
}

// ── Interior chords (shared supplement) ──────────────────────────────────────

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
  const rotAngle = rng.range(-45, 45) * (Math.PI / 180);
  const targetSize = rng.range(65, 90);
  const pts = normalizeShape(shape.points, targetSize, rotAngle);

  // Hidden shape edges are always first — highlighted on submit
  const hiddenSegs = polySegs(pts);
  const hiddenSegmentCount = hiddenSegs.length;
  const allSegs: Segment[] = [...hiddenSegs];

  // Bounding rect is only safe for non-quads (a rect around a quad looks like another quad)
  const dice = rng.next();
  const isQuad = pts.length === 4;

  if (dice < 0.55) {
    // Primary: overlapping closed polygons (PDF-style)
    allSegs.push(...strategyOverlappingPolygons(rng));

  } else if (dice < 0.70) {
    // Through-lines cross the shape interior
    allSegs.push(...strategyThroughLines(pts, rng));
    allSegs.push(...addInteriorChords(pts, rng, 2));

  } else if (dice < 0.80) {
    // Outer frame + interior chords
    allSegs.push(...strategyOuterFrame(pts, rng));
    allSegs.push(...addInteriorChords(pts, rng, 3));

  } else if (dice < 0.90) {
    // Radial fan + through-lines
    allSegs.push(...strategyRadialFan(pts, rng));
    allSegs.push(...strategyThroughLines(pts, rng));

  } else {
    // Bounding rect (non-quads) / radial fan (quads) + through-lines
    if (!isQuad) {
      allSegs.push(...strategyBoundingRect(pts));
    } else {
      allSegs.push(...strategyRadialFan(pts, rng));
    }
    allSegs.push(...strategyThroughLines(pts, rng));
  }

  return {
    segments: allSegs,
    hiddenSegmentCount,
    viewBox: computeViewBox(allSegs),
    shapeRotAngle: rotAngle,
    shapeTargetSize: targetSize,
  };
}
