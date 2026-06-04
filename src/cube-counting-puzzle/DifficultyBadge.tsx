import clsx from 'clsx';
import type { Difficulty } from './types';
import { DIFFICULTY_LABEL } from './types';

const STYLE: Record<Difficulty, string> = {
  easy: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  normal: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  hard: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
};

type Props = {
  difficulty: Difficulty;
  className?: string;
};

export function DifficultyBadge({ difficulty, className }: Props) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]',
        STYLE[difficulty],
        className,
      )}
    >
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}
