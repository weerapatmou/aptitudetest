import type { Rng } from '@/rotation-puzzle/generate/rng';
import {
  centroid,
  dist,
  polygonBounds,
  bboxDiagonal,
  rotatePoint,
} from '@/rotation-puzzle/generate/geometry';
import { DISTRACTOR_EXPLANATION } from '../types';
import type { Choice, DistractorKind, OuterShape, Pt } from '../types';

export type Ctx = {
  /** The reference outline (always a polygon kind — ellipse is excluded). */
  reference: OuterShape & { vertices: Pt[] };
  rng: Rng;
};

const DISTORTION_KINDS = [
  'vertex-moved',
  'vertex-added',
  'vertex-removed',
  'stretched',
  'skewed',
] as const;

/** Always include the mirror; fill the remaining three slots from the distortion pool. */
export function pickDistractorKinds(rng: Rng): DistractorKind[] {
  const pool = rng.shuffle([...DISTORTION_KINDS]);
  return ['mirror', ...pool.slice(0, 3)];
}

export function buildDistractor(kind: DistractorKind, ctx: Ctx): Choice | null {
  if (kind === 'mirror') {
    // Same outline, mirror-flipped, at a fresh display angle. Always valid for
    // an asymmetric shape (chirality differs → never a pure rotation).
    return choice('mirror', ctx.reference, ctx.rng, true);
  }
  const verts = mutate(kind, ctx);
  if (!verts) return null;
  if (!isSimplePolygon(verts)) return null;
  const shape: OuterShape = { kind: 'irregularPolygon', vertices: verts };
  return choice(kind, shape, ctx.rng, false);
}

function choice(kind: DistractorKind, shape: OuterShape, rng: Rng, flipX: boolean): Choice {
  return {
    shape,
    transform: { rotate: rng.range(0, 360), flipX },
    isCorrect: false,
    kind,
    explanation: DISTRACTOR_EXPLANATION[kind as Exclude<DistractorKind, 'correct'>],
  };
}

// ---- Vertex math ----

function mutate(kind: DistractorKind, ctx: Ctx): Pt[] | null {
  const verts = ctx.reference.vertices;
  const rng = ctx.rng;
  const c = centroid(verts);
  const diag = bboxDiagonal(polygonBounds(verts));
  const delta = Math.max(diag * 0.11, 12);

  switch (kind) {
    case 'vertex-moved': {
      const n = verts.length;
      const i = rng.int(0, n);
      const cur = verts[i]!;
      const prev = verts[(i - 1 + n) % n]!;
      const next = verts[(i + 1) % n]!;
      const out = unit({ x: cur.x - c.x, y: cur.y - c.y });
      const tan = unit({ x: next.x - prev.x, y: next.y - prev.y });
      const sign = rng.bool() ? 1 : -1;
      const j = rng.range(-0.3, 0.3) * delta;
      const moved: Pt = {
        x: cur.x + out.x * delta * sign + tan.x * j,
        y: cur.y + out.y * delta * sign + tan.y * j,
      };
      const copy = verts.slice();
      copy[i] = moved;
      return copy;
    }
    case 'vertex-added': {
      const n = verts.length;
      const i = rng.int(0, n);
      const a = verts[i]!;
      const b = verts[(i + 1) % n]!;
      const t = rng.range(0.4, 0.6);
      const m: Pt = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      // Outward normal of the edge (perpendicular, pointing away from centroid).
      let nrm = unit({ x: b.y - a.y, y: -(b.x - a.x) });
      if ((m.x - c.x) * nrm.x + (m.y - c.y) * nrm.y < 0) nrm = { x: -nrm.x, y: -nrm.y };
      const sign = rng.bool() ? 1 : -1; // bump out or notch in
      const np: Pt = { x: m.x + nrm.x * delta * sign, y: m.y + nrm.y * delta * sign };
      const copy = verts.slice();
      copy.splice(i + 1, 0, np);
      return copy;
    }
    case 'vertex-removed': {
      const n = verts.length;
      if (n < 5) return null;
      // Remove the vertex that deviates most from its neighbour-chord, so the
      // silhouette change is clearly visible.
      let bestI = 0;
      let bestDev = -1;
      for (let i = 0; i < n; i++) {
        const dev = pointToSegment(verts[i]!, verts[(i - 1 + n) % n]!, verts[(i + 1) % n]!);
        if (dev > bestDev) {
          bestDev = dev;
          bestI = i;
        }
      }
      const copy = verts.slice();
      copy.splice(bestI, 1);
      return copy;
    }
    case 'stretched': {
      const phi = rng.range(0, 180);
      const factor = rng.bool() ? rng.range(1.2, 1.45) : rng.range(0.6, 0.8);
      return verts.map((v) => {
        let p: Pt = { x: v.x - c.x, y: v.y - c.y };
        p = rotatePoint(p, -phi);
        p = { x: p.x * factor, y: p.y };
        p = rotatePoint(p, phi);
        return { x: p.x + c.x, y: p.y + c.y };
      });
    }
    case 'skewed': {
      const k = rng.range(0.28, 0.46) * (rng.bool() ? 1 : -1);
      return verts.map((v) => {
        const p: Pt = { x: v.x - c.x, y: v.y - c.y };
        return { x: p.x + k * p.y + c.x, y: p.y + c.y };
      });
    }
    default:
      return null;
  }
}

// ---- Geometry helpers ----

function unit(p: Pt): Pt {
  const m = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / m, y: p.y / m };
}

function pointToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** True if no two non-adjacent edges of the polygon cross. */
export function isSimplePolygon(verts: Pt[]): boolean {
  const n = verts.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    const a1 = verts[i]!;
    const a2 = verts[(i + 1) % n]!;
    for (let j = i + 1; j < n; j++) {
      // Skip shared-endpoint edge pairs (adjacent edges, and the wrap-around pair).
      if (j === i) continue;
      if ((i + 1) % n === j || (j + 1) % n === i) continue;
      const b1 = verts[j]!;
      const b2 = verts[(j + 1) % n]!;
      if (segmentsIntersect(a1, a2, b1, b2)) return false;
    }
  }
  return true;
}

function segmentsIntersect(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

function cross(a: Pt, b: Pt, c: Pt): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
