import { useEffect, useId, useRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { Choice } from './types';
import { Piece } from '../matching-parts-puzzle/Piece';

type Props = {
  choice: Choice;
  letter: string;
  index: number;
  selected: boolean;
  revealed: boolean;
  focused: boolean;
  /** Shared origin-centered viewBox so every piece renders at one scale. */
  viewBox: string;
  onToggle: () => void;
  onFocus: () => void;
  reduced: boolean;
};

export function ChoiceCard({
  choice,
  letter,
  index,
  selected,
  revealed,
  focused,
  viewBox,
  onToggle,
  onFocus,
  reduced,
}: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const uid = useId();
  const clipId = `2d-choice-clip-${uid}`;
  const [vx, vy, vw, vh] = viewBox.split(' ').map(Number);

  const correctPick = revealed && choice.isCorrect && selected;
  const wrongPick = revealed && !choice.isCorrect && selected;
  const missed = revealed && choice.isCorrect && !selected;
  const pending = !revealed && selected;

  useEffect(() => {
    if (focused && ref.current) ref.current.focus({ preventScroll: true });
  }, [focused]);

  return (
    <motion.button
      ref={ref}
      onClick={onToggle}
      onFocus={onFocus}
      disabled={revealed}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { delay: index * 0.04, duration: 0.2 }}
      whileTap={revealed || reduced ? undefined : { scale: 0.98 }}
      aria-pressed={selected}
      aria-label={`Piece ${letter}`}
      className={clsx(
        'group relative rounded-2xl border bg-bg-card p-3 transition-colors card-focus-ring',
        !revealed && 'hover:bg-bg-card-hover hover:border-border-strong',
        correctPick && 'border-correct text-correct',
        missed && 'border-correct/60 border-dashed text-correct',
        wrongPick && 'border-wrong text-wrong',
        pending && 'border-accent text-accent',
        !revealed && !pending && 'border-border text-text',
        revealed && !correctPick && !wrongPick && !missed && 'border-border text-text-dim',
      )}
      style={
        correctPick
          ? { boxShadow: '0 0 0 2px var(--correct), 0 0 26px -6px var(--correct)' }
          : wrongPick
            ? { boxShadow: '0 0 0 2px var(--wrong), 0 0 24px -6px var(--wrong)' }
            : pending
              ? { boxShadow: '0 0 0 2px var(--accent), 0 0 20px -8px var(--accent)' }
              : undefined
      }
    >
      <div className="absolute top-2 left-2 z-10 font-mono text-[11px] lowercase tracking-widest text-text-dim group-hover:text-accent">
        {letter}
      </div>
      {revealed && (
        <div className="absolute top-2 right-2 z-10">
          {correctPick && <CheckIcon />}
          {wrongPick && <XIcon />}
          {missed && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-correct">
              needed
            </span>
          )}
        </div>
      )}
      <div className="w-full aspect-square flex items-center justify-center">
        <svg
          viewBox={viewBox}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={vx} y={vy} width={vw} height={vh} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <Piece piece={choice.piece} />
          </g>
        </svg>
      </div>
    </motion.button>
  );
}

function CheckIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx={12} cy={12} r={10} fill="var(--correct)" opacity={0.18} />
      <path
        d="M7 12l3.5 3.5L17 9"
        stroke="var(--correct)"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx={12} cy={12} r={10} fill="var(--wrong)" opacity={0.18} />
      <path d="M8 8l8 8M16 8l-8 8" stroke="var(--wrong)" strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  );
}
