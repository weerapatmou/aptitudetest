import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { AssemblyOption, Polygon, ScatteredPiece } from './types';
import { polygonBounds, rotatePolygon, pointInPolygon } from '../rotation-puzzle/generate/geometry';
import { pathFromPolygon, viewBoxFromBounds } from './svgHelpers';
import { assembledBounds, scatterBounds } from './generate/scatter';

type Phase = 'answering' | 'revealing' | 'revealed';

type Props = {
  option: AssemblyOption;
  letter: string;
  index: number;
  focused: boolean;
  selected: boolean;
  isCorrect: boolean;
  phase: Phase;
  target: Polygon;
  reduced: boolean;
  onPick: () => void;
  onFocus: () => void;
};

function transformedAssembled(p: ScatteredPiece): Polygon {
  const flipped: Polygon = p.assembledFlipped
    ? p.polygon.map((pt) => ({ x: -pt.x, y: pt.y }))
    : p.polygon;
  const rotated = rotatePolygon(flipped, p.assembledRotation);
  return rotated.map((pt) => ({ x: pt.x + p.assembledCenter.x, y: pt.y + p.assembledCenter.y }));
}

/** Coarse grid sampler that classifies each cell as: outside, gap, single-piece, overlap. */
type ErrorCells = { gaps: Array<[number, number]>; overlaps: Array<[number, number]>; cell: number };

function detectGapsOverlaps(target: Polygon, pieces: ScatteredPiece[]): ErrorCells {
  const tb = polygonBounds(target);
  const W = tb.maxX - tb.minX;
  const H = tb.maxY - tb.minY;
  const STEPS = 36;
  const cell = Math.max(W, H) / STEPS;
  const gaps: Array<[number, number]> = [];
  const overlaps: Array<[number, number]> = [];
  // Pre-transform all pieces to assembled positions
  const transformed = pieces.map(transformedAssembled);
  for (let i = 0; i <= STEPS; i++) {
    for (let j = 0; j <= STEPS; j++) {
      const px = tb.minX + (i + 0.5) * (W / STEPS);
      const py = tb.minY + (j + 0.5) * (H / STEPS);
      const inTarget = pointInPolygon({ x: px, y: py }, target);
      let count = 0;
      for (const poly of transformed) {
        if (pointInPolygon({ x: px, y: py }, poly)) count++;
        if (count > 1) break;
      }
      if (inTarget && count === 0) gaps.push([px, py]);
      else if (count > 1) overlaps.push([px, py]);
    }
  }
  return { gaps, overlaps, cell };
}

export function OptionCard({
  option,
  letter,
  index,
  focused,
  selected,
  isCorrect,
  phase,
  target,
  reduced,
  onPick,
  onFocus,
}: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const revealed = phase === 'revealed' || phase === 'revealing';
  const showCorrectRing = phase === 'revealed' && isCorrect;
  const showWrongRing = phase === 'revealed' && selected && !isCorrect;

  useEffect(() => {
    if (focused && ref.current) ref.current.focus({ preventScroll: true });
  }, [focused]);

  // Compute the viewBox to comfortably contain BOTH scatter and assembled bounds,
  // so the animation doesn't get clipped during the in-between frames.
  const { viewBox, errors } = useMemo(() => {
    const sb = scatterBounds(option.pieces);
    const ab = assembledBounds(option.pieces);
    const tb = polygonBounds(target);
    const combined = {
      minX: Math.min(sb.minX, ab.minX, tb.minX),
      minY: Math.min(sb.minY, ab.minY, tb.minY),
      maxX: Math.max(sb.maxX, ab.maxX, tb.maxX),
      maxY: Math.max(sb.maxY, ab.maxY, tb.maxY),
    };
    return {
      viewBox: viewBoxFromBounds(combined, 0.12),
      errors: detectGapsOverlaps(target, option.pieces),
    };
  }, [option, target]);

  return (
    <motion.button
      ref={ref}
      onClick={onPick}
      onFocus={onFocus}
      disabled={revealed}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { delay: index * 0.05, duration: 0.22 }}
      whileTap={revealed || reduced ? undefined : { scale: 0.98 }}
      aria-label={`Option ${letter}`}
      className={clsx(
        'group relative rounded-2xl border bg-bg-card p-4 transition-colors text-text card-focus-ring shrink-0',
        !revealed && 'hover:bg-bg-card-hover hover:border-border-strong',
        showCorrectRing && 'border-correct',
        showWrongRing && 'border-wrong',
        !showCorrectRing && !showWrongRing && 'border-border',
      )}
      style={
        showCorrectRing
          ? { boxShadow: '0 0 0 2px var(--correct), 0 0 28px -6px var(--correct)' }
          : showWrongRing
          ? { boxShadow: '0 0 0 2px var(--wrong), 0 0 24px -6px var(--wrong)' }
          : undefined
      }
    >
      <div className="absolute top-2 left-2 z-10 font-mono text-[11px] tracking-widest text-text-dim group-hover:text-accent">
        {letter}
      </div>
      <div
        className="flex items-center justify-center mt-5"
        style={{ width: 'var(--svg-slot)', height: 'var(--svg-slot)' }}
      >
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full overflow-visible"
          aria-label={`Option ${letter} pieces`}
        >
          {/* Dashed target outline visible during reveal */}
          {revealed && (
            <path
              d={pathFromPolygon(target)}
              fill="none"
              stroke="#fbe26a"
              strokeOpacity={0.95}
              strokeWidth={2.2}
              strokeDasharray="5 4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Gap markers (drawn behind pieces) */}
          {phase === 'revealed' &&
            errors.gaps.map(([x, y], i) => (
              <rect
                key={`gap-${i}`}
                x={x - errors.cell / 2}
                y={y - errors.cell / 2}
                width={errors.cell}
                height={errors.cell}
                fill="var(--wrong)"
                fillOpacity={0.45}
              />
            ))}

          {/* Pieces */}
          {option.pieces.map((piece, i) => (
            <AnimatedPiece
              key={i}
              piece={piece}
              phase={phase}
              reduced={reduced}
            />
          ))}

          {/* Overlap markers (drawn above pieces with dark fill) */}
          {phase === 'revealed' &&
            errors.overlaps.map(([x, y], i) => (
              <rect
                key={`over-${i}`}
                x={x - errors.cell / 2}
                y={y - errors.cell / 2}
                width={errors.cell}
                height={errors.cell}
                fill="#ff6a2a"
                fillOpacity={0.55}
              />
            ))}
        </svg>
      </div>
      <div
        className={clsx(
          'mt-2 min-h-[1.25rem] text-center font-mono text-[10px] tracking-wide leading-tight px-1',
          phase === 'revealed'
            ? isCorrect
              ? 'text-correct'
              : 'text-wrong'
            : 'text-text-dim/0',
        )}
      >
        {phase === 'revealed' ? option.explanation : ' '}
      </div>
    </motion.button>
  );
}

function AnimatedPiece({
  piece,
  phase,
  reduced,
}: {
  piece: ScatteredPiece;
  phase: Phase;
  reduced: boolean;
}) {
  const isAnswering = phase === 'answering';
  const isMirrorDefect = piece.defective && piece.scatterFlipped;
  const useDefectColor = !isAnswering && piece.defective;
  const d = pathFromPolygon(piece.polygon);
  const target = isAnswering
    ? {
        x: piece.scatterCenter.x,
        y: piece.scatterCenter.y,
        rotate: piece.scatterRotation,
        scaleX: (piece.scatterFlipped ? -1 : 1) * piece.scatterScale,
        scaleY: piece.scatterScale,
      }
    : {
        x: piece.assembledCenter.x,
        y: piece.assembledCenter.y,
        rotate: piece.assembledRotation,
        // For mirror-trap: piece is still scatterFlipped at assembled stage to show the error visually
        scaleX: isMirrorDefect ? -1 : piece.assembledFlipped ? -1 : 1,
        scaleY: 1,
      };
  const shake =
    phase === 'revealed' && isMirrorDefect && !reduced
      ? { x: [target.x - 0.6, target.x + 0.6, target.x - 0.6] }
      : null;
  const animate = shake ? { ...target, ...shake } : target;
  return (
    <motion.g
      initial={false}
      animate={animate}
      transition={
        reduced
          ? { duration: 0 }
          : phase === 'answering'
          ? { duration: 0.3 }
          : phase === 'revealing'
          ? { duration: 1.2, ease: 'easeInOut' }
          : { x: { duration: 0.45, repeat: Infinity, repeatType: 'reverse' as const } }
      }
    >
      <path
        d={d}
        fill={useDefectColor ? 'var(--warm, #ffb547)' : 'var(--accent)'}
        fillOpacity={useDefectColor ? 0.28 : 0.22}
        stroke={useDefectColor ? 'var(--warm, #ffb547)' : 'var(--accent)'}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </motion.g>
  );
}
