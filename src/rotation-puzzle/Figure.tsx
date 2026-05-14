import type { Figure as FigureT, Transform } from './types';
import { OuterShape } from './OuterShape';
import { ShapePrimitive } from './ShapePrimitive';

type Props = {
  figure: FigureT;
  transform?: Transform;
  /** Size of the rendered SVG in CSS pixels. Default is the natural viewBox size. */
  size?: number;
  /** Extra padding around the figure (in viewBox units). Default 20. */
  viewBoxHalf?: number;
  className?: string;
  ariaLabel?: string;
};

let defsInjected = false;

export function FigurePatternsDefs() {
  // Render once globally; idempotent.
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <pattern
          id="hatch-pattern"
          patternUnits="userSpaceOnUse"
          width={4.5}
          height={4.5}
          patternTransform="rotate(45)"
        >
          <line x1={0} y1={0} x2={0} y2={4.5} stroke="currentColor" strokeWidth={2.2} />
        </pattern>
        <pattern
          id="dot-pattern"
          patternUnits="userSpaceOnUse"
          width={4}
          height={4}
        >
          <circle cx={2} cy={2} r={1.7} fill="currentColor" />
        </pattern>
      </defs>
    </svg>
  );
}

export function Figure({
  figure,
  transform = { rotate: 0, flipX: false },
  size,
  viewBoxHalf = 100,
  className,
  ariaLabel,
}: Props) {
  // SVG rotate() is clockwise-positive; our convention is CCW-positive — negate.
  const rotateAttr = -transform.rotate;
  const scaleX = transform.flipX ? -1 : 1;

  const innerTransform = `scale(${scaleX},1) rotate(${rotateAttr})`;

  // Inject defs once per document so patterns work.
  if (typeof document !== 'undefined' && !defsInjected) {
    defsInjected = true;
  }

  return (
    <svg
      viewBox={`-${viewBoxHalf} -${viewBoxHalf} ${viewBoxHalf * 2} ${viewBoxHalf * 2}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform={innerTransform}>
        <OuterShape shape={figure.outer} />
        {figure.internals.map((el, i) => (
          <g
            key={i}
            transform={`translate(${el.center.x.toFixed(2)},${el.center.y.toFixed(2)}) rotate(${(-el.rotation).toFixed(2)})`}
          >
            <ShapePrimitive
              kind={el.kind}
              size={el.size}
              filled={el.filled}
              fillStyle={el.fillStyle}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
