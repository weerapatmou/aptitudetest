import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import type { Candidate, Difficulty, Puzzle } from './types';
import { Figure, FigurePatternsDefs } from './Figure';
import { Reveal } from './Reveal';
import { DifficultyChips } from './DifficultyChips';
import { HowToPlay } from './HowToPlay';
import { generatePuzzle, signatureOf } from './generate';
import { isPureRotationOf } from './validation';
import { useLocalStorage } from './hooks/useLocalStorage';
import { formatDuration, useTimer } from './hooks/useTimer';
import { SeedBar, useSeedSequence } from '@/shared/seed';
import { pickFreshSeed, useSignatureHistory } from '@/shared/coverage';
import { LogoMark } from '@/shared/LogoMark';

const LETTERS = ['A', 'B', 'C', 'D'] as const;

type Phase = 'answering' | 'revealed';

type Props = {
  difficulty?: Difficulty;
  onHome?: () => void;
};

export function RotationPuzzle({ difficulty: difficultyProp, onHome }: Props = {}) {
  const [difficulty, setDifficulty] = useLocalStorage<Difficulty>(
    'rotation:difficulty',
    difficultyProp ?? 'medium',
  );
  const [score, setScore] = useLocalStorage('rotation:score', { correct: 0, total: 0 });
  const [showReveal, setShowReveal] = useLocalStorage('rotation:showReveal', true);
  const [showHelp, setShowHelp] = useState(false);
  const [puzzleNumber, setPuzzleNumber] = useState(1);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [phase, setPhase] = useState<Phase>('answering');
  const [pick, setPick] = useState<number | null>(null);
  const [focused, setFocused] = useState(0);
  const reduced = useReducedMotion();

  const { elapsed } = useTimer(true);

  const history = useSignatureHistory('rotation:sigHistory', { max: 150 });

  // Anti-repeat: only "New" reads history (via pickSeed) to bias away from
  // recently-seen structures. Generation from a committed seed stays
  // deterministic, so replay/typed seeds always rebuild the same puzzle.
  const pickSeed = useCallback(
    () =>
      pickFreshSeed({
        recent: history.recent,
        previewSignatures: (s) =>
          Array.from({ length: 5 }, (_, i) =>
            signatureOf(generatePuzzle(difficulty, { seed: s + i })),
          ),
      }).seed,
    [history.recent, difficulty],
  );

  const seedSeq = useSeedSequence('rotation:sessionSeed', undefined, { pickSeed });

  const regenerate = useCallback(
    (useSeed: number) => {
      const next = generatePuzzle(difficulty, { seed: useSeed });
      setPuzzle(next);
      // New/Next/Replay all record what was shown; only New READS history.
      history.add([signatureOf(next)]);
      setPhase('answering');
      setPick(null);
      setFocused(0);
    },
    [difficulty, history],
  );

  // Generate first puzzle once on mount and whenever difficulty changes
  // (re-bases the sequence). Deps intentionally only [difficulty] — adding
  // seedSeq/regenerate would loop.
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
      const pickIsCorrect = isPureRotationOf(puzzle.original, puzzle.candidates[idx]!);
      setPick(idx);
      setPhase('revealed');
      setScore((s) => ({
        correct: s.correct + (pickIsCorrect ? 1 : 0),
        total: s.total + 1,
      }));
    },
    [puzzle, phase, setScore],
  );

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!puzzle) return;
      if (showHelp) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        newPuzzle();
        return;
      }
      // Grid is 2x2 on mobile, 1x4 on desktop. We use a 2x2 logical mapping for arrow keys.
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

  const candidates = puzzle?.candidates ?? [];
  const correctness = puzzle
    ? puzzle.candidates.map((c) => isPureRotationOf(puzzle.original, c))
    : [];
  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div className="min-h-full bg-instrument">
      <FigurePatternsDefs />
      <HowToPlay open={showHelp} onClose={() => setShowHelp(false)} />

      {/* Header */}
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
                <div className="group-hover:text-text">Rotation Test</div>
                <div className="text-[10px] text-text-dim/70 group-hover:text-accent">← Aptitude Practice</div>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <LogoMark />
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim leading-tight">
                <div>Rotation Test</div>
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
        {/* Controls row */}
        <div className="mb-6 flex flex-wrap items-center gap-3 justify-between">
          <DifficultyChips value={difficulty} onChange={setDifficulty} />
          <SeedBar
            variant="full"
            seed={seedSeq.current}
            draft={seedSeq.draft}
            draftValid={seedSeq.draftValid}
            onDraftChange={seedSeq.setDraft}
            onNew={() => {
              regenerate(seedSeq.fresh());
              setPuzzleNumber((n) => n + 1);
            }}
            onReplay={() => {
              regenerate(seedSeq.restart());
            }}
            onApply={() => {
              const n = seedSeq.applyDraft();
              if (n !== null) regenerate(n);
            }}
          />
          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-text-dim font-mono uppercase tracking-wider">
            <input
              type="checkbox"
              checked={showReveal}
              onChange={(e) => setShowReveal(e.target.checked)}
              className="accent-accent"
            />
            Show rotation
          </label>
        </div>

        {/* Puzzle stack: Original on top (centered), candidates below at the
            same SVG-slot size so figures render 1:1. Candidates flex-wrap
            to 2×2 on narrow viewports and 1×4 when there's room. */}
        <div className="flex flex-col items-center gap-6">
          <section aria-label="Original figure" className="flex justify-center">
            {puzzle && (
              <OriginalCard
                puzzle={puzzle}
                phase={phase}
                showReveal={showReveal}
              />
            )}
          </section>

          <section aria-label="Candidate options" className="w-full">
            <div className="overflow-x-auto pb-3 -mx-4 px-4 md:-mx-8 md:px-8 max-w-full">
              <div
                className="flex flex-row flex-nowrap gap-3 md:gap-4"
                style={{ justifyContent: 'safe center' }}
              >
              {candidates.map((c, i) => (
                <CandidateCard
                  key={`${puzzleNumber}-${i}`}
                  candidate={c}
                  letter={LETTERS[i]!}
                  index={i}
                  focused={focused === i}
                  selected={pick === i}
                  isCorrect={correctness[i] === true}
                  phase={phase}
                  onPick={() => handlePick(i)}
                  onFocus={() => setFocused(i)}
                  reduced={!!reduced}
                />
              ))}
              </div>
            </div>

            {/* Explanation + next */}
            <div className="mt-6 mx-auto max-w-4xl">
              <AnimatePresence mode="wait">
                {phase === 'revealed' && puzzle && pick !== null && (
                  <motion.div
                    key={puzzleNumber}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={reduced ? { duration: 0 } : { duration: 0.25 }}
                    className="rounded-xl border border-border bg-bg-card p-4 md:p-5"
                  >
                    <RevealSummary
                      puzzle={puzzle}
                      pick={pick}
                      correctness={correctness}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div
                  role="status"
                  aria-live="polite"
                  className="font-mono text-xs text-text-dim min-h-5"
                >
                  {phase === 'revealed' && puzzle && pick !== null && (
                    correctness[pick]
                      ? `Correct! Any rotation of the original counts.`
                      : `Incorrect — that option is ${labelForKind(puzzle.candidates[pick]!.kind, false)}. The correct answer was ${LETTERS[correctness.indexOf(true)] ?? LETTERS[puzzle.correctIndex]}.`
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

// ---- Sub-components ----

function OriginalCard({
  puzzle,
  phase,
  showReveal,
}: {
  puzzle: Puzzle;
  phase: Phase;
  showReveal: boolean;
}) {
  const correctTransform = puzzle.candidates[puzzle.correctIndex]!.transform;
  const revealActive = phase === 'revealed' && showReveal;
  return (
    <div className="relative rounded-2xl border-2 border-accent/40 bg-bg-card p-4 shadow-[0_0_40px_-12px_var(--accent)]">
      <div className="absolute top-3 left-3 z-10 font-mono text-[10px] tracking-[0.18em] uppercase text-accent">
        Original
      </div>
      <div className="absolute top-3 right-3 z-10 font-mono text-[10px] tracking-[0.18em] uppercase text-text-dim">
        {puzzle.difficulty}
      </div>
      <div
        className="flex items-center justify-center text-text mt-5"
        style={{ width: 'var(--svg-slot)', height: 'var(--svg-slot)' }}
      >
        {revealActive ? (
          <Reveal
            figure={puzzle.original}
            transform={correctTransform}
            active={revealActive}
            className="w-full h-full"
          />
        ) : (
          <Figure figure={puzzle.original} className="w-full h-full" ariaLabel="Original figure" />
        )}
      </div>
      {phase === 'revealed' && (
        <div className="mt-3 text-center font-mono text-xs text-accent">
          Rotation: {Math.round(puzzle.rotation)}°
        </div>
      )}
    </div>
  );
}

function CandidateCard({
  candidate,
  letter,
  index,
  focused,
  selected,
  isCorrect,
  phase,
  onPick,
  onFocus,
  reduced,
}: {
  candidate: Candidate;
  letter: string;
  index: number;
  focused: boolean;
  selected: boolean;
  isCorrect: boolean;
  phase: Phase;
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
      aria-label={`Option ${letter}: figure`}
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
        style={{ width: 'var(--svg-slot)', height: 'var(--svg-slot)' }}
      >
        <Figure
          figure={candidate.figure}
          transform={candidate.transform}
          className="w-full h-full"
          ariaLabel={`Option ${letter}`}
        />
      </div>
      {revealed && (selected || isCorrect) && (
        <div
          className={clsx(
            'absolute -bottom-2 left-2 right-2 mx-auto translate-y-full rounded-md px-2 py-1 font-mono text-[10px] tracking-wide',
            isCorrect ? 'text-correct' : 'text-wrong',
          )}
          style={{ position: 'absolute', bottom: 6, left: 6, transform: 'none' }}
        >
          {labelForKind(candidate.kind, isCorrect)}
        </div>
      )}
    </motion.button>
  );
}

function labelForKind(kind: string, isCorrect: boolean): string {
  if (isCorrect) return '✓ rotation';
  switch (kind) {
    case 'mirror': return 'mirror';
    case 'swap': return 'swapped';
    case 'attribute': return 'fill flipped';
    case 'shift': return 'shifted';
    case 'inner-rotated': return 'inner rotated';
    case 'kind-changed': return 'altered shape';
    case 'fillstyle-changed': return 'fill pattern';
    case 'missing': return 'missing element';
    case 'extra': return 'extra element';
    case 'resized': return 'resized';
    default: return '';
  }
}

function RevealSummary({
  puzzle,
  pick,
  correctness,
}: {
  puzzle: Puzzle;
  pick: number;
  correctness: boolean[];
}) {
  const correct = correctness[pick] === true;
  const correctIdx = correctness.indexOf(true);
  const correctLetter = LETTERS[correctIdx >= 0 ? correctIdx : puzzle.correctIndex];
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className={clsx('text-sm font-medium', correct ? 'text-correct' : 'text-wrong')}>
          {correct ? 'Correct' : 'Incorrect'}
        </div>
        <div className="font-mono text-xs text-text-dim">
          Correct answer: {correctLetter}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {puzzle.candidates.map((c, i) => {
          const isC = correctness[i] === true;
          return (
            <div
              key={i}
              className={clsx(
                'rounded-md p-2 border font-mono',
                isC ? 'border-correct/30 bg-correct/5 text-correct' : 'border-border bg-bg/30 text-text-dim',
              )}
            >
              <span className="font-semibold mr-1">{LETTERS[i]}</span>
              <span className="opacity-90">{c.explanation}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
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

export default RotationPuzzle;
