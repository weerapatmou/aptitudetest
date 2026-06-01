import type { Polygon } from './types';
import { polygonPath } from '../matching-parts-puzzle/Piece';

type Props = {
  main: Polygon;
  /** Shared origin-centered viewBox so the main shape and pieces share one scale. */
  viewBox: string;
  className?: string;
  ariaLabel?: string;
};

/** The notched main shape shown as the question. */
export function PromptFigure({ main, viewBox, className, ariaLabel }: Props) {
  return (
    <svg
      viewBox={viewBox}
      className={className}
      role="img"
      aria-label={ariaLabel ?? 'Main shape with a missing piece'}
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={polygonPath(main)} fill="currentColor" stroke="currentColor" strokeWidth={0.5} />
    </svg>
  );
}
