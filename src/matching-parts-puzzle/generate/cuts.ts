import type { BoundaryPoint, Cut, CutStrategy, Polygon, Pt } from '../types';
import { dist, pointInPolygon } from '../../rotation-puzzle/generate/geometry';
import type { Rng } from '../../rotation-puzzle/generate/rng';

/** Edge lengths and total perimeter of a closed polygon (treated cyclically). */
function edgeLengths(poly: Polygon): { lengths: number[]; total: number } {
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const d = dist(a, b);
    lengths.push(d);
    total += d;
  }
  return { lengths, total };
}

/** Pick a boundary point at perimeter parameter t in [0, 1). */
export function pickBoundaryPointAt(poly: Polygon, t: number): BoundaryPoint {
  const { lengths, total } = edgeLengths(poly);
  const target = ((t % 1) + 1) % 1 * total;
  let acc = 0;
  for (let i = 0; i < poly.length; i++) {
    const len = lengths[i]!;
    if (acc + len >= target || i === poly.length - 1) {
      const edgeT = len > 1e-9 ? (target - acc) / len : 0;
      const a = poly[i]!;
      const b = poly[(i + 1) % poly.length]!;
      return {
        pt: { x: a.x + (b.x - a.x) * edgeT, y: a.y + (b.y - a.y) * edgeT },
        edgeIdx: i,
        edgeT,
      };
    }
    acc += len;
  }
  // Should not reach here; fallback to first vertex.
  return { pt: poly[0]!, edgeIdx: 0, edgeT: 0 };
}

function compareBoundary(a: BoundaryPoint, b: BoundaryPoint): number {
  if (a.edgeIdx !== b.edgeIdx) return a.edgeIdx - b.edgeIdx;
  return a.edgeT - b.edgeT;
}

/**
 * Split `poly` into two polygons along the straight chord b1—b2. Both boundary
 * points must lie on the polygon's boundary.
 *
 * Piece 1 (the "near" side):  starts at the earlier boundary point, walks forward
 *   through intermediate vertices, ends at the later boundary point, closes with
 *   the chord back to the start.
 * Piece 2 (the "far" side):   starts at the later boundary point, wraps around
 *   through intermediate vertices, ends at the earlier boundary point.
 *
 * The two pieces share the chord segment in reverse, so they reassemble exactly.
 */
export function splitPolygonByChord(
  poly: Polygon,
  b1: BoundaryPoint,
  b2: BoundaryPoint,
): [Polygon, Polygon] {
  let a = b1;
  let b = b2;
  if (compareBoundary(a, b) > 0) {
    a = b2;
    b = b1;
  }
  const n = poly.length;

  // Piece 1: a.pt → v[a.edgeIdx+1] → ... → v[b.edgeIdx] → b.pt
  const piece1: Pt[] = [a.pt];
  for (let i = a.edgeIdx + 1; i <= b.edgeIdx; i++) {
    piece1.push(poly[i % n]!);
  }
  piece1.push(b.pt);

  // Piece 2: b.pt → v[b.edgeIdx+1] → ... wraps ... → v[a.edgeIdx] → a.pt
  const piece2: Pt[] = [b.pt];
  for (let step = 1; step <= n; step++) {
    const idx = (b.edgeIdx + step) % n;
    piece2.push(poly[idx]!);
    if (idx === a.edgeIdx) break;
  }
  piece2.push(a.pt);

  return [dedupConsecutive(piece1), dedupConsecutive(piece2)];
}

/**
 * Split `poly` along a polyline that goes b1 → bend1 → bend2 → … → b2.
 * Bend points are assumed to lie inside the polygon and form a simple path.
 *
 * Piece 1's boundary: a.pt → v[a+1] → ... → v[b] → b.pt → reversed bend path → a.pt
 * Piece 2's boundary: b.pt → v[b+1] → ... wraps ... → v[a] → a.pt → forward bend path → b.pt
 */
export function splitPolygonByPolyline(
  poly: Polygon,
  b1: BoundaryPoint,
  b2: BoundaryPoint,
  bendPts: Pt[],
): [Polygon, Polygon] {
  let a = b1;
  let b = b2;
  let bendForward = bendPts;
  if (compareBoundary(a, b) > 0) {
    a = b2;
    b = b1;
    bendForward = bendPts.slice().reverse();
  }
  const n = poly.length;

  const piece1: Pt[] = [a.pt];
  for (let i = a.edgeIdx + 1; i <= b.edgeIdx; i++) {
    piece1.push(poly[i % n]!);
  }
  piece1.push(b.pt);
  for (let i = bendForward.length - 1; i >= 0; i--) {
    piece1.push(bendForward[i]!);
  }

  const piece2: Pt[] = [b.pt];
  for (let step = 1; step <= n; step++) {
    const idx = (b.edgeIdx + step) % n;
    piece2.push(poly[idx]!);
    if (idx === a.edgeIdx) break;
  }
  piece2.push(a.pt);
  for (const pt of bendForward) piece2.push(pt);

  return [dedupConsecutive(piece1), dedupConsecutive(piece2)];
}

/**
 * Pick a single interior bend point: midpoint of the chord, displaced perpendicular
 * to it by [minOffset, maxOffset]. Returns null if the result isn't inside `poly`.
 */
export function pickInteriorBendPoint(
  poly: Polygon,
  a: Pt,
  b: Pt,
  rng: Rng,
  minOffset = 12,
  maxOffset = 34,
): Pt | null {
  const mid: Pt = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-6) return null;
  const nx = -dy / len;
  const ny = dx / len;
  for (let attempt = 0; attempt < 6; attempt++) {
    const sign = rng.bool() ? 1 : -1;
    const off = minOffset + (maxOffset - minOffset) * rng.next();
    const pt: Pt = { x: mid.x + nx * off * sign, y: mid.y + ny * off * sign };
    if (pointInPolygon(pt, poly)) return pt;
  }
  return null;
}

/**
 * Pick two interior bend points at ~1/3 and ~2/3 along the chord, each displaced
 * perpendicular to the chord (same side) by [minOffset, maxOffset]. Yields a
 * shallow zig-zag cut. Returns null if either point lands outside `poly`.
 */
export function pickTwoInteriorBendPoints(
  poly: Polygon,
  a: Pt,
  b: Pt,
  rng: Rng,
  minOffset = 12,
  maxOffset = 30,
): Pt[] | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-6) return null;
  const nx = -dy / len;
  const ny = dx / len;
  for (let attempt = 0; attempt < 6; attempt++) {
    const sign = rng.bool() ? 1 : -1;
    const off1 = minOffset + (maxOffset - minOffset) * rng.next();
    const off2 = minOffset + (maxOffset - minOffset) * rng.next();
    const p1: Pt = {
      x: a.x + dx / 3 + nx * off1 * sign,
      y: a.y + dy / 3 + ny * off1 * sign,
    };
    const p2: Pt = {
      x: a.x + (2 * dx) / 3 + nx * off2 * sign,
      y: a.y + (2 * dy) / 3 + ny * off2 * sign,
    };
    if (pointInPolygon(p1, poly) && pointInPolygon(p2, poly)) return [p1, p2];
  }
  return null;
}

/** Public cutting API: sample two boundary points and split the polygon. */
export function cutPolygon(
  poly: Polygon,
  strategy: CutStrategy,
  rng: Rng,
): { pieces: [Polygon, Polygon]; cut: Cut } | null {
  for (let attempt = 0; attempt < 16; attempt++) {
    const t1 = rng.next();
    const sep = 0.28 + rng.next() * 0.42; // separation in [0.28, 0.70] of the perimeter
    const t2 = (t1 + sep) % 1;
    const b1 = pickBoundaryPointAt(poly, t1);
    const b2 = pickBoundaryPointAt(poly, t2);
    if (b1.edgeIdx === b2.edgeIdx) continue;

    if (strategy === 'straight-chord') {
      const pieces = splitPolygonByChord(poly, b1, b2);
      if (!piecesAreValid(pieces)) continue;
      return {
        pieces,
        cut: { strategy, bp1: b1, bp2: b2, cutPath: [b1.pt, b2.pt] },
      };
    }

    // ~35% of polyline cuts get a second bend for a more interesting zig-zag.
    const bends =
      rng.next() < 0.35
        ? pickTwoInteriorBendPoints(poly, b1.pt, b2.pt, rng)
        : (() => {
            const bend = pickInteriorBendPoint(poly, b1.pt, b2.pt, rng);
            return bend ? [bend] : null;
          })();
    if (!bends) continue;
    const pieces = splitPolygonByPolyline(poly, b1, b2, bends);
    if (!piecesAreValid(pieces)) continue;
    return {
      pieces,
      cut: { strategy, bp1: b1, bp2: b2, cutPath: [b1.pt, ...bends, b2.pt] },
    };
  }
  return null;
}

function piecesAreValid(pieces: [Polygon, Polygon]): boolean {
  for (const p of pieces) {
    if (p.length < 3) return false;
    if (Math.abs(signedArea(p)) < 5) return false;
  }
  return true;
}

export function signedArea(poly: Polygon): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

function dedupConsecutive(poly: Polygon, eps = 1e-4): Polygon {
  const out: Polygon = [];
  for (const p of poly) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.x - p.x) > eps || Math.abs(last.y - p.y) > eps) {
      out.push(p);
    }
  }
  // also strip last if equal to first
  if (out.length > 1) {
    const first = out[0]!;
    const last = out[out.length - 1]!;
    if (Math.abs(first.x - last.x) < eps && Math.abs(first.y - last.y) < eps) {
      out.pop();
    }
  }
  return out;
}
