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

// ── linePolyIntersect ─────────────────────────────────────────────────────────
// Extends the infinite line through p1→p2 and returns the two points where it
// crosses the convex polygon boundary (or null if the line is parallel to all edges).

function linePolyIntersect(p1: Pt, p2: Pt, poly: Pt[]): [Pt, Pt] | null {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const eps = 1e-9;
  const hits: Pt[] = [];
  const n = poly.length;

  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const rx = a[0] - p1[0];
    const ry = a[1] - p1[1];

    // Solve: p1 + t*(p2-p1) = a + s*(b-a)
    // denom = ex*dy - dx*ey
    // s = (dx*ry - dy*rx) / denom   ← must be in [0,1] to be on the edge
    const denom = ex * dy - dx * ey;
    if (Math.abs(denom) < eps) continue; // parallel

    const s = (dx * ry - dy * rx) / denom;
    if (s < -eps || s > 1 + eps) continue; // outside edge

    const x = a[0] + s * ex;
    const y = a[1] + s * ey;

    // Deduplicate corner hits (within tolerance)
    if (!hits.some((h) => Math.abs(h[0] - x) < 0.1 && Math.abs(h[1] - y) < 0.1)) {
      hits.push([x, y]);
    }
  }

  if (hits.length >= 2) return [hits[0]!, hits[1]!];
  return null;
}

// ── PDF-style: Subdivided Container Frame ─────────────────────────────────────
//
// Core idea matching both PDF test styles:
//   1. A container polygon (rect or diamond) is drawn around the hidden shape.
//   2. Each edge of the hidden shape is extended all the way to the container
//      boundary, becoming a full interior dividing line.
//   3. 0–2 extra random interior lines may be added for additional complexity.
//
// Result: a clean geometric composition where the hidden shape is exactly ONE
// of the resulting sub-regions — identical to the look of both PDF tests.
//
// containerType = 'rect'    → axis-aligned bounding rectangle
// containerType = 'diamond' → rotated square (diamond) sized to the shape

function strategySubdividedFrame(pts: Pt[], rng: Rng, containerType: 'rect' | 'diamond'): Segment[] {
  const extraSegs: Segment[] = [];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const pad = rng.range(18, 32);

  // Build container polygon
  let container: Pt[];
  if (containerType === 'rect') {
    const x1 = Math.min(...xs) - pad, y1 = Math.min(...ys) - pad;
    const x2 = Math.max(...xs) + pad, y2 = Math.max(...ys) + pad;
    container = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
  } else {
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const halfW = (Math.max(...xs) - Math.min(...xs)) / 2 + pad;
    const halfH = (Math.max(...ys) - Math.min(...ys)) / 2 + pad;
    const R = Math.sqrt(halfW * halfW + halfH * halfH);
    container = [[cx, cy - R], [cx + R, cy], [cx, cy + R], [cx - R, cy]];
  }

  // Draw container boundary
  extraSegs.push(...polySegs(container));

  // Extend each hidden shape edge all the way to the container boundary
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const hit = linePolyIntersect(pts[i]!, pts[(i + 1) % n]!, container);
    if (hit) extraSegs.push(seg(hit[0], hit[1]));
  }

  // Add 0–2 extra random interior lines connecting points on different container edges
  const extraCount = rng.int(0, 3);
  const nc = container.length;
  const usedEdgePairs = new Set<string>();
  for (let k = 0; k < extraCount; k++) {
    const e1 = rng.int(0, nc);
    const offset = rng.int(1, Math.ceil(nc / 2) + 1);
    const e2 = (e1 + offset) % nc;
    const pairKey = `${Math.min(e1, e2)}-${Math.max(e1, e2)}`;
    if (usedEdgePairs.has(pairKey)) continue;
    usedEdgePairs.add(pairKey);
    const pA = lerpPt(container[e1]!, container[(e1 + 1) % nc]!, rng.range(0.2, 0.8));
    const pB = lerpPt(container[e2]!, container[(e2 + 1) % nc]!, rng.range(0.2, 0.8));
    extraSegs.push(seg(pA, pB));
  }

  return extraSegs;
}

// ── Fallback A: through-lines ─────────────────────────────────────────────────

function strategyThroughLines(pts: Pt[], rng: Rng): Segment[] {
  const segs: Segment[] = [];
  const n = pts.length;
  const lineCount = rng.int(2, 4);
  const usedPairs = new Set<string>();

  for (let attempt = 0; attempt < lineCount * 3 && segs.length < lineCount; attempt++) {
    const e1 = rng.int(0, n);
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

// ── Fallback B: outer frame extension ────────────────────────────────────────

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

// ── Interior chords (supplement) ─────────────────────────────────────────────

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
  // Nearly no rotation — shape appears at the same orientation as in the legend,
  // matching the PDF test format where the hidden shape is not rotated.
  const rotAngle = rng.range(-8, 8) * (Math.PI / 180);
  const targetSize = rng.range(58, 78);
  const pts = normalizeShape(shape.points, targetSize, rotAngle);

  // Hidden shape edges are always first — highlighted on submit
  const hiddenSegs = polySegs(pts);
  const hiddenSegmentCount = hiddenSegs.length;
  const allSegs: Segment[] = [...hiddenSegs];

  const dice = rng.next();

  if (dice < 0.50) {
    // Primary (50%): rectangular subdivided frame — matches PDF 1 style
    allSegs.push(...strategySubdividedFrame(pts, rng, 'rect'));

  } else if (dice < 0.80) {
    // Secondary (30%): diamond subdivided frame — matches PDF 2 diamond figures
    allSegs.push(...strategySubdividedFrame(pts, rng, 'diamond'));

  } else if (dice < 0.90) {
    // Fallback (10%): through-lines + interior chords
    allSegs.push(...strategyThroughLines(pts, rng));
    allSegs.push(...addInteriorChords(pts, rng, 2));

  } else {
    // Fallback (10%): outer frame extension + chords
    allSegs.push(...strategyOuterFrame(pts, rng));
    allSegs.push(...addInteriorChords(pts, rng, 3));
  }

  return {
    segments: allSegs,
    hiddenSegmentCount,
    viewBox: computeViewBox(allSegs),
    shapeRotAngle: rotAngle,
    shapeTargetSize: targetSize,
  };
}
