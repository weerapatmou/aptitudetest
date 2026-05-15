import type { Polygon, Pt, ScatteredPiece } from '../types';
import type { Rng } from '../../rotation-puzzle/generate/rng';
import { polygonBounds, pointInPolygon, rotatePolygon } from '../../rotation-puzzle/generate/geometry';

export const SCATTER_HALF = 50;
const BORDER_PAD = 5;
const CELL_GAP = 3;

function transformPiecePoly(
  poly: Polygon,
  flip: boolean,
  rotDeg: number,
  scale: number,
  cx: number,
  cy: number,
): Polygon {
  const flipped: Polygon = flip ? poly.map((p) => ({ x: -p.x, y: p.y })) : poly;
  const rotated = rotatePolygon(flipped, rotDeg);
  return rotated.map((p) => ({ x: p.x * scale + cx, y: p.y * scale + cy }));
}

function applyScatter(p: ScatteredPiece): Polygon {
  return transformPiecePoly(
    p.polygon,
    p.scatterFlipped,
    p.scatterRotation,
    p.scatterScale,
    p.scatterCenter.x,
    p.scatterCenter.y,
  );
}

/** Coarse polygon-vs-polygon overlap test: sample one polygon's boundary and
 * test each sample with pointInPolygon against the other (and vice versa). */
function polygonsOverlap(a: Polygon, b: Polygon, samples = 18): boolean {
  for (let i = 0; i < a.length; i++) {
    if (pointInPolygon(a[i]!, b)) return true;
  }
  for (let i = 0; i < b.length; i++) {
    if (pointInPolygon(b[i]!, a)) return true;
  }
  // Sample edge midpoints too so we catch edge-clip cases.
  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    const ai = Math.floor(t * a.length);
    const ni = (ai + 1) % a.length;
    const m = {
      x: (a[ai]!.x + a[ni]!.x) / 2,
      y: (a[ai]!.y + a[ni]!.y) / 2,
    };
    if (pointInPolygon(m, b)) return true;
  }
  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    const bi = Math.floor(t * b.length);
    const ni = (bi + 1) % b.length;
    const m = {
      x: (b[bi]!.x + b[ni]!.x) / 2,
      y: (b[bi]!.y + b[ni]!.y) / 2,
    };
    if (pointInPolygon(m, a)) return true;
  }
  return false;
}

function pickGrid(n: number): { cols: number; rows: number } {
  if (n <= 1) return { cols: 1, rows: 1 };
  if (n === 2) return { cols: 2, rows: 1 };
  if (n === 3 || n === 4) return { cols: 2, rows: 2 };
  if (n === 5 || n === 6) return { cols: 3, rows: 2 };
  if (n <= 9) return { cols: 3, rows: 3 };
  return { cols: Math.ceil(Math.sqrt(n)), rows: Math.ceil(n / Math.ceil(Math.sqrt(n))) };
}

/** Compute the scale needed to fit `bbox` inside (maxW, maxH). Never scale up. */
function fitScale(bboxW: number, bboxH: number, maxW: number, maxH: number): number {
  if (bboxW <= maxW && bboxH <= maxH) return 1;
  return Math.min(maxW / bboxW, maxH / bboxH);
}

/**
 * Distribute pieces across a grid of cells so they never overlap and have generous spacing.
 * For each piece:
 *   - assigned a random cell (cells shuffled each puzzle for variety);
 *   - tried at up to 30 rotations to find one that fits and doesn't overlap any earlier piece;
 *   - scaled DOWN to fit its cell if it's too big (scale stored on the piece, polygon not mutated).
 */
export function scatterPieces(pieces: ScatteredPiece[], rng: Rng): void {
  const N = pieces.length;
  const { cols, rows } = pickGrid(N);
  const region = SCATTER_HALF * 2;
  const usableW = region - BORDER_PAD * 2 - CELL_GAP * (cols - 1);
  const usableH = region - BORDER_PAD * 2 - CELL_GAP * (rows - 1);
  const cellW = usableW / cols;
  const cellH = usableH / rows;

  // Build all (i, j) cells, shuffle, take N.
  const allCells: Array<{ cx: number; cy: number }> = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cellLeft = -SCATTER_HALF + BORDER_PAD + i * (cellW + CELL_GAP);
      const cellTop = -SCATTER_HALF + BORDER_PAD + j * (cellH + CELL_GAP);
      allCells.push({
        cx: cellLeft + cellW / 2,
        cy: cellTop + cellH / 2,
      });
    }
  }
  const cells = rng.shuffle(allCells).slice(0, N);

  // The polygons we've already committed to placement (for overlap testing).
  const placedPolys: Polygon[] = [];

  for (let k = 0; k < pieces.length; k++) {
    const piece = pieces[k]!;
    const cell = cells[k]!;
    let best: { rot: number; scale: number; cx: number; cy: number; poly: Polygon } | null = null;
    let bestClear = false;

    for (let attempt = 0; attempt < 30; attempt++) {
      const rot = rng.range(0, 360);
      const flipped: Polygon = piece.scatterFlipped
        ? piece.polygon.map((p) => ({ x: -p.x, y: p.y }))
        : piece.polygon;
      const rotated = rotatePolygon(flipped, rot);
      const lb = polygonBounds(rotated);
      const w = lb.maxX - lb.minX;
      const h = lb.maxY - lb.minY;
      const innerW = cellW - 2;
      const innerH = cellH - 2;
      const scale = fitScale(w, h, innerW, innerH);
      const scaledW = w * scale;
      const scaledH = h * scale;
      const slackX = Math.max(0, innerW - scaledW) / 2;
      const slackY = Math.max(0, innerH - scaledH) / 2;
      const jx = rng.range(-slackX, slackX);
      const jy = rng.range(-slackY, slackY);
      const cx = cell.cx + jx;
      const cy = cell.cy + jy;
      const placedPoly = rotated.map((p) => ({
        x: p.x * scale + cx,
        y: p.y * scale + cy,
      }));
      let overlaps = false;
      for (const prev of placedPolys) {
        if (polygonsOverlap(placedPoly, prev)) { overlaps = true; break; }
      }
      if (!overlaps) {
        best = { rot, scale, cx, cy, poly: placedPoly };
        bestClear = true;
        break;
      }
      if (!best) {
        best = { rot, scale, cx, cy, poly: placedPoly };
      }
    }
    if (!best) {
      // Should not happen — fall back to cell center, scale 1.
      best = {
        rot: 0,
        scale: 1,
        cx: cell.cx,
        cy: cell.cy,
        poly: piece.polygon.map((p) => ({ x: p.x + cell.cx, y: p.y + cell.cy })),
      };
    }
    piece.scatterRotation = best.rot;
    piece.scatterScale = best.scale;
    piece.scatterCenter = { x: best.cx, y: best.cy };
    placedPolys.push(best.poly);
    void bestClear;
  }
}

/** Compute combined bounds of all pieces in their scattered positions. */
export function scatterBounds(pieces: ScatteredPiece[]) {
  const all: Pt[] = [];
  for (const p of pieces) {
    for (const pt of applyScatter(p)) all.push(pt);
  }
  if (all.length === 0) return { minX: -SCATTER_HALF, minY: -SCATTER_HALF, maxX: SCATTER_HALF, maxY: SCATTER_HALF };
  return polygonBounds(all);
}

/** Compute combined bounds of all pieces in their ASSEMBLED positions (scale always 1). */
export function assembledBounds(pieces: ScatteredPiece[]) {
  const all: Pt[] = [];
  for (const p of pieces) {
    const flipped: Polygon = p.assembledFlipped
      ? p.polygon.map((pt) => ({ x: -pt.x, y: pt.y }))
      : p.polygon;
    const rotated = rotatePolygon(flipped, p.assembledRotation);
    for (const pt of rotated) {
      all.push({ x: pt.x + p.assembledCenter.x, y: pt.y + p.assembledCenter.y });
    }
  }
  return polygonBounds(all);
}
