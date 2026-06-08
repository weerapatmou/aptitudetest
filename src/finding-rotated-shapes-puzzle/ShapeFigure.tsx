import { OuterShape as OuterShapeView } from '@/rotation-puzzle/OuterShape';
import type { OuterShape, Transform } from './types';

type Props = {
  shape: OuterShape;
  transform?: Transform;
  /** Shared viewBox string so the reference and all choices share one scale. */
  viewBox: string;
  className?: string;
  ariaLabel?: string;
};

const IDENTITY: Transform = { rotate: 0, flipX: false };

/**
 * Renders one stroked outline under a rotate/flip transform.
 * SVG `rotate` is clockwise-positive while our angle convention is CCW-positive,
 * hence the negation (same as rotation-puzzle's Figure).
 */
export function ShapeFigure({ shape, transform = IDENTITY, viewBox, className, ariaLabel }: Props) {
  const scaleX = transform.flipX ? -1 : 1;
  const innerTransform = `scale(${scaleX},1) rotate(${(-transform.rotate).toFixed(2)})`;

  return (
    <svg
      viewBox={viewBox}
      className={className}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform={innerTransform}>
        <OuterShapeView shape={shape} />
      </g>
    </svg>
  );
}
