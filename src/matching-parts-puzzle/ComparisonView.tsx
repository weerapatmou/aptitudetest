import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { MatchingPuzzle, Option } from './types';
import { polygonPath } from './Piece';

const LETTERS = ['A', 'B', 'C', 'D'] as const;
const VIEW = 110;

type Props = {
  puzzle: MatchingPuzzle;
  pick: number;
  reduced: boolean;
};

export function ComparisonView({ puzzle, pick, reduced }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { delay: 0.55, duration: 0.25 }}
      className="w-full max-w-5xl mx-auto rounded-2xl border border-border bg-bg-card p-4 md:p-5"
      role="region"
      aria-label="Review all options against the reference"
    >
      <div className="flex flex-col items-center gap-4">
        <ReferencePanel polygon={puzzle.reference.polygon} />

        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim/70">
          All four options, snapped together
        </div>

        <div className="overflow-x-auto -mx-2 px-2 pb-2 w-full">
          <div
            className="flex flex-row flex-nowrap gap-3 md:gap-4"
            style={{ justifyContent: 'safe center' }}
          >
            {puzzle.options.map((option, i) => (
              <SnappedOptionPanel
                key={i}
                option={option}
                letter={LETTERS[i]!}
                isCorrect={i === puzzle.correctIndex}
                isUserPick={i === pick}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ReferencePanel({ polygon }: { polygon: { x: number; y: number }[] }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
        Reference
      </div>
      <div
        className="rounded-xl border border-accent/40 bg-bg/40 p-2 text-text"
        style={{ width: 'calc(var(--svg-slot) * 0.95)', height: 'calc(var(--svg-slot) * 0.95)' }}
      >
        <svg
          viewBox={`-${VIEW} -${VIEW} ${VIEW * 2} ${VIEW * 2}`}
          className="w-full h-full"
          role="img"
          aria-label="Reference shape"
          preserveAspectRatio="xMidYMid meet"
        >
          <path d={polygonPath(polygon)} fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

function SnappedOptionPanel({
  option,
  letter,
  isCorrect,
  isUserPick,
}: {
  option: Option;
  letter: string;
  isCorrect: boolean;
  isUserPick: boolean;
}) {
  const wrongPick = isUserPick && !isCorrect;
  const tone: 'correct' | 'wrong' | 'neutral' = isCorrect
    ? 'correct'
    : wrongPick
    ? 'wrong'
    : 'neutral';

  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 'calc(var(--svg-slot) * 0.82)' }}>
      <div
        className={clsx(
          'flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]',
          tone === 'correct' && 'text-correct',
          tone === 'wrong' && 'text-wrong',
          tone === 'neutral' && 'text-text-dim',
        )}
      >
        <span>{letter}</span>
        {isCorrect && <CheckGlyph />}
        {wrongPick && <CrossGlyph />}
      </div>

      <div
        className={clsx(
          'rounded-xl border bg-bg/40 p-1.5',
          tone === 'correct' && 'border-correct/60',
          tone === 'wrong' && 'border-wrong/60',
          tone === 'neutral' && 'border-border',
        )}
        style={{
          width: 'calc(var(--svg-slot) * 0.82)',
          height: 'calc(var(--svg-slot) * 0.82)',
          boxShadow:
            tone === 'correct'
              ? '0 0 0 1px var(--correct), 0 0 18px -6px var(--correct)'
              : tone === 'wrong'
              ? '0 0 0 1px var(--wrong), 0 0 18px -6px var(--wrong)'
              : undefined,
        }}
      >
        <svg
          viewBox={`-${VIEW} -${VIEW} ${VIEW * 2} ${VIEW * 2}`}
          className={clsx(
            'w-full h-full',
            tone === 'correct' && 'text-correct',
            tone === 'wrong' && 'text-wrong',
            tone === 'neutral' && 'text-text-dim',
          )}
          role="img"
          aria-label={`Option ${letter} snapped result`}
          preserveAspectRatio="xMidYMid meet"
        >
          <path
            d={polygonPath(option.pieces[0].polygon)}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={0.5}
            fillOpacity={0.9}
          />
          <path
            d={polygonPath(option.pieces[1].polygon)}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={0.5}
            fillOpacity={0.9}
          />
        </svg>
      </div>

      <div
        className={clsx(
          'mt-0.5 text-center font-mono text-[10px]',
          tone === 'correct' && 'text-correct',
          tone === 'wrong' && 'text-wrong',
          tone === 'neutral' && 'text-text-dim/85',
        )}
      >
        {labelFor(option, isCorrect)}
      </div>
      <div className="text-center text-[11px] text-text-dim/80 leading-snug max-w-[180px]">
        {option.explanation}
      </div>
    </div>
  );
}

function labelFor(option: Option, isCorrect: boolean): string {
  if (isCorrect) return '✓ Fits';
  switch (option.kind) {
    case 'proportion-mismatch':
      return 'Wrong proportions';
    case 'incompatible-cut':
      return 'Cuts don\'t match';
    case 'scale-error':
      return 'Wrong size';
    case 'overlaps-gaps':
      return 'Gap or overlap';
    default:
      return '';
  }
}

function CheckGlyph() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossGlyph() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}
