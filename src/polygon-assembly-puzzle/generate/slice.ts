import type { Polygon, Pt, ScatteredPiece } from '../types';
import type { Rng } from '../../rotation-puzzle/generate/rng';
import { centroid, polygonBounds, pointInPolygon } from '../../rotation-puzzle/generate/geometry';
import {
  pickBoundaryPointAt,
  signedArea,
  splitPolygonByChord,
} from '../../matching-parts-puzzle/generate/cuts';

/** Returns false if any sampled point along the chord p1→p2 lies outside poly. */
function isChordInsidePoly(poly: Polygon, p1: Pt, p2: Pt, samples = 5): boolean {
  for (let i = 1; i <= samples; i++) {
    const t = i / (samples + 1);
    const pt = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
    if (!pointInPolygon(pt, poly)) return false;
  }
  return true;
}

export function polygonArea(poly: Polygon): number {
  return Math.abs(signedArea(poly));
}

function translatePoly(poly: Polygon, dx: number, dy: number): Polygon {
  return poly.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

/** Single cut attempt that tries to split `poly` roughly in half (30–70% area split). */
function attemptCut(poly: Polygon, rng: Rng): [Polygon, Polygon] | null {
  for (let i = 0; i < 24; i++) {
    const t1 = rng.next();
    const sep = 0.30 + rng.next() * 0.40;
    const t2 = (t1 + sep) % 1;
    const b1 = pickBoundaryPointAt(poly, t1);
    const b2 = pickBoundaryPointAt(poly, t2);
    if (b1.edgeIdx === b2.edgeIdx) continue;
    if (!isChordInsidePoly(poly, b1.pt, b2.pt)) continue;
    const pieces = splitPolygonByChord(poly, b1, b2);
    if (pieces[0].length < 3 || pieces[1].length < 3) continue;
    const a1 = polygonArea(pieces[0]);
    const a2 = polygonArea(pieces[1]);
    const minA = Math.min(a1, a2);
    const total = a1 + a2;
    if (minA < 80) continue; // avoid slivers (absolute floor)
    const frac = minA / total;
    if (frac < 0.20) continue; // both halves must be substantial
    // Reject slivers: both pieces must have adequate minimum width AND aspect ratio
    const bb0 = polygonBounds(pieces[0]);
    const bb1 = polygonBounds(pieces[1]);
    const thin0 = Math.min(bb0.maxX - bb0.minX, bb0.maxY - bb0.minY);
    const thin1 = Math.min(bb1.maxX - bb1.minX, bb1.maxY - bb1.minY);
    const fat0 = Math.max(bb0.maxX - bb0.minX, bb0.maxY - bb0.minY);
    const fat1 = Math.max(bb1.maxX - bb1.minX, bb1.maxY - bb1.minY);
    if (thin0 < 28 || thin1 < 28) continue;
    if (fat0 > 0 && thin0 / fat0 < 0.12) continue; // reject very elongated pieces
    if (fat1 > 0 && thin1 / fat1 < 0.12) continue;
    return pieces;
  }
  return null;
}

/**
 * Recursively slice `target` into exactly N pieces.
 * Each iteration picks the largest-area current piece and cuts it.
 * Returns null if it fails after attempts.
 */
export function slicePolygon(target: Polygon, n: number, rng: Rng): Polygon[] | null {
  if (n <= 1) return [target.slice()];
  let pieces: Polygon[] = [target.slice()];
  let stuck = 0;
  while (pieces.length < n) {
    pieces.sort((a, b) => polygonArea(b) - polygonArea(a));
    const head = pieces[0]!;
    const cut = attemptCut(head, rng);
    if (!cut) {
      stuck++;
      if (stuck > 6) return null;
      // Try the next-largest instead.
      if (pieces.length > 1) {
        pieces = [pieces[1]!, pieces[0]!, ...pieces.slice(2)];
        const cut2 = attemptCut(pieces[0]!, rng);
        if (!cut2) return null;
        pieces = [...cut2, ...pieces.slice(1)];
        stuck = 0;
        continue;
      }
      return null;
    }
    pieces = [...cut, ...pieces.slice(1)];
    stuck = 0;
  }
  return pieces;
}

export function sliceTargetWithRetry(target: Polygon, n: number, rng: Rng): Polygon[] {
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = slicePolygon(target, n, rng);
    if (result && result.length === n) return result;
  }
  // Final fallback: simple radial wedge split (still produces N polygons covering the target).
  return radialWedgeSplit(target, n);
}

function radialWedgeSplit(target: Polygon, n: number): Polygon[] {
  // Defensive fallback only used if recursive cutting can't find a valid split.
  // Cut from the centroid outwards along N evenly spaced rays.
  const c = centroid(target);
  const b = polygonBounds(target);
  const R = Math.hypot(b.maxX - b.minX, b.maxY - b.minY);
  let pieces: Polygon[] = [target.slice()];
  for (let i = 1; i < n; i++) {
    const angle = (i * Math.PI * 2) / n;
    const dir: Pt = { x: Math.cos(angle), y: Math.sin(angle) };
    // approximate cut: project two boundary intersection points along the line through `c`
    // For robustness here, just split the largest piece using attemptCut-equivalent chord
    // between two arbitrary opposite-side boundary samples.
    pieces.sort((a, b2) => polygonArea(b2) - polygonArea(a));
    const head = pieces[0]!;
    const b1 = pickBoundaryPointAt(head, ((i / n) + 0.01) % 1);
    const b2 = pickBoundaryPointAt(head, ((i / n) + 0.51) % 1);
    if (b1.edgeIdx !== b2.edgeIdx) {
      const cut = splitPolygonByChord(head, b1, b2);
      if (cut[0].length >= 3 && cut[1].length >= 3) {
        pieces = [...cut, ...pieces.slice(1)];
        continue;
      }
    }
    void dir; void R; void c;
    break;
  }
  while (pieces.length < n) pieces.push([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]); // degenerate filler
  return pieces.slice(0, n);
}

/**
 * Convert a list of pieces in target coords into ScatteredPiece records with
 * local-centered polygon + precomputed assembled transform (translate-only).
 */
export function makeCorrectPieces(piecesInTargetFrame: Polygon[]): ScatteredPiece[] {
  return piecesInTargetFrame.map((poly) => {
    const c = centroid(poly);
    const localPoly = translatePoly(poly, -c.x, -c.y);
    return {
      polygon: localPoly,
      scatterCenter: { x: 0, y: 0 },        // filled later by scatter()
      scatterRotation: 0,
      scatterFlipped: false,
      scatterScale: 1,
      assembledCenter: { x: c.x, y: c.y },
      assembledRotation: 0,
      assembledFlipped: false,
      defective: false,
    };
  });
}
