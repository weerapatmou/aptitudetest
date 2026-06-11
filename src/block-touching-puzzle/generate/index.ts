import { makeRng, type Rng } from '../../rotation-puzzle/generate/rng';
import { generateDistinctSession } from '@/shared/coverage';
import type { Block, Difficulty, Puzzle, Settings, Vec3 } from '../types';
import { computeAllTouching, drawOrder, growCluster } from './geometry';
import { computeViewBox, topFaceCentroid } from './projection';
import { isReadable } from './fairness';

const ALL_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

type TierConfig = { k: number; baseSize: Vec3; maxZ: number };

/** Difficulty knobs: number of blocks, block shape (cube vs beam), stacking height. */
function tierConfig(difficulty: Difficulty, rng: Rng): TierConfig {
  switch (difficulty) {
    case 'easy':
      return { k: rng.int(3, 6), baseSize: { x: 1, y: 1, z: 1 }, maxZ: 1 };
    case 'normal': {
      const L = rng.bool(0.5) ? rng.int(2, 5) : 1; // cube, or beam of length 2–4
      const maxZ = rng.bool(0.35) ? 3 : 2; // mostly two layers, sometimes three
      return { k: rng.int(4, 8), baseSize: { x: L, y: 1, z: 1 }, maxZ };
    }
    case 'hard': {
      const L = rng.int(2, 6); // beam of length 2–5
      return { k: rng.int(6, 12), baseSize: { x: L, y: 1, z: 1 }, maxZ: 4 };
    }
  }
}

/** Answers must vary, and at least one block must actually touch another. */
function hasAnswerSpread(blocks: Block[]): boolean {
  const vals = blocks.map((b) => b.touchingFaces);
  return new Set(vals).size >= 2 && Math.max(...vals) >= 1;
}

/** Label blocks A, B, C… in screen reading order (top → bottom, left → right). */
function assignLabels(blocks: Block[]): void {
  const order = blocks
    .slice()
    .sort((a, b) => {
      const ca = topFaceCentroid(a);
      const cb = topFaceCentroid(b);
      if (ca.y !== cb.y) return ca.y - cb.y;
      return ca.x - cb.x;
    });
  order.forEach((b, i) => {
    b.label = String.fromCharCode(65 + i);
  });
}

function tryGenerate(difficulty: Difficulty, rng: Rng, id: string): Puzzle | null {
  const { k, baseSize, maxZ } = tierConfig(difficulty, rng);
  const blocks = growCluster(rng, baseSize, k, maxZ);
  if (!blocks || blocks.length !== k) return null;
  computeAllTouching(blocks);
  if (!hasAnswerSpread(blocks)) return null;
  if (!isReadable(blocks)) return null;
  assignLabels(blocks);
  const ordered = drawOrder(blocks);
  return { id, blocks: ordered, difficulty, viewBox: computeViewBox(ordered) };
}

/** Generate one puzzle, retrying then reseeding (deterministically) on failure. */
export function generatePuzzle(difficulty: Difficulty, rng: Rng, id: string): Puzzle {
  for (let i = 0; i < 40; i++) {
    const p = tryGenerate(difficulty, rng, id);
    if (p) return p;
  }
  return generatePuzzle(difficulty, makeRng(rng.int(0, 0x7fffffff)), id);
}

/**
 * The structural essence a solver memorizes: the cluster's block count plus the
 * sorted multiset of block sizes and of touching-face counts. The exact grid
 * placement and labels are excluded (they don't change the perceived shape).
 * Used to keep a session free of repeated clusters and to steer fresh sessions
 * away from recent ones.
 */
export function signatureOf(puzzle: Puzzle): string {
  const count = puzzle.blocks.length;
  const sizes = puzzle.blocks
    .map((b) => `${b.size.x}x${b.size.y}x${b.size.z}`)
    .sort()
    .join(',');
  const faces = puzzle.blocks
    .map((b) => b.touchingFaces)
    .sort((a, b) => a - b)
    .join(',');
  return `${count}:${sizes}:${faces}`;
}

/** Generate a full sheet of puzzles. Deterministic for a given `seed`. */
export function generateSession(settings: Settings, seed?: number): Puzzle[] {
  const rng = makeRng(seed);
  let i = 0;
  return generateDistinctSession(
    settings.count,
    () => {
      const difficulty =
        settings.difficulty === 'mixed' ? rng.pick(ALL_DIFFICULTIES) : settings.difficulty;
      return generatePuzzle(difficulty, rng, `bt-${i++}`);
    },
    signatureOf,
  );
}
