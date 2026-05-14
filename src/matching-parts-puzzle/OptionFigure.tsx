import type { Option } from './types';
import { Piece } from './Piece';
import { computeOptionBounds } from './generate/layout';

type Props = {
  option: Option;
  /** When true, both pieces animate from their scrambled poses to (0, 0, 0). */
  snap?: boolean;
  className?: string;
  ariaLabel?: string;
};

export function OptionFigure({ option, snap = false, className, ariaLabel }: Props) {
  const { vbX, vbY, vbW, vbH } = computeOptionBounds(option.pieces);
  return (
    <svg
      viewBox={`${vbX.toFixed(2)} ${vbY.toFixed(2)} ${vbW.toFixed(2)} ${vbH.toFixed(2)}`}
      className={className}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
    >
      <Piece piece={option.pieces[0]} snap={snap} staggerIndex={0} />
      <Piece piece={option.pieces[1]} snap={snap} staggerIndex={1} />
    </svg>
  );
}
