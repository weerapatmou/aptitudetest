import type { Figure, InternalElement, OuterShape, Pt, Polygon } from '../types';
import {
  centroid,
  outerEdgePoly,
  reflectPolygon,
  rotatePoint,
  rotatePolygon,
  samplePolygon,
} from './geometry';

/**
 * Directional Hausdorff: max over a in A of min over b in B of dist(a, b).
 * Symmetric form returns max of the two directional values.
 */
export function hausdorff(a: Pt[], b: Pt[]): number {
  if (a.length === 0 || b.length === 0) return Infinity;
  return Math.max(directedHausdorff(a, b), directedHausdorff(b, a));
}

function directedHausdorff(a: Pt[], b: Pt[]): number {
  let worst = 0;
  for (const pa of a) {
    let best = Infinity;
    for (const pb of b) {
      const dx = pa.x - pb.x, dy = pa.y - pb.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) best = d2;
    }
    if (best > worst) worst = best;
  }
  return Math.sqrt(worst);
}

export type MirrorDistances = {
  x: number;
  y: number;
  diag: number;
  antidiag: number;
};

/** Returns Hausdorff distance from poly to each of its reflections (around centroid). */
export function mirrorSymmetryDistances(poly: Polygon): MirrorDistances {
  const c = centroid(poly);
  const centered = poly.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
  return {
    x: hausdorff(centered, reflectPolygon(centered, 'x')),
    y: hausdorff(centered, reflectPolygon(centered, 'y')),
    diag: hausdorff(centered, reflectPolygon(centered, 'diag')),
    antidiag: hausdorff(centered, reflectPolygon(centered, 'antidiag')),
  };
}

export function minMirrorDistance(shape: OuterShape): number {
  const poly = outerEdgePoly(shape, 180);
  const d = mirrorSymmetryDistances(poly);
  return Math.min(d.x, d.y, d.diag, d.antidiag);
}

/** Returns angles (from candidate set) where rotating poly yields a near-identical shape. */
export function rotationalSymmetryAngles(
  poly: Polygon,
  candidates: number[] = [60, 72, 90, 120, 144, 180],
  threshold = 6,
): number[] {
  const c = centroid(poly);
  const centered = poly.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
  const out: number[] = [];
  for (const ang of candidates) {
    const rotated = rotatePolygon(centered, ang);
    if (hausdorff(centered, rotated) < threshold) out.push(ang);
  }
  return out;
}

export function outerRotationalSymmetries(shape: OuterShape): number[] {
  const poly = outerEdgePoly(shape, 180);
  return rotationalSymmetryAngles(poly);
}

/** Collect a point cloud representing the whole figure (outer boundary + each internal element approximated by its center + a few perimeter points). */
function figurePointCloud(figure: Figure, n = 160): Pt[] {
  const pts: Pt[] = samplePolygon(figure.outer, n);
  for (const el of figure.internals) {
    pts.push(el.center);
    // 8 points around each element (so symmetry tests catch rotation/mirror of element constellation)
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const r = el.size * 0.5;
      const offset = rotatePoint({ x: r * Math.cos(ang), y: r * Math.sin(ang) }, el.rotation);
      pts.push({ x: el.center.x + offset.x, y: el.center.y + offset.y });
    }
  }
  return pts;
}

export function figureMirrorDistance(figure: Figure): number {
  const cloud = figurePointCloud(figure);
  const c = centroid(cloud);
  const centered = cloud.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
  const dx = hausdorff(centered, reflectPolygon(centered, 'x'));
  const dy = hausdorff(centered, reflectPolygon(centered, 'y'));
  const dd = hausdorff(centered, reflectPolygon(centered, 'diag'));
  const dad = hausdorff(centered, reflectPolygon(centered, 'antidiag'));
  return Math.min(dx, dy, dd, dad);
}

/**
 * Render a figure to a point cloud after applying a transform.
 * Used to compare two candidates for distinctness / accidental-equality.
 */
export function renderFigureCloud(
  figure: Figure,
  transform: { rotate: number; flipX: boolean },
  outerN = 120,
): Pt[] {
  const outerCloud = samplePolygon(figure.outer, outerN);
  const internalCloud: Pt[] = [];
  for (const el of figure.internals) {
    const samples = sampleInternal(el);
    for (const s of samples) internalCloud.push(s);
  }
  const all = [...outerCloud, ...internalCloud];
  // Apply flipX (reflect across y-axis) then rotate CCW.
  const flipped = transform.flipX ? all.map((p) => ({ x: -p.x, y: p.y })) : all;
  return rotatePolygon(flipped, transform.rotate);
}

function sampleInternal(el: InternalElement): Pt[] {
  // 16 boundary samples around the element, rotated by el.rotation, translated by el.center.
  const out: Pt[] = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = el.size * 0.5;
    let p: Pt = { x: r * Math.cos(t), y: r * Math.sin(t) };
    // Add chirality cue for kinds that are visually chiral, so the cloud differs under mirror.
    if (el.kind === 'arrow' || el.kind === 'lShape' || el.kind === 'crescent' || el.kind === 'parallelogram' || el.kind === 'rightTriangle') {
      // Bias one quadrant outward to encode asymmetry. Specific shapes don't have to match the renderer exactly — we only need the cloud to be chiral.
      p = { x: p.x * (Math.cos(t) > 0 ? 1.15 : 0.85), y: p.y };
    }
    const rotated = rotatePoint(p, el.rotation);
    out.push({ x: rotated.x + el.center.x, y: rotated.y + el.center.y });
  }
  return out;
}
