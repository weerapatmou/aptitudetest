import { makeRng, defaultRng, type Rng } from '@/rotation-puzzle/generate/rng';
import { generateDistinctSession } from '@/shared/coverage';
import { pickOuterShape, generateOuter } from '@/rotation-puzzle/generate/outerShapes';
import { minMirrorDistance, outerRotationalSymmetries } from '@/rotation-puzzle/generate/symmetry';
import { sampleAngle } from '@/rotation-puzzle/generate/angles';
import { buildDistractor, pickDistractorKinds, isSimplePolygon, type Ctx } from './distractors';
import { isPureRotationOf, rotationResidualOf, polyRenderSignature } from './equivalence';
import { displayedCloud, sharedViewBox } from './viewBox';
import type { Choice, OuterShape, Pt, Puzzle, Settings, Transform } from '../types';

const IDENTITY: Transform = { rotate: 0, flipX: false };

// A distractor must leave at least this much gap after best-fit rotation. Above
// the equivalence tolerance (5) with headroom, so distractors are unmistakably
// different and the reveal overlay always paints red where they diverge.
const DISTRACTOR_MARGIN = 8;

/** Any outline kind that carries explicit vertices (everything except the ellipse). */
type PolygonShape = Extract<OuterShape, { vertices: Pt[] }>;

function isPolygonShape(s: OuterShape): s is PolygonShape {
  return s.kind !== 'asymmetricEllipse';
}

/** A random asymmetric polygon outline — the ellipse is excluded (no vertices to distort). */
function pickPolygonOuterShape(rng: Rng): PolygonShape {
  for (let i = 0; i < 40; i++) {
    const s = pickOuterShape(rng);
    if (isPolygonShape(s)) return s;
  }
  const fallback = generateOuter('irregularPolygon', rng);
  return fallback as PolygonShape;
}

function buildFourDistractors(reference: PolygonShape, rng: Rng): Choice[] | null {
  const ctx: Ctx = { reference, rng };
  for (let attempt = 0; attempt < 12; attempt++) {
    const kinds = pickDistractorKinds(rng);
    const built = kinds
      .map((k) => buildDistractor(k, ctx))
      .filter((c): c is Choice => c !== null);
    if (built.length === 4) return built;
  }
  return null;
}

export function generatePuzzle(rng: Rng, id: string): Puzzle {
  for (let attempt = 0; attempt < 40; attempt++) {
    const reference = pickPolygonOuterShape(rng);
    if (minMirrorDistance(reference) < 8.5) continue;
    // The reference must be a simple (non-self-intersecting) outline: distractors
    // are validated against this, the reveal overlay assumes it, and a few outer
    // generators (e.g. gear) can occasionally emit a self-crossing instance.
    if (!isSimplePolygon(reference.vertices)) continue;

    const syms = outerRotationalSymmetries(reference);
    const { theta } = sampleAngle('medium', syms, rng);

    const correct: Choice = {
      shape: reference,
      transform: { rotate: theta, flipX: false },
      isCorrect: true,
      kind: 'correct',
      explanation: 'the same outline, just turned.',
    };

    const distractors = buildFourDistractors(reference, rng);
    if (!distractors) continue;

    const all = [correct, ...distractors];

    // Fairness: the correct option must be a pure rotation. Every distractor must
    // diverge by a clear margin (well past a pure rotation), so it both reads as
    // wrong and shows visibly in the reveal comparison overlay.
    if (!isPureRotationOf(reference, correct.shape, correct.transform)) continue;
    if (distractors.some((d) => rotationResidualOf(reference, d.shape, d.transform) < DISTRACTOR_MARGIN))
      continue;

    // Distinctness: all five images differ from each other AND from the reference
    // (so the correct option reads as genuinely re-oriented, not a copy).
    const refSig = polyRenderSignature(reference, IDENTITY);
    const sigs = all.map((c) => polyRenderSignature(c.shape, c.transform));
    if (new Set(sigs).size !== 5) continue;
    if (sigs.some((s) => s === refSig)) continue;

    const shuffled = rng.shuffle(all);
    const correctIndex = shuffled.indexOf(correct);
    const clouds = [
      displayedCloud(reference, IDENTITY),
      ...shuffled.map((c) => displayedCloud(c.shape, c.transform)),
    ];

    return {
      id,
      reference,
      choices: shuffled,
      correctIndex,
      rotation: theta,
      viewBox: sharedViewBox(clouds),
    };
  }

  // Defensive fallback: re-seed and try again (matches the existing modules).
  return generatePuzzle(makeRng((Math.random() * 1e9) | 0), id);
}

/**
 * The structural essence a solver memorizes: the outline KIND plus its vertex
 * count (the continuous per-instance jitter and rotation angle are excluded —
 * they're what the eye is meant to see through). Used to keep a session free of
 * repeated outline types and to steer fresh sessions away from recent ones.
 */
export function signatureOf(puzzle: Puzzle): string {
  const ref = puzzle.reference;
  const vcount = isPolygonShape(ref) ? ref.vertices.length : 0;
  return `${ref.kind}:${vcount}`;
}

export function generateSession(settings: Settings, seed?: number): Puzzle[] {
  const rng = seed !== undefined ? makeRng(seed) : defaultRng;
  let i = 0;
  return generateDistinctSession(settings.count, () => generatePuzzle(rng, `frs-${i++}`), signatureOf);
}
