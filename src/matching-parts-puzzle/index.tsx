import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import type { Difficulty, MatchingPuzzle, Option } from './types';
import { ReferenceFigure } from './ReferenceFigure';
import { OptionFigure } from './OptionFigure';
import { ComparisonView } from './ComparisonView';
import { HowToPlay } from './HowToPlay';
import { DifficultyChips } from '../rotation-puzzle/DifficultyChips';
import { generateMatchingPuzzle } from './generate';
import { useLocalStorage } from '../rotation-puzzle/hooks/useLocalStorage';
import { formatDuration, useTimer } from '../rotation-puzzle/hooks/useTimer';
import { SeedBar, useSeedSequence } from '@/shared/seed';

const LETTERS = ['A', 'B', 'C', 'D'] as const;

type Phase = 'answering' | 'revealed';

type Props = {
  difficulty?: Difficulty;
  onHome?: () => void;
};

export function MatchingPartsPuzzle({ difficulty: difficultyProp, onHome }: Props = {}) {
  const [difficulty, setDifficulty] = useLocalStorage<Difficulty>(
    'matching:difficulty',
    difficultyProp ?? 'medium',
  );
  const [score, setScore] = useLocalStorage('matching:score', { correct: 0, total: 0 });
  const [showHelp, setShowHelp] = useState(false);
  const [puzzleNumber, setPuzzleNumber] = useState(1);
  const [puzzle, setPuzzle] = useState<MatchingPuzzle | null>(null);
  const [phase, setPhase] = useState<Phase>('answering');
  const [pick, setPick] = useState<number | null>(null);
  const [focused, setFocused] = useState(0);
  const reduced = useReducedMotion();
  const seedSeq = useSeedSequence('matching:sessionSeed');

  const { elapsed } = useTimer(true);

  const regenerate = useCallback(
    (useSeed: number) => {
      setPuzzle(generateMatchingPuzzle(difficulty, { seed: useSeed }));
      setPhase('answering');
      setPick(null);
      setFocused(0);
    },
    [difficulty],
  );

  useEffect(() => {
    regenerate(seedSeq.restart());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  const newPuzzle = useCallback(() => {
    regenerate(seedSeq.advance());
    setPuzzleNumber((n) => n + 1);
  }, [regenerate, seedSeq]);

  const handlePick = useCallback(
    (idx: number) => {
      if (!puzzle || phase !== 'answering') return;
      const correct = idx === puzzle.correctIndex;
      setPick(idx);
      setPhase('revealed');
      setScore((s) => ({
        correct: s.correct + (correct ? 1 : 0),
        total: s.total + 1,
      }));
    },
    [puzzle, phase, setScore],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!puzzle || showHelp) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        newPuzzle();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocused((f) => {
          const row = Math.floor(f / 2), col = f % 2;
          let nr = row, nc = col;
          if (e.key === 'ArrowLeft') nc = col === 0 ? 1 : 0;
          if (e.key === 'ArrowRight') nc = col === 1 ? 0 : 1;
          if (e.key === 'ArrowUp') nr = row === 0 ? 1 : 0;
          if (e.key === 'ArrowDown') nr = row === 1 ? 0 : 1;
          return Math.max(0, Math.min(3, nr * 2 + nc));
        });
        return;
      }
      if (e.key === 'Enter') {
        if (phase === 'answering') {
          e.preventDefault();
          handlePick(focused);
        } else if (phase === 'revealed') {
          e.preventDefault();
          newPuzzle();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [puzzle, phase, focused, handlePick, newPuzzle, showHelp]);

  const options = puzzle?.options ?? [];
  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div className="min-h-full bg-instrument">
      <HowToPlay open={showHelp} onClose={() => setShowHelp(false)} />

      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-4">
          {onHome ? (
            <button
              onClick={onHome}
              aria-label="Back to home"
              className="group flex items-center gap-3 rounded-md px-1 -mx-1 hover:bg-bg-card-hover transition"
            >
              <LogoMark />
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim leading-tight text-left">
                <div className="group-hover:text-text">Matching Parts</div>
                <div className="text-[10px] text-text-dim/70 group-hover:text-accent">← Aptitude Practice</div>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <LogoMark />
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim leading-tight">
                <div>Matching Parts</div>
                <div className="text-[10px] text-text-dim/70">Aptitude Practice</div>
              </div>
            </div>
          )}
          <div className="hidden md:flex items-center gap-2 ml-4 font-mono text-xs text-text-dim">
            <span className="text-text-dim/70">QUESTION</span>
            <span className="text-text font-medium">#{String(puzzleNumber).padStart(3, '0')}</span>
          </div>
          <div className="ml-auto flex items-center gap-3 md:gap-5 font-mono text-xs">
            <ScoreReadout
              score={score.correct}
              total={score.total}
              accuracy={accuracy}
              onReset={() => {
                if (score.total === 0) return;
                if (typeof window !== 'undefined' && !window.confirm('Reset score to 0/0?')) return;
                setScore({ correct: 0, total: 0 });
              }}
            />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-bg-card">
              <span className="text-text-dim/70">T</span>
              <span className="text-text tabular-nums">{formatDuration(elapsed)}</span>
            </div>
            <button
              onClick={() => setShowHelp(true)}
              aria-label="How to play"
              className="px-2.5 py-1.5 rounded-md border border-border bg-bg-card hover:bg-bg-card-hover text-text-dim hover:text-text"
            >
              ?
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <DifficultyChips value={difficulty} onChange={setDifficulty} />
          <SeedBar
            variant="full"
            className="grow"
            seed={seedSeq.current}
            draft={seedSeq.draft}
            draftValid={seedSeq.draftValid}
            onDraftChange={seedSeq.setDraft}
            onNew={() => regenerate(seedSeq.fresh())}
            onReplay={() => regenerate(seedSeq.restart())}
            onApply={() => {
              const n = seedSeq.applyDraft();
              if (n !== null) regenerate(n);
            }}
          />
        </div>

        <div className="flex flex-col items-center gap-6">
          <section aria-label="Reference shape" className="flex justify-center">
            {puzzle && <ReferenceCard puzzle={puzzle} />}
          </section>

          <AnimatePresence>
            {phase === 'revealed' && puzzle && pick !== null && (
              <ComparisonView
                key={`compare-${puzzleNumber}`}
                puzzle={puzzle}
                pick={pick}
                reduced={!!reduced}
              />
            )}
          </AnimatePresence>

          <section aria-label="Candidate options" className="w-full">
            <div className="overflow-x-auto pb-3 -mx-4 px-4 md:-mx-8 md:px-8 max-w-full">
              <div
                className="flex flex-row flex-nowrap gap-3 md:gap-4"
                style={{ justifyContent: 'safe center' }}
              >
                {options.map((option, i) => (
                  <OptionCard
                    key={`${puzzleNumber}-${i}`}
                    option={option}
                    letter={LETTERS[i]!}
                    index={i}
                    focused={focused === i}
                    selected={pick === i}
                    isCorrect={puzzle?.correctIndex === i}
                    phase={phase}
                    snap={phase === 'revealed' && pick === i}
                    onPick={() => handlePick(i)}
                    onFocus={() => setFocused(i)}
                    reduced={!!reduced}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 mx-auto max-w-4xl">
              <div className="mt-4 flex items-center justify-between gap-3">
                <div
                  role="status"
                  aria-live="polite"
                  className="font-mono text-xs text-text-dim min-h-5"
                >
                  {phase === 'revealed' && puzzle && pick !== null && (
                    pick === puzzle.correctIndex
                      ? `Correct! These two pieces form the reference shape.`
                      : `Incorrect — that option is ${labelForKind(puzzle.options[pick]!.kind)}. The correct answer was ${LETTERS[puzzle.correctIndex]}.`
                  )}
                </div>
                <button
                  onClick={newPuzzle}
                  disabled={phase !== 'revealed'}
                  className={clsx(
                    'px-4 py-2 rounded-lg font-mono uppercase tracking-wider text-xs transition shrink-0',
                    phase === 'revealed'
                      ? 'bg-accent text-bg hover:shadow-[0_0_24px_-4px_var(--accent)]'
                      : 'bg-bg-card text-text-dim/60 cursor-not-allowed border border-border',
                  )}
                >
                  Next →
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ReferenceCard({ puzzle }: { puzzle: MatchingPuzzle }) {
  return (
    <div className="relative rounded-2xl border-2 border-accent/40 bg-bg-card p-4 shadow-[0_0_40px_-12px_var(--accent)]">
      <div className="absolute top-3 left-3 z-10 font-mono text-[10px] tracking-[0.18em] uppercase text-accent">
        Reference
      </div>
      <div className="absolute top-3 right-3 z-10 font-mono text-[10px] tracking-[0.18em] uppercase text-text-dim">
        {puzzle.difficulty}
      </div>
      <div
        className="flex items-center justify-center text-text mt-5"
        style={{ width: 'var(--svg-slot)', height: 'var(--svg-slot)' }}
      >
        <ReferenceFigure
          reference={puzzle.reference}
          className="w-full h-full"
          ariaLabel="Reference shape"
        />
      </div>
    </div>
  );
}

function OptionCard({
  option,
  letter,
  index,
  focused,
  selected,
  isCorrect,
  phase,
  snap,
  onPick,
  onFocus,
  reduced,
}: {
  option: Option;
  letter: string;
  index: number;
  focused: boolean;
  selected: boolean;
  isCorrect: boolean;
  phase: Phase;
  snap: boolean;
  onPick: () => void;
  onFocus: () => void;
  reduced: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const revealed = phase === 'revealed';
  const showCorrectRing = revealed && isCorrect;
  const showWrongRing = revealed && selected && !isCorrect;

  useEffect(() => {
    if (focused && ref.current) ref.current.focus({ preventScroll: true });
  }, [focused]);

  return (
    <motion.button
      ref={ref}
      onClick={onPick}
      onFocus={onFocus}
      disabled={revealed}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { delay: index * 0.06, duration: 0.25 }}
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
      <div className="absolute top-2 left-2 z-10 font-mono text-[10px] tracking-widest text-text-dim group-hover:text-accent">
        {letter}
      </div>
      {revealed && (
        <div className="absolute top-2 right-2 z-10">
          {isCorrect ? <CheckIcon /> : selected ? <XIcon /> : null}
        </div>
      )}
      <div
        className="flex items-center justify-center mt-5"
        style={{ width: 'calc(var(--svg-slot) * 1.4)', height: 'calc(var(--svg-slot) * 0.7)' }}
      >
        <OptionFigure
          option={option}
          snap={snap}
          className="w-full h-full"
          ariaLabel={`Option ${letter}`}
        />
      </div>
      {revealed && (selected || isCorrect) && (
        <div
          className={clsx(
            'absolute font-mono text-[10px] tracking-wide',
            isCorrect ? 'text-correct' : 'text-wrong',
          )}
          style={{ bottom: 6, left: 6 }}
        >
          {labelForKind(option.kind)}
        </div>
      )}
    </motion.button>
  );
}

function labelForKind(kind: string): string {
  switch (kind) {
    case 'correct': return '✓ fits';
    case 'proportion-mismatch': return 'wrong proportions';
    case 'incompatible-cut': return 'cuts don\'t match';
    case 'scale-error': return 'wrong size';
    case 'overlaps-gaps': return 'gap or overlap';
    default: return '';
  }
}

function ScoreReadout({
  score,
  total,
  accuracy,
  onReset,
}: {
  score: number;
  total: number;
  accuracy: number;
  onReset?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-bg-card">
      <span className="text-text-dim/70">SCORE</span>
      <span className="text-text tabular-nums">
        {score}<span className="text-text-dim/60">/{total}</span>
      </span>
      <span className="text-text-dim/40">·</span>
      <span className="text-accent tabular-nums">{accuracy}%</span>
      {onReset && (
        <button
          onClick={onReset}
          disabled={total === 0}
          aria-label="Reset score"
          title="Reset score"
          className="ml-1 -mr-0.5 inline-flex items-center justify-center w-5 h-5 rounded text-text-dim/70 hover:text-wrong hover:bg-wrong/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-dim/70 transition"
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
        </button>
      )}
    </div>
  );
}

function LogoMark() {
  return (
    <svg width={28} height={28} viewBox="-12 -12 24 24" aria-hidden="true">
      <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="-9,-2 -1,-2 -5,7" />
        <polygon points="1,-2 9,-2 5,7" opacity={0.55} />
      </g>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx={12} cy={12} r={10} fill="var(--correct)" opacity={0.18} />
      <path d="M7 12l3.5 3.5L17 9" stroke="var(--correct)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
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

export default MatchingPartsPuzzle;
