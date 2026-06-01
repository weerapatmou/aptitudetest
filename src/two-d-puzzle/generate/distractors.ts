import type { DistractorKind, Polygon, Pt } from '../types';
import { recenter } from './notch';
import { scalePolygonAboutCentroid } from '../../matching-parts-puzzle/generate/layout';
import { centroid, reflectPolygon } from '../../rotation-puzzle/generate/geometry';
import type { Rng } from '../../rotation-puzzle/generate/rng';

export type RawDistractor = {
  /** Recentered on the origin — distractors have no true position. */
  polygon: Polygon;
  kind: DistractorKind;
  explanation: string;
};

/** Distractor kinds available to draw from (excludes 'correct'). */
const KINDS: DistractorKind[] = [
  'scale-error',
  'proportion',
  'mirror-only',
  'overlap',
  'gap-short',
  'angle-mismatch',
  'near-twin',
  'incompatible-cut',
  'redundant',
];

/**
 * Build `n` wrong choices. Each is derived from one of the correct pieces
 * (so it stays plausibly sized) and mutated so it can no longer belong, except
 * `redundant` which synthesizes a fresh, unrelated piece. Always returns `n`.
 */
export function buildDistractors(sources: Polygon[], n: number, rng: Rng): RawDistractor[] {
  const kinds = rng.shuffle(KINDS.slice());
  const out: RawDistractor[] = [];
  let ki = 0;
  while (out.length < n) {
    const kind = kinds[ki % kinds.length]!;
    ki++;
    const src = recenter(rng.pick(sources));
    out.push(buildOne(kind, src, rng));
  }
  return out;
}

function buildOne(kind: DistractorKind, src: Polygon, rng: Rng): RawDistractor {
  switch (kind) {
    case 'scale-error': {
      const up = rng.bool();
      const s = up ? 1.22 + rng.next() * 0.12 : 0.66 + rng.next() * 0.1;
      return {
        polygon: scalePolygonAboutCentroid(src, s),
        kind,
        explanation: up
          ? 'Right shape, but scaled up — it would overflow the gap.'
          : 'Right shape, but scaled down — it would leave a gap.',
      };
    }
    case 'proportion': {
      const sx = rng.bool() ? 1.3 + rng.next() * 0.2 : 0.7 - rng.next() * 0.1;
      const sy = sx > 1 ? 0.78 : 1.28;
      return {
        polygon: stretch(src, sx, sy),
        kind,
        explanation: 'Stretched out of proportion — its sides no longer match the gap.',
      };
    }
    case 'mirror-only': {
      return {
        polygon: recenter(reflectPolygon(src, rng.bool() ? 'y' : 'diag')),
        kind,
        explanation: 'A mirror image — it would only fit if flipped, but pieces may only be rotated.',
      };
    }
    case 'overlap': {
      return {
        polygon: bumpEdge(src, rng, +1),
        kind,
        explanation: 'A bump juts out of one edge — it would overlap a neighbour or the boundary.',
      };
    }
    case 'gap-short': {
      return {
        polygon: bumpEdge(src, rng, -1),
        kind,
        explanation: 'A notch is cut into one edge — it would leave a gap when placed.',
      };
    }
    case 'angle-mismatch': {
      return {
        polygon: perturbVertex(src, rng, 16 + rng.next() * 8),
        kind,
        explanation: 'A corner angle is off — it cannot seat cleanly against the boundary.',
      };
    }
    case 'near-twin': {
      return {
        polygon: jitterVertices(src, rng, 7 + rng.next() * 4),
        kind,
        explanation: 'Almost matches a needed piece, but every edge is subtly wrong.',
      };
    }
    case 'incompatible-cut': {
      return {
        polygon: stretchOneEdge(src, rng),
        kind,
        explanation: 'Looks similar, but a joining edge is the wrong length — the cuts do not match.',
      };
    }
    case 'redundant':
    default: {
      return {
        polygon: freshPiece(src, rng),
        kind: 'redundant',
        explanation: 'A valid-looking piece that is not part of this gap at all.',
      };
    }
  }
}

// ---- geometry mutations ----

function stretch(poly: Polygon, sx: number, sy: number): Polygon {
  const c = centroid(poly);
  return poly.map((p) => ({ x: c.x + (p.x - c.x) * sx, y: c.y + (p.y - c.y) * sy }));
}

/** Insert a vertex at a random edge's midpoint, displaced perpendicular by ±offset. */
function bumpEdge(poly: Polygon, rng: Rng, sign: number): Polygon {
  const n = poly.length;
  const i = rng.int(0, n);
  const a = poly[i]!;
  const b = poly[(i + 1) % n]!;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const off = sign * (8 + rng.next() * 6);
  const v: Pt = { x: (a.x + b.x) / 2 + nx * off, y: (a.y + b.y) / 2 + ny * off };
  const out = poly.slice();
  out.splice(i + 1, 0, v);
  return out;
}

/** Move a single vertex by a vector of roughly `amount`. */
function perturbVertex(poly: Polygon, rng: Rng, amount: number): Polygon {
  const i = rng.int(0, poly.length);
  const ang = rng.next() * Math.PI * 2;
  return poly.map((p, j) =>
    j === i ? { x: p.x + Math.cos(ang) * amount, y: p.y + Math.sin(ang) * amount } : p,
  );
}

/** Jitter every vertex slightly — a believable near-twin. */
function jitterVertices(poly: Polygon, rng: Rng, amount: number): Polygon {
  return poly.map((p) => {
    const ang = rng.next() * Math.PI * 2;
    const r = amount * (0.5 + rng.next() * 0.5);
    return { x: p.x + Math.cos(ang) * r, y: p.y + Math.sin(ang) * r };
  });
}

/** Lengthen one edge by pushing its endpoint outward along the edge direction. */
function stretchOneEdge(poly: Polygon, rng: Rng): Polygon {
  const n = poly.length;
  const i = rng.int(0, n);
  const a = poly[i]!;
  const b = poly[(i + 1) % n]!;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const f = rng.bool() ? 1.35 : 0.62;
  const nb: Pt = { x: a.x + dx * f, y: a.y + dy * f };
  return poly.map((p, j) => (j === (i + 1) % n ? nb : p));
}

/** A fresh, unrelated triangle sized comparably to `ref`. */
function freshPiece(ref: Polygon, rng: Rng): Polygon {
  let r = 0;
  const c = centroid(ref);
  for (const p of ref) r = Math.max(r, Math.hypot(p.x - c.x, p.y - c.y));
  r = Math.max(24, r * (0.8 + rng.next() * 0.3));
  const base = rng.next() * Math.PI * 2;
  const tri: Polygon = [0, 1, 2].map((k) => {
    const ang = base + (k / 3) * Math.PI * 2 + (rng.next() - 0.5) * 0.7;
    const rad = r * (0.7 + rng.next() * 0.5);
    return { x: Math.cos(ang) * rad, y: Math.sin(ang) * rad };
  });
  return recenter(tri);
}
