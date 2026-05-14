import type { BoundingBox, OuterShape, Pt, Polygon, Transform } from '../types';

export const TAU = Math.PI * 2;

export const deg2rad = (d: number) => (d * Math.PI) / 180;
export const rad2deg = (r: number) => (r * 180) / Math.PI;

/** Rotate a point CCW (math convention) by `deg` degrees around origin. */
export function rotatePoint(p: Pt, deg: number): Pt {
  const r = deg2rad(deg);
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export function rotatePolygon(poly: Polygon, deg: number): Polygon {
  return poly.map((p) => rotatePoint(p, deg));
}

export function reflectPoint(p: Pt, axis: 'x' | 'y' | 'diag' | 'antidiag'): Pt {
  switch (axis) {
    case 'x':
      return { x: p.x, y: -p.y };
    case 'y':
      return { x: -p.x, y: p.y };
    case 'diag':
      return { x: p.y, y: p.x };
    case 'antidiag':
      return { x: -p.y, y: -p.x };
  }
}

export function reflectPolygon(poly: Polygon, axis: 'x' | 'y' | 'diag' | 'antidiag'): Polygon {
  return poly.map((p) => reflectPoint(p, axis));
}

export function polygonBounds(poly: Polygon): BoundingBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function centroid(poly: Polygon): Pt {
  let x = 0, y = 0;
  for (const p of poly) { x += p.x; y += p.y; }
  return { x: x / poly.length, y: y / poly.length };
}

export function applyTransform(poly: Polygon, t: Transform): Polygon {
  // flipX (across y-axis) THEN rotate CCW by t.rotate.
  const flipped = t.flipX ? poly.map((p) => ({ x: -p.x, y: p.y })) : poly;
  return rotatePolygon(flipped, t.rotate);
}

export function dist(a: Pt, b: Pt): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Ray-casting point-in-polygon. */
export function pointInPolygon(p: Pt, poly: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i]!, pj = poly[j]!;
    const intersect =
      pi.y > p.y !== pj.y > p.y &&
      p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y + 1e-12) + pi.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Min distance from p to any segment of polygon (edges). Returns 0 if outside the polygon's edge boundary but we don't differentiate — caller uses it for margin tests. */
export function distanceToPolygonEdge(p: Pt, poly: Polygon): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const d = pointToSegmentDistance(p, a, b);
    if (d < best) best = d;
  }
  return best;
}

function pointToSegmentDistance(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Densely sample an OuterShape's boundary as a point cloud (count points). */
export function samplePolygon(shape: OuterShape, n = 200): Pt[] {
  if (shape.kind === 'asymmetricEllipse') {
    return sampleEllipseBoundary(shape.rx, shape.ry, shape.flatSide, n);
  }
  return resamplePolygon(shape.vertices, n);
}

export function resamplePolygon(verts: Polygon, n: number): Pt[] {
  if (verts.length === 0) return [];
  // Compute total perimeter
  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i]!;
    const b = verts[(i + 1) % verts.length]!;
    const d = dist(a, b);
    segLens.push(d);
    total += d;
  }
  if (total < 1e-9) return verts.slice();
  const out: Pt[] = [];
  const step = total / n;
  let segIdx = 0;
  let segStart = 0;
  for (let i = 0; i < n; i++) {
    const target = i * step;
    while (segIdx < segLens.length && segStart + segLens[segIdx]! < target) {
      segStart += segLens[segIdx]!;
      segIdx++;
    }
    if (segIdx >= segLens.length) {
      out.push(verts[verts.length - 1]!);
      continue;
    }
    const a = verts[segIdx]!;
    const b = verts[(segIdx + 1) % verts.length]!;
    const tNorm = (target - segStart) / (segLens[segIdx]! || 1);
    out.push({ x: a.x + (b.x - a.x) * tNorm, y: a.y + (b.y - a.y) * tNorm });
  }
  return out;
}

function sampleEllipseBoundary(rx: number, ry: number, flatSide: 'top' | 'left' | undefined, n: number): Pt[] {
  const pts: Pt[] = [];
  if (!flatSide) {
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU;
      pts.push({ x: rx * Math.cos(t), y: ry * Math.sin(t) });
    }
    return pts;
  }
  // Build a closed boundary: ellipse arc (3/4) + a flat side. flatSide='top' means y=ry flat segment.
  // We'll parameterize by walking around: choose the angular range to OMIT and place a chord.
  // For 'top': omit angles around -90° (canvas-coords flip) → use [angle range that excludes top]
  const omitCenter = flatSide === 'top' ? -Math.PI / 2 : Math.PI; // 'left' centered at π
  const omitHalf = Math.PI / 3; // 60° arc replaced by a chord
  const arcStart = omitCenter + omitHalf;
  const arcEnd = omitCenter - omitHalf + TAU;
  const arcN = Math.round(n * 0.85);
  for (let i = 0; i < arcN; i++) {
    const t = arcStart + ((arcEnd - arcStart) * i) / arcN;
    pts.push({ x: rx * Math.cos(t), y: ry * Math.sin(t) });
  }
  // chord
  const chordN = n - arcN;
  const a = pts[pts.length - 1]!;
  const b = { x: rx * Math.cos(arcStart), y: ry * Math.sin(arcStart) };
  for (let i = 1; i <= chordN; i++) {
    const t = i / (chordN + 1);
    pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return pts;
}

export function outerVertices(shape: OuterShape, n = 200): Pt[] {
  return samplePolygon(shape, n);
}

/** Polygon-style vertices accessor (works for ellipse via sampling). */
export function outerEdgePoly(shape: OuterShape, n = 80): Polygon {
  return samplePolygon(shape, n);
}

export function bboxDiagonal(b: BoundingBox): number {
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  return Math.sqrt(w * w + h * h);
}

/** Normalize an angle to (-180, 180] */
export function normalizeAngle(deg: number): number {
  let a = ((deg % 360) + 360) % 360;
  if (a > 180) a -= 360;
  return a;
}

/** Angle distance in [0, 180] */
export function angleDistance(a: number, b: number): number {
  const d = Math.abs(normalizeAngle(a - b));
  return d;
}
