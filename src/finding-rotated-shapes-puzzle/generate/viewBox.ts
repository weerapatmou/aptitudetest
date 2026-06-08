import { samplePolygon, rotatePolygon, polygonBounds } from '@/rotation-puzzle/generate/geometry';
import type { OuterShape, Pt, Transform } from '../types';

/**
 * The point cloud as it is actually displayed on screen.
 *
 * ShapeFigure renders the outline inside `<g transform="scale(sx,1) rotate(-θ)">`,
 * and SVG applies a transform list outermost-first, so the point pipeline is
 * "rotate first, then flip" — we mirror that exact order here so the shared
 * viewBox fits the rendered geometry without clipping.
 *
 * rotation-puzzle's `rotatePolygon` is CCW-positive while SVG `rotate` is
 * CW-positive, hence the negation (matching ShapeFigure's `rotate(-θ)`).
 */
export function displayedCloud(shape: OuterShape, t: Transform, n = 96): Pt[] {
  let pts = samplePolygon(shape, n);
  pts = rotatePolygon(pts, -t.rotate);
  if (t.flipX) pts = pts.map((p) => ({ x: -p.x, y: p.y }));
  return pts;
}

/** Square viewBox that contains every cloud at one uniform scale, with padding. */
export function sharedViewBox(clouds: Pt[][]): string {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const cloud of clouds) {
    const b = polygonBounds(cloud);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const half = Math.max(maxX - minX, maxY - minY) / 2;
  const pad = half * 0.14 + 4;
  const r = half + pad;
  const size = r * 2;
  return `${(cx - r).toFixed(2)} ${(cy - r).toFixed(2)} ${size.toFixed(2)} ${size.toFixed(2)}`;
}
