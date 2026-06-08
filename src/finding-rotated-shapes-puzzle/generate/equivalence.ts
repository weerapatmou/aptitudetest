import { samplePolygon, centroid, rotatePolygon } from '@/rotation-puzzle/generate/geometry';
import { hausdorff } from '@/rotation-puzzle/generate/symmetry';
import type { OuterShape, Pt, Transform } from '../types';

const IDENTITY: Transform = { rotate: 0, flipX: false };

// Points sampled per outline for the rotation-equivalence test. Coarser than the
// rendering sample (perf: the test is an O(N^2) Hausdorff over an angle sweep).
const SAMPLE_N = 72;
// Rotation sweep granularity, in degrees.
const SWEEP_STEP = 4;
// Max boundary deviation (viewBox units) still considered "the same outline".
// Shapes are ~R70; resampling noise at SAMPLE_N is a couple of px, so 5 is safe.
const TOL = 5;

/** Centered display cloud (translation removed) for a shape under a transform. */
function centeredCloud(shape: OuterShape, t: Transform): Pt[] {
  let pts = samplePolygon(shape, SAMPLE_N);
  if (t.flipX) pts = pts.map((p) => ({ x: -p.x, y: p.y }));
  pts = rotatePolygon(pts, t.rotate);
  const c = centroid(pts);
  return pts.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
}

/**
 * True if `cand` (under `tcand`) is reachable from `ref` (under `tref`) by a
 * PURE ROTATION — i.e. some rotation aligns the two outlines within TOL.
 *
 * Translation is removed by centering; scale is deliberately NOT normalized, so
 * stretched/skewed outlines fail. A mirror flip changes handedness, so a flipped
 * chiral outline never aligns (provided the shape is asymmetric — guaranteed by
 * the `minMirrorDistance` gate in generation).
 */
export function isPureRotationOf(
  ref: OuterShape,
  cand: OuterShape,
  tcand: Transform,
  tref: Transform = IDENTITY,
): boolean {
  const A = centeredCloud(ref, tref);
  const B = centeredCloud(cand, tcand);
  let best = Infinity;
  for (let deg = 0; deg < 360; deg += SWEEP_STEP) {
    const d = hausdorff(A, rotatePolygon(B, deg));
    if (d < best) best = d;
    if (best < TOL) return true;
  }
  return best < TOL;
}

/**
 * A coarse, orientation-sensitive fingerprint of the displayed outline, used to
 * guarantee the five options (and the reference) are all visually distinct.
 * Quantizes the centered display cloud onto a grid and returns the sorted set of
 * occupied cells, so point ordering does not matter but orientation does.
 */
export function polyRenderSignature(shape: OuterShape, t: Transform): string {
  const cloud = centeredCloud(shape, t);
  const cells = new Set<string>();
  for (const p of cloud) {
    cells.add(`${Math.round(p.x / 4)},${Math.round(p.y / 4)}`);
  }
  return [...cells].sort().join('|');
}
