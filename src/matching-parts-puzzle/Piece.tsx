import { motion, useReducedMotion } from 'framer-motion';
import type { Piece as PieceT, Polygon } from './types';
import { centroid } from '../rotation-puzzle/generate/geometry';

type Props = {
  piece: PieceT;
  /** When true, the piece animates to its canonical (snapped) pose at the origin. */
  snap?: boolean;
  /** Staggers the snap animation across pieces in the same option. */
  staggerIndex?: number;
};

export function polygonPath(poly: Polygon): string {
  if (poly.length === 0) return '';
  let d = `M ${poly[0]!.x.toFixed(2)} ${poly[0]!.y.toFixed(2)}`;
  for (let i = 1; i < poly.length; i++) {
    d += ` L ${poly[i]!.x.toFixed(2)} ${poly[i]!.y.toFixed(2)}`;
  }
  d += ' Z';
  return d;
}

export function Piece({ piece, snap = false, staggerIndex = 0 }: Props) {
  const reduced = useReducedMotion();
  const c = centroid(piece.polygon);
  // The inner path is drawn in the piece's local (centroid-shifted) frame; the
  // outer motion.g handles the rotate + translate that moves it into the option viewBox.
  // SVG rotate() is clockwise-positive while our convention is CCW-positive, so we negate.
  const target = snap
    ? { x: 0, y: 0, rotate: 0 }
    : { x: piece.displayCenter.x, y: piece.displayCenter.y, rotate: -piece.displayRotation };

  return (
    <motion.g
      initial={target}
      animate={target}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 0.5, ease: 'easeOut', delay: snap ? staggerIndex * 0.05 : 0 }
      }
    >
      <g transform={`translate(${(-c.x).toFixed(2)}, ${(-c.y).toFixed(2)})`}>
        <path d={polygonPath(piece.polygon)} fill="currentColor" stroke="currentColor" strokeWidth={0.5} />
      </g>
    </motion.g>
  );
}
