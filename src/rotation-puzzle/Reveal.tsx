import { motion, useReducedMotion } from 'framer-motion';
import type { Figure as FigureT, Transform } from './types';
import { OuterShape } from './OuterShape';
import { ShapePrimitive } from './ShapePrimitive';

type Props = {
  figure: FigureT;
  transform: Transform;
  active: boolean;
  viewBoxHalf?: number;
  size?: number;
  className?: string;
};

/**
 * When `active` flips to true, animates the figure rotating from identity
 * to the target transform (so the user sees the rotation happen).
 */
export function Reveal({ figure, transform, active, viewBoxHalf = 100, size, className }: Props) {
  const reduced = useReducedMotion();
  const targetRotate = -transform.rotate;
  const targetScaleX = transform.flipX ? -1 : 1;

  const initial = active ? { rotate: 0, scaleX: 1 } : { rotate: targetRotate, scaleX: targetScaleX };
  const animate = active
    ? { rotate: targetRotate, scaleX: targetScaleX }
    : { rotate: 0, scaleX: 1 };

  return (
    <svg
      viewBox={`-${viewBoxHalf} -${viewBoxHalf} ${viewBoxHalf * 2} ${viewBoxHalf * 2}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <motion.g
        initial={initial}
        animate={animate}
        transition={reduced ? { duration: 0 } : { duration: 0.8, ease: 'easeInOut' }}
        style={{ originX: '0px', originY: '0px' }}
      >
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
      </motion.g>
    </svg>
  );
}
