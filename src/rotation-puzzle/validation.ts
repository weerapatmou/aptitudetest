import type { Candidate, Figure, InternalElement, OuterShape } from './types';

const COORD_EPS = 0.001;
const ROT_EPS = 0.001;

/**
 * Validates the user's pick against the structural-identity rules:
 * a candidate is "correct" iff its figure is an exact unmirrored clone of
 * the original — equal field-by-field — regardless of `transform.rotate`.
 *
 * Reject conditions covered:
 *   1. Mirror               → transform.flipX === true
 *   2. Swapped elements     → centers no longer match (after sort)
 *   3. Missing / extra      → internals.length differs
 *   4. Altered elements     → kind / local-rotation differs
 *   5. Distorted / resized  → size or outer-shape vertices differ
 *   6. Shifted elements     → center differs
 */
export function isPureRotationOf(original: Figure, candidate: Candidate): boolean {
  if (candidate.transform.flipX) return false;
  if (!sameOuter(original.outer, candidate.figure.outer)) return false;
  if (candidate.figure.internals.length !== original.internals.length) return false;
  const A = sortInternals(original.internals);
  const B = sortInternals(candidate.figure.internals);
  for (let i = 0; i < A.length; i++) {
    if (!sameElement(A[i]!, B[i]!)) return false;
  }
  return true;
}

function sortInternals(arr: InternalElement[]): InternalElement[] {
  return [...arr].sort((x, y) =>
    x.kind.localeCompare(y.kind) ||
    x.center.x - y.center.x ||
    x.center.y - y.center.y ||
    x.size - y.size,
  );
}

function sameElement(a: InternalElement, b: InternalElement): boolean {
  return (
    a.kind === b.kind &&
    Math.abs(a.size - b.size) < COORD_EPS &&
    a.filled === b.filled &&
    (a.fillStyle ?? 'none') === (b.fillStyle ?? 'none') &&
    Math.abs(a.center.x - b.center.x) < COORD_EPS &&
    Math.abs(a.center.y - b.center.y) < COORD_EPS &&
    angleEquals(a.rotation, b.rotation)
  );
}

function angleEquals(a: number, b: number): boolean {
  const diff = ((a - b) % 360 + 360) % 360;
  return diff < ROT_EPS || Math.abs(diff - 360) < ROT_EPS;
}

function sameOuter(a: OuterShape, b: OuterShape): boolean {
  if (a === b) return true;
  if (a.kind !== b.kind) return false;
  if (a.kind === 'asymmetricEllipse' && b.kind === 'asymmetricEllipse') {
    return (
      Math.abs(a.rx - b.rx) < COORD_EPS &&
      Math.abs(a.ry - b.ry) < COORD_EPS &&
      a.flatSide === b.flatSide
    );
  }
  if ('vertices' in a && 'vertices' in b) {
    if (a.vertices.length !== b.vertices.length) return false;
    return a.vertices.every(
      (v, i) =>
        Math.abs(v.x - b.vertices[i]!.x) < COORD_EPS &&
        Math.abs(v.y - b.vertices[i]!.y) < COORD_EPS,
    );
  }
  return false;
}
