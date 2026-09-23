import type { Circle, Page } from '../types';
import { makeRng, type Rng } from './rng';

// Shared layout constants — one column's SVG coordinate space. DotColumn renders
// with this viewBox, and the generator places circles inside it.
export const LAYOUT = {
  VB_W: 100,
  VB_H: 320,
  /** Visible circle radius (viewBox units). */
  R: 6.5,
  /** Gap kept between a circle edge and its band edge / the column sides. */
  PAD: 1.5,
} as const;

/**
 * Build one side's trail: `n` circles, one per horizontal band, ascending
 * bottom → top (order 0 is the bottom-most). Bands never overlap, so `y`
 * strictly decreases as `order` increases and no two circles can collide
 * (center spacing ≥ 2·(R + PAD)). Horizontal jitter gives the winding look.
 */
function generateSide(n: number, rng: Rng): Circle[] {
  const { VB_W, VB_H, R, PAD } = LAYOUT;
  const band = VB_H / n;
  const yHalfJitter = Math.max(0, band / 2 - R - PAD);
  const xMargin = R + PAD + 2;
  const circles: Circle[] = [];
  for (let order = 0; order < n; order++) {
    // order 0 → bottom band (largest y in SVG's top-down coords).
    const bandCenter = VB_H - (order + 0.5) * band;
    const y = bandCenter + rng.range(-yHalfJitter, yHalfJitter);
    const x = rng.range(xMargin, VB_W - xMargin);
    circles.push({ id: order, x, y, order });
  }
  return circles;
}

/**
 * Generate a full page: independent left/right trails with the same count but
 * different random layouts.
 */
export function generatePage(circlesPerSide: number, rng?: Rng): Page {
  const r = rng ?? makeRng((Date.now() * 2654435761) >>> 0);
  const n = Math.max(1, Math.floor(circlesPerSide));
  // Draw right first, then left, from the same stream → distinct trails.
  const right = generateSide(n, r);
  const left = generateSide(n, r);
  return { right, left };
}
