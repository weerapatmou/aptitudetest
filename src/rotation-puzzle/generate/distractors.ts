import {
  ALL_INTERNAL_KINDS,
  CHIRAL_KINDS,
  type Candidate,
  type DistractorKind,
  type Figure,
  type FillStyle,
  type InternalElement,
  type InternalElementKind,
} from '../types';
import { dist, outerEdgePoly, pointInPolygon, polygonBounds, bboxDiagonal, distanceToPolygonEdge } from './geometry';
import type { Rng } from './rng';

const SIMILAR_KIND_MAP: Record<string, InternalElementKind[]> = {
  circle: ['hexagon', 'pentagon', 'semicircle'],
  hexagon: ['circle', 'pentagon', 'square'],
  pentagon: ['hexagon', 'circle', 'star5'],
  square: ['diamond', 'trapezoid', 'parallelogram'],
  diamond: ['square', 'parallelogram', 'triangle'],
  triangle: ['rightTriangle', 'teardrop', 'diamond'],
  rightTriangle: ['triangle', 'arrow', 'trapezoid'],
  star5: ['plus', 'pentagon'],
  plus: ['star5', 'square'],
  arrow: ['rightTriangle', 'teardrop'],
  crescent: ['semicircle', 'teardrop'],
  semicircle: ['crescent', 'teardrop', 'circle'],
  teardrop: ['crescent', 'circle', 'arrow'],
  lShape: ['plus', 'trapezoid'],
  trapezoid: ['parallelogram', 'square', 'rightTriangle'],
  parallelogram: ['diamond', 'trapezoid', 'square'],
};

// Distinct visible fill categories. `'none'` is intentionally excluded — it
// renders identically to `filled=false`, so picking it would overlap with the
// `attribute` distractor and effectively disable the visual change.
const FILL_STYLES_DISTINCT: FillStyle[] = ['solid', 'hatched', 'dotted'];

// ---- helpers ----
function cloneFigure(f: Figure): Figure {
  return {
    outer: f.outer,
    internals: f.internals.map((e) => ({ ...e, center: { ...e.center } })),
  };
}

function describeKind(k: InternalElementKind): string {
  if (k === 'rightTriangle') return 'right triangle';
  if (k === 'lShape') return 'L-shape';
  if (k === 'star5') return '5-point star';
  return k;
}

// ---- distractor builders ----

export type DistractorContext = {
  figure: Figure;
  theta: number;
  rng: Rng;
};

export function buildDistractor(kind: DistractorKind, ctx: DistractorContext): Candidate | null {
  switch (kind) {
    case 'mirror':            return mirror(ctx);
    case 'swap':              return swap(ctx);
    case 'attribute':         return attribute(ctx);
    case 'shift':             return shift(ctx);
    case 'inner-rotated':     return innerRotated(ctx);
    case 'kind-changed':      return kindChanged(ctx);
    case 'fillstyle-changed': return fillstyleChanged(ctx);
    case 'missing':           return missing(ctx);
    case 'extra':             return extra(ctx);
    case 'resized':           return resized(ctx);
    case 'correct':           return null;
  }
}

function mirror(ctx: DistractorContext): Candidate {
  const jitter = ctx.rng.pick([-15, 0, 15]);
  const chirals = ctx.figure.internals.filter((e) => CHIRAL_KINDS.includes(e.kind));
  const chiralNames = chirals.length
    ? chirals.map((e) => describeKind(e.kind)).slice(0, 2).join(' and ')
    : 'elements';
  return {
    figure: cloneFigure(ctx.figure),
    transform: { rotate: ctx.theta + jitter, flipX: true },
    kind: 'mirror',
    explanation: `Mirror image — the ${chiralNames} are flipped.`,
  };
}

function swap(ctx: DistractorContext): Candidate | null {
  const fig = cloneFigure(ctx.figure);
  if (fig.internals.length < 2) return null;
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < fig.internals.length; i++) {
    for (let j = i + 1; j < fig.internals.length; j++) {
      if (dist(fig.internals[i]!.center, fig.internals[j]!.center) >= 30) {
        pairs.push([i, j]);
      }
    }
  }
  if (!pairs.length) return null;
  const [i, j] = ctx.rng.pick(pairs);
  const a = fig.internals[i]!.center;
  const b = fig.internals[j]!.center;
  fig.internals[i]!.center = { ...b };
  fig.internals[j]!.center = { ...a };
  return {
    figure: fig,
    transform: { rotate: ctx.theta, flipX: false },
    kind: 'swap',
    explanation: `Two elements have swapped positions.`,
  };
}

function attribute(ctx: DistractorContext): Candidate | null {
  // Skip elements where flipping `filled` would NOT change the rendering.
  // fillFor() returns 'none' when fillStyle is 'none', regardless of `filled`,
  // so such an element looks identical filled or unfilled. Generator no longer
  // emits 'none', but we keep this guard for robustness.
  const viableIndices: number[] = [];
  for (let i = 0; i < ctx.figure.internals.length; i++) {
    const el = ctx.figure.internals[i]!;
    if ((el.fillStyle ?? 'solid') !== 'none') viableIndices.push(i);
  }
  if (viableIndices.length === 0) return null;

  const fig = cloneFigure(ctx.figure);
  const i = ctx.rng.pick(viableIndices);
  const el = fig.internals[i]!;
  const wasFilled = el.filled;
  el.filled = !el.filled;
  return {
    figure: fig,
    transform: { rotate: ctx.theta, flipX: false },
    kind: 'attribute',
    explanation: `One ${describeKind(el.kind)} changed from ${wasFilled ? 'filled' : 'unfilled'} to ${wasFilled ? 'unfilled' : 'filled'}.`,
  };
}

function shift(ctx: DistractorContext): Candidate | null {
  const fig = cloneFigure(ctx.figure);
  if (!fig.internals.length) return null;
  const polyBoundary = outerEdgePoly(fig.outer, 100);
  const diag = bboxDiagonal(polygonBounds(polyBoundary));
  const minShift = diag * 0.20;
  const maxShift = diag * 0.30;

  const indices = ctx.rng.shuffle([...Array(fig.internals.length).keys()]);
  for (const i of indices) {
    const el = fig.internals[i]!;
    for (let attempt = 0; attempt < 60; attempt++) {
      const ang = ctx.rng.range(0, Math.PI * 2);
      const r = ctx.rng.range(minShift, maxShift);
      const candidate = {
        x: el.center.x + r * Math.cos(ang),
        y: el.center.y + r * Math.sin(ang),
      };
      if (!pointInPolygon(candidate, polyBoundary)) continue;
      let collision = false;
      for (let j = 0; j < fig.internals.length; j++) {
        if (j === i) continue;
        if (dist(candidate, fig.internals[j]!.center) < el.size + fig.internals[j]!.size) {
          collision = true; break;
        }
      }
      if (collision) continue;
      el.center = candidate;
      return {
        figure: fig,
        transform: { rotate: ctx.theta, flipX: false },
        kind: 'shift',
        explanation: `One element has been shifted from its true position.`,
      };
    }
  }
  return null;
}

function innerRotated(ctx: DistractorContext): Candidate | null {
  const fig = cloneFigure(ctx.figure);
  const chiralIdx = fig.internals
    .map((e, i) => ({ e, i }))
    .filter((x) => CHIRAL_KINDS.includes(x.e.kind))
    .map((x) => x.i);
  const indices = chiralIdx.length ? chiralIdx : fig.internals.map((_, i) => i);
  if (!indices.length) return null;
  const i = ctx.rng.pick(indices);
  const el = fig.internals[i]!;
  const delta = ctx.rng.range(60, 120) * (ctx.rng.bool() ? 1 : -1);
  el.rotation = (el.rotation + delta + 360) % 360;
  return {
    figure: fig,
    transform: { rotate: ctx.theta, flipX: false },
    kind: 'inner-rotated',
    explanation: `One ${describeKind(el.kind)}'s own orientation has been changed.`,
  };
}

function kindChanged(ctx: DistractorContext): Candidate | null {
  const fig = cloneFigure(ctx.figure);
  if (!fig.internals.length) return null;
  const i = ctx.rng.int(0, fig.internals.length);
  const el = fig.internals[i]!;
  const alternatives = SIMILAR_KIND_MAP[el.kind] ?? ['circle', 'square'];
  const newKind = ctx.rng.pick(alternatives);
  const oldKind = el.kind;
  el.kind = newKind;
  return {
    figure: fig,
    transform: { rotate: ctx.theta, flipX: false },
    kind: 'kind-changed',
    explanation: `One ${describeKind(oldKind)} has been replaced with a ${describeKind(newKind)}.`,
  };
}

function fillstyleChanged(ctx: DistractorContext): Candidate | null {
  // Only an element with filled=true will visibly reflect a fillStyle change —
  // see fillFor() in ShapePrimitive.tsx which returns 'none' whenever filled
  // is false (regardless of fillStyle).
  const filledIndices: number[] = [];
  for (let i = 0; i < ctx.figure.internals.length; i++) {
    if (ctx.figure.internals[i]!.filled) filledIndices.push(i);
  }
  if (filledIndices.length === 0) return null;

  const fig = cloneFigure(ctx.figure);
  const idx = ctx.rng.pick(filledIndices);
  const el = fig.internals[idx]!;
  const current: FillStyle = el.fillStyle ?? 'solid';
  const alternatives = FILL_STYLES_DISTINCT.filter((s) => s !== current);
  el.fillStyle = ctx.rng.pick(alternatives);
  return {
    figure: fig,
    transform: { rotate: ctx.theta, flipX: false },
    kind: 'fillstyle-changed',
    explanation: `One ${describeKind(el.kind)}'s fill pattern has changed (${current} → ${el.fillStyle}).`,
  };
}

function missing(ctx: DistractorContext): Candidate | null {
  if (ctx.figure.internals.length < 2) return null;
  const fig = cloneFigure(ctx.figure);
  const i = ctx.rng.int(0, fig.internals.length);
  const removed = fig.internals[i]!;
  fig.internals.splice(i, 1);
  return {
    figure: fig,
    transform: { rotate: ctx.theta, flipX: false },
    kind: 'missing',
    explanation: `One ${describeKind(removed.kind)} is missing.`,
  };
}

function extra(ctx: DistractorContext): Candidate | null {
  const fig = cloneFigure(ctx.figure);
  const placed = placeOneAdditionalInternal(fig, ctx.rng);
  if (!placed) return null;
  fig.internals.push(placed);
  return {
    figure: fig,
    transform: { rotate: ctx.theta, flipX: false },
    kind: 'extra',
    explanation: `An extra ${describeKind(placed.kind)} has been added.`,
  };
}

function resized(ctx: DistractorContext): Candidate | null {
  const fig = cloneFigure(ctx.figure);
  if (!fig.internals.length) return null;
  const i = ctx.rng.int(0, fig.internals.length);
  const el = fig.internals[i]!;
  const factor = ctx.rng.bool()
    ? ctx.rng.range(0.45, 0.55)
    : ctx.rng.range(1.5, 1.65);
  el.size = el.size * factor;
  return {
    figure: fig,
    transform: { rotate: ctx.theta, flipX: false },
    kind: 'resized',
    explanation: `One ${describeKind(el.kind)} has been ${factor < 1 ? 'shrunk' : 'enlarged'} disproportionately.`,
  };
}

function placeOneAdditionalInternal(fig: Figure, rng: Rng): InternalElement | null {
  const polyBoundary = outerEdgePoly(fig.outer, 120);
  const bb = polygonBounds(polyBoundary);
  // Pick a kind not already in the figure if possible, otherwise any kind.
  const existingKinds = new Set(fig.internals.map((e) => e.kind));
  const preferred = ALL_INTERNAL_KINDS.filter((k) => !existingKinds.has(k));
  const pool = preferred.length ? preferred : ALL_INTERNAL_KINDS;
  const kind = rng.pick(pool);

  for (let attempt = 0; attempt < 60; attempt++) {
    const size = rng.range(15, 22);
    const margin = size * 0.6;
    const x = rng.range(bb.minX + margin, bb.maxX - margin);
    const y = rng.range(bb.minY + margin, bb.maxY - margin);
    const center = { x, y };
    if (!pointInPolygon(center, polyBoundary)) continue;
    if (distanceToPolygonEdge(center, polyBoundary) < margin) continue;
    let collides = false;
    for (const other of fig.internals) {
      if (dist(center, other.center) < 1.2 * (size + other.size)) {
        collides = true; break;
      }
    }
    if (collides) continue;
    return {
      kind,
      center,
      size,
      filled: rng.bool(0.55),
      fillStyle: rng.pick(['solid', 'hatched', 'dotted'] as const),
      rotation: rng.range(0, 360),
    };
  }
  return null;
}

// ---- selector ----

const INTERNAL_MUTATORS: DistractorKind[] = [
  'swap', 'attribute', 'shift', 'inner-rotated', 'kind-changed', 'fillstyle-changed',
  'missing', 'extra', 'resized',
];

const FULL_POOL: DistractorKind[] = [
  'mirror', 'swap', 'attribute', 'shift', 'inner-rotated', 'kind-changed',
  'fillstyle-changed', 'missing', 'extra', 'resized',
];

export function pickDistractorKinds(figure: Figure, rng: Rng): DistractorKind[] {
  const chosen: DistractorKind[] = [];

  // Mirror with ≥ 78% probability (well above the 60% requirement).
  if (rng.bool(0.78)) chosen.push('mirror');

  // At least one internal mutator that's viable given the figure.
  const viableInternalMutators = INTERNAL_MUTATORS.filter((k) => isViable(k, figure));
  if (viableInternalMutators.length) {
    chosen.push(rng.pick(viableInternalMutators));
  }

  while (chosen.length < 3) {
    const remaining = FULL_POOL
      .filter((k) => !chosen.includes(k))
      .filter((k) => isViable(k, figure));
    if (!remaining.length) {
      chosen.push('mirror');
      break;
    }
    chosen.push(rng.pick(remaining));
  }
  return chosen.slice(0, 3);
}

function isViable(kind: DistractorKind, figure: Figure): boolean {
  switch (kind) {
    case 'mirror':
      return true;
    case 'swap': {
      const ints = figure.internals;
      for (let i = 0; i < ints.length; i++)
        for (let j = i + 1; j < ints.length; j++)
          if (dist(ints[i]!.center, ints[j]!.center) >= 30) return true;
      return false;
    }
    case 'shift':
    case 'kind-changed':
    case 'resized':
      return figure.internals.length > 0;
    case 'attribute':
      // Needs at least one element whose filled-flip would render visibly
      // (fillStyle !== 'none'). Generator no longer produces 'none', so this
      // is effectively `length > 0`, but kept defensive.
      return figure.internals.some((e) => (e.fillStyle ?? 'solid') !== 'none');
    case 'fillstyle-changed':
      // Needs at least one element with filled=true; otherwise the mutation
      // is invisible because the renderer ignores fillStyle when filled=false.
      return figure.internals.some((e) => e.filled);
    case 'missing':
      return figure.internals.length >= 2;
    case 'extra':
      return true;
    case 'inner-rotated':
      return figure.internals.some((e) => CHIRAL_KINDS.includes(e.kind));
    case 'correct':
      return false;
  }
}

export function isCandidate(c: Candidate | null): c is Candidate {
  return c !== null;
}

export { INTERNAL_MUTATORS };
