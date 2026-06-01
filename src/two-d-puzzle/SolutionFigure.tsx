import type { Puzzle } from './types';
import { polygonPath } from '../matching-parts-puzzle/Piece';
import { polygonBounds } from '../rotation-puzzle/generate/geometry';

type Props = {
  puzzle: Puzzle;
  className?: string;
};

/**
 * The completed square: the main shape (dimmed) plus the correct pieces drawn
 * at their true positions, with seams visible. This is the exact assembly the
 * pieces form once rotated into the gap.
 */
export function SolutionFigure({ puzzle, className }: Props) {
  const b = polygonBounds(puzzle.completed);
  const pad = 10;
  const x = b.minX - pad;
  const y = b.minY - pad;
  const w = b.maxX - b.minX + 2 * pad;
  const h = b.maxY - b.minY + 2 * pad;
  const correct = puzzle.choices.filter((c) => c.isCorrect);
  return (
    <svg
      viewBox={`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`}
      className={className}
      role="img"
      aria-label="Completed square with the pieces in place"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={polygonPath(puzzle.main)} fill="var(--text-dim)" opacity={0.35} />
      {correct.map((c, i) => (
        <path
          key={i}
          d={polygonPath(c.piece.polygon)}
          fill="var(--correct)"
          fillOpacity={0.22}
          stroke="var(--correct)"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
