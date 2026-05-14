import {
  ALL_INTERNAL_KINDS,
  CHIRAL_KINDS,
  type Difficulty,
  type FillStyle,
  type InternalElement,
  type InternalElementKind,
  type OuterShape,
} from '../types';
import {
  dist,
  distanceToPolygonEdge,
  outerEdgePoly,
  pointInPolygon,
  polygonBounds,
} from './geometry';
import type { Rng } from './rng';

// Generator pool intentionally excludes 'none' — when filled=true, fillStyle
// 'none' renders identically to filled=false (see fillFor() in
// ShapePrimitive.tsx), so the `attribute` distractor's filled-flip would be
// invisible for such elements. Keeping the type member for renderer
// compatibility, but never producing it from the generator.
const FILL_STYLES: FillStyle[] = ['solid', 'hatched', 'dotted'];

export function elementCountFor(d: Difficulty, rng: Rng): number {
  switch (d) {
    case 'easy': return 2;
    case 'medium': return 3;
    case 'hard': return rng.bool() ? 3 : 4;
    case 'expert': return 4;
  }
}

type PlaceOpts = {
  difficulty: Difficulty;
  needsChiralInternals: boolean;
};

export function placeInternals(
  outer: OuterShape,
  count: number,
  opts: PlaceOpts,
  rng: Rng,
): InternalElement[] {
  const polyBoundary = outerEdgePoly(outer, 160);
  const bb = polygonBounds(polyBoundary);

  // Choose kinds with chirality preference for hard/expert.
  const kinds = chooseKinds(count, opts, rng);

  // Choose fillStyles ensuring variety (not all same).
  const fills = chooseFills(count, rng);

  const placed: InternalElement[] = [];
  for (let i = 0; i < count; i++) {
    const kind = kinds[i]!;
    let placedOk = false;
    for (let attempt = 0; attempt < 200; attempt++) {
      const size = rng.range(15, 24);
      const margin = size * 0.6;
      // Sample uniformly in bounding box, reject outside polygon or too close to edge.
      const x = rng.range(bb.minX + margin, bb.maxX - margin);
      const y = rng.range(bb.minY + margin, bb.maxY - margin);
      const center = { x, y };
      if (!pointInPolygon(center, polyBoundary)) continue;
      if (distanceToPolygonEdge(center, polyBoundary) < margin) continue;

      // Pairwise distance check.
      let conflict = false;
      for (const other of placed) {
        const minD = 1.2 * (size + other.size);
        if (dist(center, other.center) < minD) { conflict = true; break; }
      }
      if (conflict) continue;

      placed.push({
        kind,
        center,
        size,
        filled: rng.bool(0.55),
        fillStyle: fills[i]!,
        rotation: rng.range(0, 360),
      });
      placedOk = true;
      break;
    }
    if (!placedOk) {
      // Place at outer centroid with reduced size as last resort (rare).
      const cx = (bb.minX + bb.maxX) / 2;
      const cy = (bb.minY + bb.maxY) / 2;
      placed.push({
        kind,
        center: { x: cx + (i - count / 2) * 6, y: cy + (i % 2 ? 6 : -6) },
        size: 12,
        filled: false,
        fillStyle: fills[i]!,
        rotation: rng.range(0, 360),
      });
    }
  }
  return placed;
}

function chooseKinds(
  count: number,
  opts: PlaceOpts,
  rng: Rng,
): InternalElementKind[] {
  const wantChiral = opts.needsChiralInternals ? 2 : (opts.difficulty === 'hard' || opts.difficulty === 'expert' ? 1 : (opts.difficulty === 'medium' ? (rng.bool() ? 1 : 0) : 0));

  const chosen: InternalElementKind[] = [];
  const chiralPool = rng.shuffle([...CHIRAL_KINDS]);
  for (let i = 0; i < Math.min(wantChiral, count); i++) {
    chosen.push(chiralPool[i % chiralPool.length]!);
  }
  // Fill remaining with random distinct kinds biased to variety.
  const restPool = rng.shuffle(ALL_INTERNAL_KINDS.filter((k) => !chosen.includes(k)));
  let idx = 0;
  while (chosen.length < count) {
    if (idx < restPool.length) chosen.push(restPool[idx++]!);
    else chosen.push(rng.pick(ALL_INTERNAL_KINDS));
  }
  return rng.shuffle(chosen);
}

function chooseFills(count: number, rng: Rng): FillStyle[] {
  // Ensure at least 2 distinct styles when count >= 2.
  const out: FillStyle[] = [];
  const shuffled = rng.shuffle([...FILL_STYLES]);
  for (let i = 0; i < count; i++) {
    out.push(shuffled[i % shuffled.length]!);
  }
  return rng.shuffle(out);
}
