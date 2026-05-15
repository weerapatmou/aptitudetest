import type { Defect, Difficulty, Mode, ScatteredPiece } from '../types';
import type { Rng } from '../../rotation-puzzle/generate/rng';
import { centroid } from '../../rotation-puzzle/generate/geometry';
import { polygonArea } from './slice';

function cloneScattered(pieces: ScatteredPiece[]): ScatteredPiece[] {
  return pieces.map((p) => ({
    polygon: p.polygon.map((pt) => ({ x: pt.x, y: pt.y })),
    scatterCenter: { x: p.scatterCenter.x, y: p.scatterCenter.y },
    scatterRotation: p.scatterRotation,
    scatterFlipped: p.scatterFlipped,
    scatterScale: p.scatterScale,
    assembledCenter: { x: p.assembledCenter.x, y: p.assembledCenter.y },
    assembledRotation: p.assembledRotation,
    assembledFlipped: p.assembledFlipped,
    defective: p.defective,
  }));
}

/** Scale every vertex of the piece by `factor` around its centroid (which is origin in local coords). */
function applyScale(piece: ScatteredPiece, factor: number): void {
  piece.polygon = piece.polygon.map((p) => ({ x: p.x * factor, y: p.y * factor }));
  // assembledCenter stays the same so the wrong-size piece is centered on its intended slot —
  // exposes the gap or overlap cleanly.
}

/** Move one vertex along the next-edge direction by ±20% so an internal edge length changes. */
function applyEdgeLength(piece: ScatteredPiece, rng: Rng): void {
  if (piece.polygon.length < 4) return;
  const i = rng.int(0, piece.polygon.length);
  const cur = piece.polygon[i]!;
  const next = piece.polygon[(i + 1) % piece.polygon.length]!;
  const dx = next.x - cur.x, dy = next.y - cur.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-3) return;
  const factor = rng.bool() ? 0.20 : -0.20;
  const ux = dx / len, uy = dy / len;
  const newNext = { x: next.x + ux * len * factor, y: next.y + uy * len * factor };
  const newPoly = piece.polygon.slice();
  newPoly[(i + 1) % newPoly.length] = newNext;
  piece.polygon = newPoly;
}

/** Rotate one vertex's outgoing edge by ±18° around that vertex. */
function applyAngle(piece: ScatteredPiece, rng: Rng): void {
  if (piece.polygon.length < 4) return;
  const i = rng.int(0, piece.polygon.length);
  const v = piece.polygon[i]!;
  const next = piece.polygon[(i + 1) % piece.polygon.length]!;
  const dx = next.x - v.x, dy = next.y - v.y;
  const ang = (rng.bool() ? 1 : -1) * 18 * Math.PI / 180;
  const c = Math.cos(ang), s = Math.sin(ang);
  const rx = dx * c - dy * s;
  const ry = dx * s + dy * c;
  const newNext = { x: v.x + rx, y: v.y + ry };
  const newPoly = piece.polygon.slice();
  newPoly[(i + 1) % newPoly.length] = newNext;
  piece.polygon = newPoly;
}

/** Replace a piece with a different shape (regular polygon) of equivalent area. */
function applySubstitution(piece: ScatteredPiece, rng: Rng): void {
  const A = polygonArea(piece.polygon);
  // Pick a different vertex count from the original.
  const choices = [3, 4, 5, 6].filter((n) => n !== piece.polygon.length);
  const n = rng.pick(choices);
  // Regular n-gon area: 0.5 * n * r^2 * sin(2π/n) → solve for r.
  const r = Math.sqrt((2 * A) / (n * Math.sin((2 * Math.PI) / n)));
  const verts = [];
  const phase = rng.range(0, Math.PI * 2);
  for (let i = 0; i < n; i++) {
    const a = phase + (i * 2 * Math.PI) / n;
    verts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  // Re-center so centroid at origin (already is for regular polygon).
  piece.polygon = verts;
  // Recompute centroid offset (should be ~0 for regular polygon).
  const c = centroid(verts);
  piece.polygon = verts.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
}

/** Apply a single defect to a fresh clone of `correctPieces`, targeting the piece at `pieceIdx`. */
export function buildDefective(
  correctPieces: ScatteredPiece[],
  defect: Defect,
  pieceIdx: number,
  rng: Rng,
): ScatteredPiece[] {
  const clone = cloneScattered(correctPieces);
  if (defect === 'correct') return clone;
  const targetIdx = Math.max(0, Math.min(clone.length - 1, pieceIdx));
  const piece = clone[targetIdx]!;
  piece.defective = true;

  switch (defect) {
    case 'mirror-trap':
      piece.scatterFlipped = true;
      break;
    case 'scale': {
      const choices = [0.78, 0.82, 1.18, 1.22];
      applyScale(piece, rng.pick(choices));
      break;
    }
    case 'edge-length':
      applyEdgeLength(piece, rng);
      break;
    case 'angle':
      applyAngle(piece, rng);
      break;
    case 'substitution':
      applySubstitution(piece, rng);
      break;
  }
  return clone;
}

/** Choose 3 UNIQUE distractor defect kinds for the mode and difficulty (4 options total = 1 correct + 3 distractors). */
export function pickDistractorKinds(mode: Mode, difficulty: Difficulty, rng: Rng): Defect[] {
  const mirrorPool: Defect[] = ['scale', 'edge-length', 'angle', 'substitution'];
  if (mode === 'mirror') {
    if (difficulty === 'easy') {
      // Bias toward obvious defects, but keep all three distinct.
      return rng.shuffle<Defect>(['scale', 'substitution', 'angle']);
    }
    // medium/hard/expert: pick 3 distinct kinds from the 4-defect pool.
    return rng.shuffle([...mirrorPool]).slice(0, 3);
  }
  // strict mode: always include exactly one mirror-trap; 2 DISTINCT others from the pool.
  const others = rng.shuffle([...mirrorPool]).slice(0, 2);
  return rng.shuffle<Defect>(['mirror-trap', ...others]);
}

/** Return shuffled top-half piece indices by area (largest pieces, most visible). */
export function rankedTopHalfIndices(pieces: ScatteredPiece[], rng: Rng): number[] {
  const ranked = pieces
    .map((p, i) => ({ i, a: polygonArea(p.polygon) }))
    .sort((a, b) => b.a - a.a);
  const half = Math.max(1, Math.floor(ranked.length / 2));
  return rng.shuffle(ranked.slice(0, half).map((r) => r.i));
}

/** Return all piece indices shuffled (used as a fallback when top-half doesn't have enough). */
export function rankedAllIndices(pieces: ScatteredPiece[], rng: Rng): number[] {
  const ranked = pieces
    .map((p, i) => ({ i, a: polygonArea(p.polygon) }))
    .sort((a, b) => b.a - a.a);
  return rng.shuffle(ranked.map((r) => r.i));
}
