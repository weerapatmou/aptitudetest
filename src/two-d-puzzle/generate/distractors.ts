import type { DistractorKind, Polygon, Pt } from '../types';
import { recenter } from './notch';
import { isRotationCongruent } from './congruence';
import { maxRadius, scalePolygonAboutCentroid } from '../../matching-parts-puzzle/generate/layout';
import { centroid, reflectPolygon } from '../../rotation-puzzle/generate/geometry';
import type { Rng } from '../../rotation-puzzle/generate/rng';

export type RawDistractor = {
  /** Recentered on the origin — distractors have no true position. */
  polygon: Polygon;
  kind: DistractorKind;
  explanation: string;
};

const REDUNDANT_EXPL = 'A valid-looking piece that is not part of this gap at all.';

/**
 * Distractor kinds with relative weights. Globally-perceptible differences
 * (size, proportion, whole different shape, mirror) are favoured so a wrong
 * piece can always be told apart by eye. `near-twin` is intentionally gone —
 * a piece that differs only by tiny per-edge jitter is impossible to judge
 * once it is also rotated.
 */
const KIND_WEIGHTS: Array<[DistractorKind, number]> = [
  ['scale-error', 3],
  ['proportion', 3],
  ['redundant', 2],
  ['mirror-only', 2],
  ['incompatible-cut', 2],
  ['angle-mismatch', 2],
  ['overlap', 1],
  ['gap-short', 1],
];

function pickKind(rng: Rng, used: Set<DistractorKind>): DistractorKind {
  // Prefer kinds not used yet in this question for variety.
  const pool = KIND_WEIGHTS.filter(([k]) => !used.has(k));
  const list = pool.length > 0 ? pool : KIND_WEIGHTS;
  const total = list.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [k, w] of list) {
    r -= w;
    if (r <= 0) return k;
  }
  return list[list.length - 1]![0];
}

/**
 * Build `n` wrong choices from the correct pieces. Each is mutated so it is both
 * (a) genuinely non-fitting — rejected if it is a pure rotation of any correct
 * piece (this also kills a mirror of a symmetric piece, which would actually
 * fit) — and (b) clamped to `budget` so it never overflows its card. Always
 * returns `n`.
 */
export function buildDistractors(
  correctPieces: Polygon[],
  n: number,
  rng: Rng,
  budget: number,
): RawDistractor[] {
  const out: RawDistractor[] = [];
  const used = new Set<DistractorKind>();
  let guard = 0;
  while (out.length < n && guard++ < 240) {
    const kind = pickKind(rng, used);
    const src = recenter(rng.pick(correctPieces));
    const raw = buildOne(kind, src, rng, budget);
    if (!raw) continue;
    raw.polygon = clampToBudget(raw.polygon, budget);
    if (raw.polygon.length < 3) continue;
    // Must not actually fit: reject anything that is a pure rotation of a correct piece.
    if (correctPieces.some((cp) => isRotationCongruent(raw.polygon, cp))) continue;
    out.push(raw);
    used.add(kind);
  }
  // Fallback: fresh unrelated pieces are guaranteed non-fitting.
  while (out.length < n) {
    let poly = clampToBudget(freshPiece(recenter(rng.pick(correctPieces)), rng), budget);
    if (correctPieces.some((cp) => isRotationCongruent(poly, cp))) {
      poly = clampToBudget(freshPiece(recenter(rng.pick(correctPieces)), rng), budget);
    }
    out.push({ polygon: poly, kind: 'redundant', explanation: REDUNDANT_EXPL });
  }
  return out;
}

function buildOne(kind: DistractorKind, src: Polygon, rng: Rng, budget: number): RawDistractor | null {
  switch (kind) {
    case 'scale-error': {
      const srcR = maxRadius(src) || 1;
      const headroom = budget / srcR;
      if (headroom >= 1.4) {
        const s = Math.max(1.3, Math.min(1.5, headroom * 0.95));
        return {
          polygon: scalePolygonAboutCentroid(src, s),
          kind,
          explanation: 'Right shape, but clearly too big — it would overflow the gap.',
        };
      }
      const s = 0.55 + rng.next() * 0.13; // 0.55–0.68
      return {
        polygon: scalePolygonAboutCentroid(src, s),
        kind,
        explanation: 'Right shape, but clearly too small — it would leave a gap.',
      };
    }
    case 'proportion': {
      const wide = rng.bool();
      const sx = wide ? 1.45 + rng.next() * 0.25 : 0.62;
      const sy = wide ? 0.72 : 1.5;
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
        polygon: perturbVertex(src, rng, 26 + rng.next() * 14), // 26–40
        kind,
        explanation: 'A corner angle is clearly off — it cannot seat against the boundary.',
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
        explanation: REDUNDANT_EXPL,
      };
    }
  }
}

// ---- geometry mutations ----

/** Uniformly scale a polygon down about its centroid if it exceeds the budget radius. */
function clampToBudget(poly: Polygon, budget: number): Polygon {
  const r = maxRadius(poly);
  if (r <= budget || r < 1e-6) return poly;
  return scalePolygonAboutCentroid(poly, (budget / r) * 0.99);
}

function stretch(poly: Polygon, sx: number, sy: number): Polygon {
  const c = centroid(poly);
  return poly.map((p) => ({ x: c.x + (p.x - c.x) * sx, y: c.y + (p.y - c.y) * sy }));
}

/** Insert a vertex at a random edge's midpoint, displaced perpendicular by ±(share of the piece). */
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
  const off = sign * Math.max(16, (0.28 + rng.next() * 0.14) * maxRadius(poly));
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

/** Lengthen or shorten one edge by pushing its endpoint along the edge direction. */
function stretchOneEdge(poly: Polygon, rng: Rng): Polygon {
  const n = poly.length;
  const i = rng.int(0, n);
  const a = poly[i]!;
  const b = poly[(i + 1) % n]!;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const f = rng.bool() ? 1.45 : 0.55;
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
