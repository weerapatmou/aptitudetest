import type {
  Cut,
  CutStrategy,
  MatchDistractorKind,
  Option,
  Polygon,
  Pt,
  ReferenceShape,
} from '../types';
import { cutPolygon, signedArea } from './cuts';
import { layoutPieces, scalePolygonAboutCentroid } from './layout';
import { nearTwinShape } from './shapes';
import { dist } from '../../rotation-puzzle/generate/geometry';
import type { Rng } from '../../rotation-puzzle/generate/rng';

const STRICT_AREA_DELTA = 30; // px² — minimum |sum(piece_area) - reference_area|

export const ALL_DISTRACTOR_KINDS: MatchDistractorKind[] = [
  'proportion-mismatch',
  'incompatible-cut',
  'scale-error',
  'overlaps-gaps',
];

export type DistractorCtx = {
  reference: ReferenceShape;
  pieces: [Polygon, Polygon];
  cut: Cut;
  strategy: CutStrategy;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  rng: Rng;
};

/**
 * Pick 3 distinct distractor kinds from the four available. With exactly four
 * viable kinds, every puzzle ships three of them — the picker just chooses which
 * one to omit, uniformly at random.
 */
export function pickDistractorKinds(
  _reference: ReferenceShape,
  rng: Rng,
): MatchDistractorKind[] {
  return rng.shuffle(ALL_DISTRACTOR_KINDS.slice()).slice(0, 3);
}

/** Build a single distractor option. Returns null if the mutation fails for this puzzle. */
export function buildDistractor(kind: MatchDistractorKind, ctx: DistractorCtx): Option | null {
  switch (kind) {
    case 'correct':
      return buildCorrect(ctx);
    case 'proportion-mismatch':
      return buildProportionMismatch(ctx);
    case 'incompatible-cut':
      return buildIncompatibleCut(ctx);
    case 'scale-error':
      return buildScaleError(ctx);
    case 'overlaps-gaps':
      return buildOverlapsGaps(ctx);
  }
}

export function buildCorrect(ctx: DistractorCtx): Option {
  const [pieceA, pieceB] = layoutPieces(ctx.pieces[0], ctx.pieces[1], ctx.rng);
  return {
    pieces: [pieceA, pieceB],
    kind: 'correct',
    explanation: 'These two pieces join cleanly to form the reference shape.',
  };
}

function buildProportionMismatch(ctx: DistractorCtx): Option | null {
  const twin = nearTwinShape(ctx.reference.kind, ctx.rng);
  const cut = cutPolygon(twin.polygon, ctx.strategy, ctx.rng);
  if (!cut) return null;
  const [a, b] = layoutPieces(cut.pieces[0], cut.pieces[1], ctx.rng);
  const option: Option = {
    pieces: [a, b],
    kind: 'proportion-mismatch',
    explanation: 'The pieces fit each other but the combined shape has the wrong proportions.',
  };
  return meetsStrictness(ctx.reference, option) ? option : null;
}

function buildIncompatibleCut(ctx: DistractorCtx): Option | null {
  // Retry up to 8× until we find a second cut that (a) is shaped differently and
  // (b) makes the swapped pair satisfy the strict area-delta invariant.
  const originalChord = chordLength(ctx.cut);
  const originalPieceAArea = Math.abs(signedArea(ctx.pieces[0]));
  for (let attempt = 0; attempt < 8; attempt++) {
    const secondCut = cutPolygon(ctx.reference.polygon, ctx.strategy, ctx.rng);
    if (!secondCut) continue;
    const secondChord = chordLength(secondCut.cut);
    if (Math.abs(originalChord - secondChord) < 4) continue;
    // Piece B from the second cut + piece A from cut #1. Their total area equals
    // refArea + (pieceA1.area - pieceA2.area), so we need |pieceA1 - pieceA2| ≥ STRICT.
    const secondPieceAArea = Math.abs(signedArea(secondCut.pieces[0]));
    if (Math.abs(originalPieceAArea - secondPieceAArea) < STRICT_AREA_DELTA) continue;
    const [a, b] = layoutPieces(ctx.pieces[0], secondCut.pieces[1], ctx.rng);
    const option: Option = {
      pieces: [a, b],
      kind: 'incompatible-cut',
      explanation: 'The two pieces come from different cuts — their joining edges do not match.',
    };
    if (meetsStrictness(ctx.reference, option)) return option;
  }
  return null;
}

function buildScaleError(ctx: DistractorCtx): Option | null {
  const tighter = ctx.difficulty === 'hard' || ctx.difficulty === 'expert';
  const range = tighter ? [0.83, 0.88, 1.14, 1.19] : [0.78, 0.84, 1.18, 1.26];
  const s = pickFromRange(range, ctx.rng);
  const scaledA = scalePolygonAboutCentroid(ctx.pieces[0], s);
  const scaledB = scalePolygonAboutCentroid(ctx.pieces[1], s);
  const [a, b] = layoutPieces(scaledA, scaledB, ctx.rng);
  const option: Option = {
    pieces: [a, b],
    kind: 'scale-error',
    explanation:
      s < 1
        ? 'The pieces interlock but the combined shape is smaller than the reference.'
        : 'The pieces interlock but the combined shape is larger than the reference.',
  };
  return meetsStrictness(ctx.reference, option) ? option : null;
}

function buildOverlapsGaps(ctx: DistractorCtx): Option | null {
  // Strict version: insert a notch vertex into one piece's cut edge. The notch
  // is the midpoint of the closing segment (piece[n-1] → piece[0]) displaced
  // perpendicular by ±4–7 px. This (a) breaks cut-edge congruence with the other
  // piece (cut edges have different lengths and shapes) and (b) adds/subtracts
  // a triangle area of ≈ 0.5 × L × offset (typically 60–200 px²), satisfying the
  // STRICT_AREA_DELTA gate.
  for (let attempt = 0; attempt < 6; attempt++) {
    const target = ctx.rng.bool() ? 0 : 1;
    const source = ctx.pieces[target]!;
    if (source.length < 3) continue;
    const last = source[source.length - 1]!;
    const first = source[0]!;
    const dx = first.x - last.x;
    const dy = first.y - last.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 12) continue; // too short to fit a visible notch
    const nx = -dy / len;
    const ny = dx / len;
    const sign = ctx.rng.bool() ? 1 : -1;
    const off = sign * (4 + ctx.rng.next() * 3); // 4–7 px
    const notch: Pt = {
      x: (last.x + first.x) / 2 + nx * off,
      y: (last.y + first.y) / 2 + ny * off,
    };
    const notched: Polygon = [...source, notch];
    const pieceA: Polygon = target === 0 ? notched : ctx.pieces[0]!;
    const pieceB: Polygon = target === 0 ? ctx.pieces[1]! : notched;
    const [a, b] = layoutPieces(pieceA, pieceB, ctx.rng);
    const option: Option = {
      pieces: [a, b],
      kind: 'overlaps-gaps',
      explanation:
        sign > 0
          ? 'One piece has a bump on its joining edge — overlaps when joined.'
          : 'One piece has a notch on its joining edge — leaves a gap when joined.',
    };
    if (meetsStrictness(ctx.reference, option)) return option;
  }
  return null;
}

/** Total length of a cut path (sum of consecutive segment lengths). */
function chordLength(cut: Cut): number {
  let total = 0;
  for (let i = 0; i < cut.cutPath.length - 1; i++) {
    total += dist(cut.cutPath[i]!, cut.cutPath[i + 1]!);
  }
  return total;
}

/** Rigid-motion-strict invariant: combined piece area must differ from reference area. */
function meetsStrictness(reference: ReferenceShape, option: Option): boolean {
  const refArea = Math.abs(signedArea(reference.polygon));
  const total =
    Math.abs(signedArea(option.pieces[0].polygon)) +
    Math.abs(signedArea(option.pieces[1].polygon));
  return Math.abs(total - refArea) >= STRICT_AREA_DELTA;
}

function pickFromRange<T>(range: readonly T[], rng: Rng): T {
  return range[rng.int(0, range.length)]!;
}
