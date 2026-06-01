import type { Polygon } from './types';
import { polygonPath } from '../matching-parts-puzzle/Piece';
import { polygonBounds } from '../rotation-puzzle/generate/geometry';

type Props = {
  main: Polygon;
  className?: string;
  ariaLabel?: string;
};

/** The notched main shape shown on the left of a question. */
export function PromptFigure({ main, className, ariaLabel }: Props) {
  const b = polygonBounds(main);
  const pad = 10;
  const x = b.minX - pad;
  const y = b.minY - pad;
  const w = b.maxX - b.minX + 2 * pad;
  const h = b.maxY - b.minY + 2 * pad;
  return (
    <svg
      viewBox={`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`}
      className={className}
      role="img"
      aria-label={ariaLabel ?? 'Main shape with a missing piece'}
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={polygonPath(main)} fill="currentColor" stroke="currentColor" strokeWidth={0.5} />
    </svg>
  );
}
