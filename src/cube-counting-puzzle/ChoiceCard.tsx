import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { Choice } from './types';

type Props = {
  choice: Choice;
  letter: string;
  index: number;
  selected: boolean;
  revealed: boolean;
  onToggle: () => void;
  reduced: boolean;
};

export function ChoiceCard({
  choice,
  letter,
  index,
  selected,
  revealed,
  onToggle,
  reduced,
}: Props) {
  const correctPick = revealed && choice.isCorrect && selected;
  const wrongPick = revealed && !choice.isCorrect && selected;
  const missed = revealed && choice.isCorrect && !selected;
  const pending = !revealed && selected;

  return (
    <motion.button
      onClick={onToggle}
      disabled={revealed}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { delay: index * 0.04, duration: 0.2 }}
      whileTap={revealed || reduced ? undefined : { scale: 0.98 }}
      aria-pressed={selected}
      aria-label={`Answer ${letter}: ${choice.value}`}
      className={clsx(
        'group relative flex items-center gap-3 rounded-xl border bg-bg-card px-4 py-3 transition-colors card-focus-ring',
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
          ? { boxShadow: '0 0 0 2px var(--correct), 0 0 22px -8px var(--correct)' }
          : wrongPick
            ? { boxShadow: '0 0 0 2px var(--wrong), 0 0 20px -8px var(--wrong)' }
            : pending
              ? { boxShadow: '0 0 0 2px var(--accent), 0 0 18px -10px var(--accent)' }
              : undefined
      }
    >
      <span className="font-mono text-[11px] lowercase tracking-widest text-text-dim group-hover:text-accent">
        {letter}
      </span>
      <span className="font-display text-2xl tabular-nums">{choice.value}</span>
      {revealed && (
        <span className="ml-auto">
          {correctPick && <CheckIcon />}
          {wrongPick && <XIcon />}
          {missed && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-correct">
              answer
            </span>
          )}
        </span>
      )}
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
