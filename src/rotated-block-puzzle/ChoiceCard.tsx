import { useRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { Choice } from './types';
import { BlockFigure } from './BlockFigure';
import { RotatableBlock } from './RotatableBlock';

// Ignore a "click" that was really a drag/scroll gesture (pointer moved this far).
const TAP_SLOP = 8;

type Props = {
  choice: Choice;
  letter: string;
  index: number;
  selected: boolean;
  revealed: boolean;
  /** Shared iso viewBox for the static (answering) view. */
  viewBox: string;
  /** Shared render3d viewBox for the rotatable (revealed) view. */
  viewBox3d: string;
  onSelect: () => void;
  reduced: boolean;
};

export function ChoiceCard({
  choice,
  letter,
  index,
  selected,
  revealed,
  viewBox,
  viewBox3d,
  onSelect,
  reduced,
}: Props) {
  const correctPick = revealed && choice.isCorrect && selected;
  const wrongPick = revealed && !choice.isCorrect && selected;
  const missed = revealed && choice.isCorrect && !selected;
  const pending = !revealed && selected;

  const className = clsx(
    'group relative rounded-2xl border bg-bg-card p-3 transition-colors card-focus-ring',
    !revealed && 'hover:bg-bg-card-hover hover:border-border-strong',
    correctPick && 'border-correct text-correct',
    missed && 'border-correct/60 border-dashed text-correct',
    wrongPick && 'border-wrong text-wrong',
    pending && 'border-accent text-accent',
    !revealed && !pending && 'border-border text-text',
    revealed && !correctPick && !wrongPick && !missed && 'border-border text-text-dim',
  );

  const style = correctPick
    ? { boxShadow: '0 0 0 2px var(--correct), 0 0 26px -6px var(--correct)' }
    : wrongPick
      ? { boxShadow: '0 0 0 2px var(--wrong), 0 0 24px -6px var(--wrong)' }
      : pending
        ? { boxShadow: '0 0 0 2px var(--accent), 0 0 20px -8px var(--accent)' }
        : undefined;

  const Badge = (
    <div className="absolute top-2 left-2 z-10 font-mono text-[11px] uppercase tracking-widest text-text-dim group-hover:text-accent">
      {letter}
    </div>
  );

  const ResultIcon = revealed && (
    <div className="absolute top-2 right-2 z-10">
      {correctPick && <CheckIcon />}
      {wrongPick && <XIcon />}
      {missed && (
        <span className="font-mono text-[9px] uppercase tracking-wider text-correct">answer</span>
      )}
    </div>
  );

  // After submit the card is no longer a button — it's a draggable 3D viewer.
  // (A disabled <button> would swallow the pointer events drag needs.)
  if (revealed) {
    return (
      <div className={className} style={style} aria-label={`Choice ${letter}`}>
        {Badge}
        {ResultIcon}
        <RotatableBlock
          solid={choice.solid}
          viewBox={viewBox3d}
          className="w-full aspect-square flex items-center justify-center"
          ariaLabel={`Choice ${letter}`}
        />
      </div>
    );
  }

  return (
    <AnsweringButton
      selected={selected}
      letter={letter}
      index={index}
      reduced={reduced}
      className={className}
      style={style}
      onSelect={onSelect}
    >
      {Badge}
      {selected && (
        <div className="absolute top-2 right-2 z-10">
          <span className="font-mono text-[9px] uppercase tracking-wider text-accent">selected</span>
        </div>
      )}
      <div className="w-full aspect-square flex items-center justify-center">
        <BlockFigure solid={choice.solid} viewBox={viewBox} className="w-full h-full" />
      </div>
    </AnsweringButton>
  );
}

/**
 * The selectable card during answering. Commits only on a deliberate tap: a
 * pointer that moves more than a few px (a scroll/drag) does not select, so the
 * answer can't change by accident while scrolling the sheet. Keyboard
 * activation (no pointer) still works.
 */
function AnsweringButton({
  selected,
  letter,
  index,
  reduced,
  className,
  style,
  onSelect,
  children,
}: {
  selected: boolean;
  letter: string;
  index: number;
  reduced: boolean;
  className: string;
  style: React.CSSProperties | undefined;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);

  return (
    <motion.button
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY };
        dragged.current = false;
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > TAP_SLOP) {
          dragged.current = true;
        }
      }}
      onClick={() => {
        // Pointer-driven click that was actually a drag → ignore. Keyboard
        // activation leaves `dragged` false, so it still selects.
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        onSelect();
      }}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { delay: index * 0.04, duration: 0.2 }}
      whileTap={reduced ? undefined : { scale: 0.98 }}
      aria-pressed={selected}
      aria-label={`Choice ${letter}`}
      className={className}
      style={style}
    >
      {children}
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
