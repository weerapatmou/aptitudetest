import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import type { HiddenFiguresSession, Settings } from './types';
import { generateSession, signatureOf } from './generate';
import { ShapeLegend } from './ShapeLegend';
import { ComplexFigureCard } from './ComplexFigureCard';
import { HowToPlay } from './HowToPlay';
import { useLocalStorage } from '../rotation-puzzle/hooks/useLocalStorage';
import { formatDuration, useTimer } from '../rotation-puzzle/hooks/useTimer';
import { SeedBar, useSeedSequence } from '@/shared/seed';
import { pickFreshSeed, useSignatureHistory } from '@/shared/coverage';
import { LogoMark } from '@/shared/LogoMark';

const QUESTION_COUNTS = [7, 14, 21, 28] as const;

const DEFAULT_SETTINGS: Settings = {
  questionCount: 7,
};

type Props = {
  onHome?: () => void;
};

export function HiddenFiguresPuzzle({ onHome }: Props = {}) {
  const [score, setScore] = useLocalStorage('hiddenFigures:score', { correct: 0, total: 0 });
  const [settings, setSettings] = useLocalStorage<Settings>(
    'hiddenFigures:settings',
    DEFAULT_SETTINGS,
  );
  const [sheetNum, setSheetNum] = useState(1);
  const [session, setSession] = useState<HiddenFiguresSession | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const { elapsed, reset: resetTimer } = useTimer(true);
  const history = useSignatureHistory('hiddenFigures:sigHistory', { max: 60 });

  const pickSeed = useCallback(
    () =>
      pickFreshSeed({
        recent: history.recent,
        previewSignatures: (s) => {
          const sess = generateSession(s, settings.questionCount);
          return [signatureOf(sess)];
        },
      }).seed,
    [history.recent, settings.questionCount],
  );

  const seedSeq = useSeedSequence('hiddenFigures:sessionSeed', undefined, { pickSeed });

  const generateSheet = useCallback(
    (seed: number, count = settings.questionCount) => {
      const sess = generateSession(seed, count);
      history.add([signatureOf(sess)]);
      setSession(sess);
      setAnswers({});
      setSubmitted(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.questionCount],
  );

  useEffect(() => {
    generateSheet(seedSeq.restart());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.questionCount]);

  const newSheet = useCallback(() => {
    generateSheet(seedSeq.advance());
    setSheetNum((n) => n + 1);
    resetTimer();
  }, [generateSheet, seedSeq, resetTimer]);

  const handlePick = useCallback(
    (qIdx: number, labelIdx: number) => {
      if (submitted) return;
      setAnswers((prev) => ({ ...prev, [qIdx]: labelIdx }));
    },
    [submitted],
  );

  const handleSubmit = useCallback(() => {
    if (submitted || !session) return;
    let correct = 0;
    for (let i = 0; i < session.questions.length; i++) {
      if (answers[i] === session.questions[i]!.correctIndex) correct++;
    }
    setScore((s) => ({ correct: s.correct + correct, total: s.total + session.questions.length }));
    setSubmitted(true);
  }, [submitted, session, answers, setScore]);

  const answeredCount = Object.keys(answers).length;
  const totalCount = session?.questions.length ?? 0;
  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  const sheetCorrect =
    submitted && session
      ? session.questions.filter((q, i) => answers[i] === q.correctIndex).length
      : null;

  return (
    <div className="min-h-full bg-instrument">
      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}

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
                <div className="group-hover:text-text">Hidden Figures</div>
                <div className="text-[10px] text-text-dim/70 group-hover:text-accent">
                  ← Aptitude Practice
                </div>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <LogoMark />
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim leading-tight">
                <div>Hidden Figures</div>
                <div className="text-[10px] text-text-dim/70">Aptitude Practice</div>
              </div>
            </div>
          )}

          <div className="hidden md:flex items-center gap-2 ml-4 font-mono text-xs text-text-dim">
            <span className="text-text-dim/70">SHEET</span>
            <span className="text-text font-medium">#{String(sheetNum).padStart(3, '0')}</span>
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
              className="px-2.5 py-1.5 rounded-md border border-border bg-bg-card text-text-dim hover:text-text transition text-[11px] uppercase tracking-wider"
            >
              ?
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-32">
        {/* Controls row */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {/* Question count */}
          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-bg-card p-1">
            <span className="px-2 font-mono text-[10px] uppercase tracking-wider text-text-dim/60">
              Q
            </span>
            {QUESTION_COUNTS.map((n) => (
              <button
                key={n}
                onClick={() => {
                  setSettings((s) => ({ ...s, questionCount: n }));
                  generateSheet(seedSeq.restart(), n);
                  resetTimer();
                }}
                className={clsx(
                  'rounded-lg px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition',
                  n === settings.questionCount
                    ? 'bg-accent text-bg shadow-[0_0_12px_-2px_var(--accent)]'
                    : 'text-text-dim hover:text-text hover:bg-bg-card-hover',
                )}
              >
                {n}
              </button>
            ))}
          </div>

          <SeedBar
            variant="full"
            seed={seedSeq.current}
            draft={seedSeq.draft}
            draftValid={seedSeq.draftValid}
            onDraftChange={seedSeq.setDraft}
            onNew={() => {
              generateSheet(seedSeq.fresh());
              resetTimer();
            }}
            onReplay={() => {
              generateSheet(seedSeq.restart());
              resetTimer();
            }}
            onApply={() => {
              const n = seedSeq.applyDraft();
              if (n !== null) {
                generateSheet(n);
                resetTimer();
              }
            }}
          />
        </div>

        {/* Shape legend — sticky below header */}
        {session && (
          <div className="sticky top-[57px] z-20 mb-5 rounded-xl border border-border bg-bg-card/90 backdrop-blur-md px-4 py-3 shadow-sm">
            <div className="font-mono text-[10px] uppercase tracking-wider text-text-dim/60 mb-2 text-center">
              Simple Shapes
            </div>
            <ShapeLegend shapes={session.simpleShapes} />
          </div>
        )}

        {/* Question grid */}
        {session && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {session.questions.map((question, qIdx) => (
              <ComplexFigureCard
                key={`${sheetNum}-${qIdx}`}
                question={question}
                qIdx={qIdx}
                answer={answers[qIdx] ?? -1}
                submitted={submitted}
                onPick={(labelIdx) => handlePick(qIdx, labelIdx)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-bg/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
          {submitted ? (
            <div className="font-mono text-sm">
              <span className="text-text-dim">Sheet result: </span>
              <span
                className={clsx(
                  'font-bold',
                  sheetCorrect === totalCount
                    ? 'text-correct'
                    : sheetCorrect! >= totalCount * 0.6
                      ? 'text-accent'
                      : 'text-wrong',
                )}
              >
                {sheetCorrect}/{totalCount}
              </span>
              <span className="text-text-dim/60 text-xs ml-2">
                ({Math.round((sheetCorrect! / totalCount) * 100)}%)
              </span>
            </div>
          ) : (
            <div className="font-mono text-xs text-text-dim">
              Answered{' '}
              <span
                className={clsx(
                  'font-medium',
                  answeredCount === totalCount ? 'text-accent' : 'text-text',
                )}
              >
                {answeredCount}/{totalCount}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            {submitted && (
              <button
                onClick={newSheet}
                className="px-5 py-2 rounded-lg font-mono uppercase tracking-wider text-xs bg-accent text-bg hover:shadow-[0_0_24px_-4px_var(--accent)] transition"
              >
                New Set →
              </button>
            )}
            {!submitted && (
              <button
                onClick={handleSubmit}
                disabled={answeredCount === 0}
                className={clsx(
                  'px-5 py-2 rounded-lg font-mono uppercase tracking-wider text-xs transition',
                  answeredCount > 0
                    ? 'bg-accent text-bg hover:shadow-[0_0_24px_-4px_var(--accent)]'
                    : 'bg-bg-card text-text-dim/50 border border-border cursor-not-allowed',
                )}
              >
                Submit ({answeredCount}/{totalCount})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Score readout ─────────────────────────────────────────────────────────────

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
        {score}
        <span className="text-text-dim/60">/{total}</span>
      </span>
      <span className="text-text-dim/40">·</span>
      <span className="text-accent tabular-nums">{accuracy}%</span>
      {onReset && (
        <button
          onClick={onReset}
          disabled={total === 0}
          aria-label="Reset score"
          title="Reset score"
          className="ml-1 -mr-0.5 inline-flex items-center justify-center w-5 h-5 rounded text-text-dim/70 hover:text-wrong hover:bg-wrong/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
        </button>
      )}
    </div>
  );
}
