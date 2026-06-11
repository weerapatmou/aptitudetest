import { useCallback, useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import type { AssemblyPuzzle, Difficulty, Mode } from './types';
import { generateAssemblyPuzzle } from './generate';
import { PromptCard } from './PromptCard';
import { OptionCard } from './OptionCard';
import { HowToPlay } from './HowToPlay';
import { ModeChips } from './ModeChips';
import { DifficultyChips } from '../rotation-puzzle/DifficultyChips';
import { useLocalStorage } from '../rotation-puzzle/hooks/useLocalStorage';
import { formatDuration, useTimer } from '../rotation-puzzle/hooks/useTimer';
import { SeedBar, useSeedSequence } from '@/shared/seed';

const LETTERS = ['A', 'B', 'C', 'D'] as const;

type Phase = 'answering' | 'revealing' | 'revealed';

type Props = {
  difficulty?: Difficulty;
  onHome?: () => void;
};

export function PolygonAssemblyPuzzle({ difficulty: difficultyProp, onHome }: Props = {}) {
  const [difficulty, setDifficulty] = useLocalStorage<Difficulty>(
    'assembly:difficulty',
    difficultyProp ?? 'medium',
  );
  const [mode, setMode] = useLocalStorage<Mode>('assembly:mode', 'mirror');
  const [score, setScore] = useLocalStorage('assembly:score', { correct: 0, total: 0 });
  const [showHelp, setShowHelp] = useState(false);
  const [puzzleNumber, setPuzzleNumber] = useState(1);
  const [puzzle, setPuzzle] = useState<AssemblyPuzzle | null>(null);
  const [phase, setPhase] = useState<Phase>('answering');
  const [pick, setPick] = useState<number | null>(null);
  const [focused, setFocused] = useState(0);
  const reduced = useReducedMotion();

  const { elapsed } = useTimer(true);

  const seedSeq = useSeedSequence('assembly:sessionSeed');

  const regenerate = useCallback(
    (useSeed: number) => {
      setPuzzle(generateAssemblyPuzzle(difficulty, mode, useSeed));
      setPhase('answering');
      setPick(null);
      setFocused(0);
    },
    [difficulty, mode],
  );

  // Re-base the sequence when difficulty OR mode changes (treat mode like difficulty).
  // Dependency list is intentionally [difficulty, mode] only — adding seedSeq/regenerate
  // would re-run on every render and loop.
  useEffect(() => {
    regenerate(seedSeq.restart());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, mode]);

  const newPuzzle = useCallback(() => {
    regenerate(seedSeq.advance());
    setPuzzleNumber((n) => n + 1);
  }, [regenerate, seedSeq]);

  const handlePick = useCallback(
    (idx: number) => {
      if (!puzzle || phase !== 'answering') return;
      const correct = idx === puzzle.correctIndex;
      setPick(idx);
      setPhase('revealing');
      setScore((s) => ({
        correct: s.correct + (correct ? 1 : 0),
        total: s.total + 1,
      }));
      const dur = reduced ? 50 : 1250;
      window.setTimeout(() => setPhase('revealed'), dur);
    },
    [puzzle, phase, setScore, reduced],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!puzzle || showHelp) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        newPuzzle();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        setFocused((f) => {
          if (e.key === 'ArrowLeft') return (f + LETTERS.length - 1) % LETTERS.length;
          return (f + 1) % LETTERS.length;
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
                <div className="group-hover:text-text">Polygon Assembly</div>
                <div className="text-[10px] text-text-dim/70 group-hover:text-accent">← Aptitude Practice</div>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <LogoMark />
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim leading-tight">
                <div>Polygon Assembly</div>
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
          <ModeChips value={mode} onChange={setMode} />
          <SeedBar
            variant="full"
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
          <section aria-label="Target shape" className="flex justify-center">
            {puzzle && <PromptCard puzzle={puzzle} />}
          </section>

          <section aria-label="Candidate options" className="w-full">
            <div className="overflow-x-auto pb-3 -mx-4 px-4 md:-mx-8 md:px-8 max-w-full">
              <div
                className="flex flex-row flex-nowrap gap-3 md:gap-4"
                style={{ justifyContent: 'safe center' }}
              >
                {puzzle && options.map((option, i) => (
                  <OptionCard
                    key={`${puzzleNumber}-${i}`}
                    option={option}
                    letter={LETTERS[i]!}
                    index={i}
                    focused={focused === i}
                    selected={pick === i}
                    isCorrect={puzzle.correctIndex === i}
                    phase={phase}
                    target={puzzle.target.polygon}
                    reduced={!!reduced}
                    onPick={() => handlePick(i)}
                    onFocus={() => setFocused(i)}
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
                      ? 'Correct — these pieces assemble into the target.'
                      : `Incorrect — the correct answer was ${LETTERS[puzzle.correctIndex]}.`
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
        <polygon points="-9,-9 9,-9 9,9 -9,9" opacity={0.45} />
        <polygon points="-7,-3 3,-3 -2,7" />
      </g>
    </svg>
  );
}

export default PolygonAssemblyPuzzle;
