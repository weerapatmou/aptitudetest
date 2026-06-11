import type {
  CutStrategy,
  Difficulty,
  MatchDistractorKind,
  MatchingPuzzle,
  Option,
  ReferenceShape,
  ReferenceShapeKind,
} from '../types';
import { REFERENCE_KINDS } from '../types';
import { cutPolygon } from './cuts';
import { buildCorrect, buildDistractor, pickDistractorKinds, type DistractorCtx } from './distractors';
import { generateReferenceShape } from './shapes';
import { defaultRng, makeRng, type Rng } from '../../rotation-puzzle/generate/rng';

export type GenerateOptions = {
  rng?: Rng;
  seed?: number;
};

const KIND_WEIGHTS: Record<Difficulty, Partial<Record<ReferenceShapeKind, number>>> = {
  easy:   { hexagon: 3, square: 3, triangle: 2, circle: 1, oval: 1, kite: 1, pentagon: 1, parallelogram: 2, octagon: 1, trapezoid: 2 },
  medium: { hexagon: 2, square: 2, triangle: 2, circle: 2, oval: 2, kite: 2, pentagon: 2, parallelogram: 2, octagon: 2, trapezoid: 2 },
  hard:   { hexagon: 2, square: 2, triangle: 2, circle: 2, oval: 2, kite: 2, pentagon: 2, parallelogram: 2, octagon: 2, trapezoid: 2 },
  expert: { hexagon: 1, square: 1, triangle: 2, circle: 2, oval: 2, kite: 3, pentagon: 2, parallelogram: 2, octagon: 2, trapezoid: 2 },
};

function pickReferenceKind(difficulty: Difficulty, rng: Rng): ReferenceShapeKind {
  const weights = KIND_WEIGHTS[difficulty];
  const entries: Array<[ReferenceShapeKind, number]> = REFERENCE_KINDS.map((k) => [k, weights[k] ?? 1]);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1]![0];
}

function strategyFor(difficulty: Difficulty, rng: Rng): CutStrategy {
  if (difficulty === 'easy') return 'straight-chord';
  if (difficulty === 'medium') return rng.next() < 0.85 ? 'straight-chord' : 'polyline';
  if (difficulty === 'hard') return rng.next() < 0.4 ? 'straight-chord' : 'polyline';
  return 'polyline';
}

export function generateMatchingPuzzle(
  difficulty: Difficulty,
  opts: GenerateOptions = {},
): MatchingPuzzle {
  const rng: Rng = opts.rng ?? (opts.seed !== undefined ? makeRng(opts.seed) : defaultRng);

  for (let attempt = 0; attempt < 30; attempt++) {
    // Draw the correct-answer slot up front, before any shape/cut generation.
    // Anchoring it to an early, stable point in the stream keeps the slot
    // distribution uniform and independent of how many RNG draws the chosen
    // reference kind happens to consume downstream (which varies by pool size).
    const correctSlot = rng.int(0, 4);
    const kind = pickReferenceKind(difficulty, rng);
    const reference: ReferenceShape = generateReferenceShape(kind, rng);
    const strategy = strategyFor(difficulty, rng);

    const cut = cutPolygon(reference.polygon, strategy, rng);
    if (!cut) continue;

    const ctx: DistractorCtx = {
      reference,
      pieces: cut.pieces,
      cut: cut.cut,
      strategy,
      difficulty,
      rng,
    };

    const correct: Option = buildCorrect(ctx);

    let distractors: Option[] = [];
    let pickAttempts = 0;
    while (pickAttempts < 10) {
      const kinds: MatchDistractorKind[] = pickDistractorKinds(reference, rng);
      const built = kinds
        .map((k) => buildDistractor(k, ctx))
        .filter((o): o is Option => o !== null);
      if (built.length === 3) {
        distractors = built;
        break;
      }
      pickAttempts++;
    }
    if (distractors.length !== 3) continue;

    // Assemble the four options with `correct` in its pre-drawn slot and the
    // three distractors filling the remaining slots in order.
    const all: Option[] = [];
    let d = 0;
    for (let slot = 0; slot < 4; slot++) {
      all.push(slot === correctSlot ? correct : distractors[d++]!);
    }
    return {
      reference,
      options: all,
      correctIndex: correctSlot,
      difficulty,
      cutStrategy: cut.cut.strategy,
      cutSegments: cut.cut.cutPath.length,
    };
  }

  return generateMatchingPuzzle(difficulty, { rng: makeRng((Math.random() * 1e9) | 0) });
}

/**
 * Structural signature of a puzzle, used by the anti-repeat seed picker to avoid
 * showing the user the same shape-family + cut-shape combination back-to-back.
 * `${reference kind}:${cut strategy}:${cut segment count}`.
 */
export function signatureOf(puzzle: MatchingPuzzle): string {
  return `${puzzle.reference.kind}:${puzzle.cutStrategy}:${puzzle.cutSegments}`;
}
