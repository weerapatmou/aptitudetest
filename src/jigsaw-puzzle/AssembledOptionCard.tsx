import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { AssembledOption, JigsawPiece, Polygon } from './types';
import { polygonBounds, rotatePolygon } from '../rotation-puzzle/generate/geometry';
import { pathFromPolygon, viewBoxFromBounds } from '../polygon-assembly-puzzle/svgHelpers';

type Phase = 'answering' | 'revealed';

type Props = {
  option: AssembledOption;
  letter: string;
  index: number;
  focused: boolean;
  selected: boolean;
  isCorrect: boolean;
  phase: Phase;
  targetPolygon: Polygon;
  reduced: boolean;
  compact?: boolean;
  onPick: () => void;
  onFocus: () => void;
};

export function AssembledOptionCard({
  option,
  letter,
  index,
  focused,
  selected,
  isCorrect,
  phase,
  targetPolygon,
  reduced,
  compact = false,
  onPick,
  onFocus,
}: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const revealed = phase === 'revealed';
  const showCorrectRing = revealed && isCorrect;
  const showWrongRing = revealed && selected && !isCorrect;
  const showSelectedRing = !revealed && selected;

  useEffect(() => {
    if (focused && ref.current) ref.current.focus({ preventScroll: true });
  }, [focused]);

  const viewBox = useMemo(() => {
    const bounds = polygonBounds(targetPolygon);
    return viewBoxFromBounds(bounds, 0.14);
  }, [targetPolygon]);

  const targetPath = useMemo(() => pathFromPolygon(targetPolygon), [targetPolygon]);

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
        'group relative rounded-xl border bg-bg-card transition-colors text-text card-focus-ring',
        compact ? 'p-2 w-full' : 'p-4 shrink-0',
        !revealed && !showSelectedRing && 'hover:bg-bg-card-hover hover:border-border-strong',
        showCorrectRing && 'border-correct',
        showWrongRing && 'border-wrong',
        showSelectedRing && 'border-accent bg-accent/10',
        !showCorrectRing && !showWrongRing && !showSelectedRing && 'border-border',
      )}
      style={
        showCorrectRing
          ? { boxShadow: '0 0 0 2px var(--correct), 0 0 28px -6px var(--correct)' }
          : showWrongRing
          ? { boxShadow: '0 0 0 2px var(--wrong), 0 0 24px -6px var(--wrong)' }
          : showSelectedRing
          ? { boxShadow: '0 0 0 2px var(--accent), 0 0 24px -6px var(--accent)' }
          : undefined
      }
    >
      <div className={clsx(
        'absolute top-2 left-2 z-10 font-mono tracking-widest',
        showSelectedRing ? 'text-accent' : 'text-text-dim group-hover:text-accent',
        compact ? 'text-[9px]' : 'text-[11px]',
      )}>
        {letter}
      </div>
      <div
        className={clsx(
          'flex items-center justify-center',
          compact ? 'w-full aspect-square mt-4' : '',
        )}
        style={compact ? undefined : {
          width: 'var(--svg-slot)',
          height: 'var(--svg-slot)',
          marginTop: '1.25rem',
        }}
      >
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full overflow-visible"
          aria-label={`Option ${letter} assembled`}
        >
          {/* Target outline (shown on reveal) */}
          {revealed && (
            <path
              d={targetPath}
              fill="none"
              stroke="#fbe26a"
              strokeOpacity={0.9}
              strokeWidth={2.2}
              strokeDasharray="5 4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Assembled pieces */}
          {option.pieces.map((piece, i) => (
            <AssembledPiece
              key={i}
              piece={piece}
              revealed={revealed}
            />
          ))}
        </svg>
      </div>
      {!compact && (
        <div
          className={clsx(
            'mt-2 min-h-[1.25rem] text-center font-mono text-[10px] tracking-wide leading-tight px-1',
            revealed
              ? isCorrect
                ? 'text-correct'
                : 'text-wrong'
              : 'text-text-dim/0',
          )}
        >
          {revealed ? option.explanation : ' '}
        </div>
      )}
    </motion.button>
  );
}

function AssembledPiece({ piece, revealed }: { piece: JigsawPiece; revealed: boolean }) {
  const useDefectColor = revealed && piece.defective;
  const d = pathFromPolygon(piece.polygon as Polygon);
  const flipScale = piece.assembledFlipped ? -1 : 1;

  return (
    <g
      transform={`translate(${piece.assembledCenter.x.toFixed(2)},${piece.assembledCenter.y.toFixed(2)}) scale(${flipScale},1) rotate(${piece.assembledRotation.toFixed(2)})`}
    >
      <path
        d={d}
        fill={useDefectColor ? 'var(--warm, #ffb547)' : 'var(--accent)'}
        fillOpacity={useDefectColor ? 0.30 : 0.22}
        stroke={useDefectColor ? 'var(--warm, #ffb547)' : 'var(--accent)'}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Compute combined bounds of all pieces in their assembled positions. */
export function assembledBoundsFromPieces(pieces: JigsawPiece[]) {
  const allPts: Array<{ x: number; y: number }> = [];
  for (const p of pieces) {
    const flipped = p.assembledFlipped
      ? p.polygon.map((pt) => ({ x: -pt.x, y: pt.y }))
      : p.polygon;
    const rotated = rotatePolygon(flipped, p.assembledRotation);
    for (const pt of rotated) {
      allPts.push({ x: pt.x + p.assembledCenter.x, y: pt.y + p.assembledCenter.y });
    }
  }
  return polygonBounds(allPts);
}
