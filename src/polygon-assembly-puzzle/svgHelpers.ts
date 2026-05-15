import type { Polygon } from './types';
import type { BoundingBox } from '../rotation-puzzle/types';

export function pathFromPolygon(poly: Polygon): string {
  if (poly.length === 0) return '';
  let d = `M ${poly[0]!.x.toFixed(2)} ${poly[0]!.y.toFixed(2)}`;
  for (let i = 1; i < poly.length; i++) {
    d += ` L ${poly[i]!.x.toFixed(2)} ${poly[i]!.y.toFixed(2)}`;
  }
  return d + ' Z';
}

export function viewBoxFromBounds(b: BoundingBox, pad = 0.1, minSize = 30): string {
  let w = b.maxX - b.minX;
  let h = b.maxY - b.minY;
  // Square it up — we use square SVG slots, so equalize w/h to avoid distortion-induced shrinking.
  const side = Math.max(w, h, minSize);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const padded = side * (1 + pad * 2);
  return `${(cx - padded / 2).toFixed(2)} ${(cy - padded / 2).toFixed(2)} ${padded.toFixed(2)} ${padded.toFixed(2)}`;
}
