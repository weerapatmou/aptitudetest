import { makeRng } from '../../rotation-puzzle/generate/rng';
import type { Rng } from '../../rotation-puzzle/generate/rng';
import type {
  HiddenFiguresSession,
  HiddenQuestion,
  ShapeDef,
  SimpleShape,
} from '../types';
import { SHAPE_POOL } from './shapes';
import { buildComplexFigure } from './buildComplexFigure';

const LABELS = ['A', 'B', 'C', 'D', 'E'] as const;
const MAX_PER_CAT = 1;

function vertexCategory(n: number): number {
  return n; // exact vertex count — shapes share a category only if identical vertex count
}

function pickDiverseShapes(pool: ShapeDef[], rng: Rng): ShapeDef[] {
  const shuffled = rng.shuffle([...pool]);
  const result: ShapeDef[] = [];
  const catCounts: Record<number, number> = {};

  for (const shape of shuffled) {
    if (result.length >= 5) break;
    const cat = vertexCategory(shape.points.length);
    if ((catCounts[cat] ?? 0) < MAX_PER_CAT) {
      result.push(shape);
      catCounts[cat] = (catCounts[cat] ?? 0) + 1;
    }
  }
  // Fallback: fill remaining slots if pool lacked category variety
  for (const shape of shuffled) {
    if (result.length >= 5) break;
    if (!result.includes(shape)) result.push(shape);
  }
  return result;
}

export function generateSession(
  seed: number,
  questionCount: number,
): HiddenFiguresSession {
  const rng = makeRng(seed);

  // Pick 5 shapes with at most MAX_PER_CAT from the same vertex-count group
  const simpleShapes: SimpleShape[] = pickDiverseShapes(SHAPE_POOL, rng).map((def, i) => ({
    label: LABELS[i]!,
    def,
  }));

  // Generate each question
  const questions: HiddenQuestion[] = [];
  for (let i = 0; i < questionCount; i++) {
    const correctIndex = rng.int(0, 5);
    const hiddenShape = simpleShapes[correctIndex]!;
    const complexFigure = buildComplexFigure(hiddenShape.def, rng);
    questions.push({
      number: i + 1,
      complexFigure,
      correctLabel: LABELS[correctIndex]!,
      correctIndex,
    });
  }

  return { simpleShapes, questions, seed };
}

export function signatureOf(session: HiddenFiguresSession): string {
  const shapeKinds = session.simpleShapes.map((s) => s.def.kind).join(',');
  const answers = session.questions.map((q) => q.correctIndex).join('');
  return `${shapeKinds}:${answers}`;
}
