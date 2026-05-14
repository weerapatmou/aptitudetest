import type { ReferenceShape } from './types';
import { polygonPath } from './Piece';

type Props = {
  reference: ReferenceShape;
  className?: string;
  ariaLabel?: string;
};

const VIEW = 110;

export function ReferenceFigure({ reference, className, ariaLabel }: Props) {
  return (
    <svg
      viewBox={`-${VIEW} -${VIEW} ${VIEW * 2} ${VIEW * 2}`}
      className={className}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={polygonPath(reference.polygon)} fill="currentColor" />
    </svg>
  );
}
