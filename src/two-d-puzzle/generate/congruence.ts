import type { Polygon } from '../types';
import { recenter } from './notch';
import { rotatePolygon } from '../../rotation-puzzle/generate/geometry';
import { hausdorff } from '../../rotation-puzzle/generate/symmetry';

/**
 * True if `b` can be rotated (NO reflection) and translated to coincide with `a`
 * within `tol`. Both are recentred on their centroids, then `b` is swept through
 * a full turn and compared by Hausdorff distance.
 *
 * Because a reflection across any axis can be written as (reflect across y) ∘
 * (rotation), passing a mirrored polygon as `b` lets this same routine detect an
 * achiral piece — one whose mirror image equals some rotation of itself.
 */
export function isRotationCongruent(a: Polygon, b: Polygon, tol = 4): boolean {
  if (a.length !== b.length) return false;
  const ca = recenter(a);
  const cb = recenter(b);
  for (let deg = 0; deg < 360; deg += 2) {
    if (hausdorff(ca, rotatePolygon(cb, deg)) < tol) return true;
  }
  return false;
}
