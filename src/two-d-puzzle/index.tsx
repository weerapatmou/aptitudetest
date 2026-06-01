import { useCallback, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import type { Difficulty, DifficultyOrMixed, Puzzle, Settings, ShapeScope, SheetResult } from './types';
import { DIFFICULTY_LABEL } from './types';
import { DifficultyBadge } from './DifficultyBadge';
import { PromptFigure } from './PromptFigure';
import { ChoiceCard } from './ChoiceCard';
import { SolutionFigure } from './SolutionFigure';
import { HowToPlay } from './HowToPlay';
import { generateSession } from './generate';
import { useLocalStorage } from '@/rotation-puzzle/hooks/useLocalStorage';
import { formatDuration, useTimer } from '@/rotation-puzzle/hooks/useTimer';

const LETTERS = ['a', 'b', 'c', 'd'] as const;
const COUNT_PRESETS = [10, 20, 30, 40] as const;

type Phase = 'setup' | 'sheet' | 'summary';

type Props = {
  onHome?: () => void;
};

function setsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

export function TwoDPuzzle({ onHome }: Props = {}) {
  const [settings, setSettings] = useLocalStorage<Settings>('twoDPuzzle:settings', {
    count: 20,
    difficulty: 'mixed',
    shapeScope: 'square',
  });

  const [phase, setPhase] = useState<Phase>('setup');
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const reduced = useReducedMotion();

  const { elapsed, reset: resetTimer } = useTimer(phase === 'sheet' && !submitted);

  const startSession = useCallback(() => {
    setPuzzles(generateSession(settings));
    setAnswers({});
    setSubmitted(false);
    resetTimer();
    setPhase('sheet');
  }, [settings, resetTimer]);

  const toggleChoice = useCallback(
    (qIdx: number, choiceIdx: number) => {
      if (submitted) return;
      setAnswers((prev) => {
        const cur = prev[qIdx] ?? [];
        const next = cur.includes(choiceIdx)
          ? cur.filter((i) => i !== choiceIdx)
          : [...cur, choiceIdx];
        return { ...prev, [qIdx]: next };
      });
    },
    [submitted],
  );

  const submit = useCallback(() => setSubmitted(true), []);

  const backToSetup = useCallback(() => {
    setPhase('setup');
    setPuzzles([]);
    setAnswers({});
    setSubmitted(false);
  }, []);

  const results = useMemo<SheetResult[]>(
    () =>
      puzzles.map((p, i) => {
        const selected = answers[i] ?? [];
        return { puzzle: p, selected, correct: setsEqual(selected, p.correctIndices) };
      }),
    [puzzles, answers],
  );

  const score = results.filter((r) => r.correct).length;
  const total = puzzles.length;
  const answeredCount = useMemo(
    () => Object.values(answers).filter((a) => a.length > 0).length,
    [answers],
  );
  const showScore = phase === 'sheet' && submitted;
  const showTimer = phase === 'sheet';

  return (
    <div className="min-h-full bg-instrument">
      <HowToPlay open={showHelp} onClose={() => setShowHelp(false)} />

      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-3 flex items-center gap-4">
          {onHome ? (
            <button
              onClick={onHome}
              aria-label="Back to home"
              className="group flex items-center gap-3 rounded-md px-1 -mx-1 hover:bg-bg-card-hover transition"
            >
              <LogoMark />
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim leading-tight text-left">
                <div className="group-hover:text-text">2D Puzzle</div>
                <div className="text-[10px] text-text-dim/70 group-hover:text-accent">← Aptitude Practice</div>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <LogoMark />
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim leading-tight">
                <div>2D Puzzle</div>
                <div className="text-[10px] text-text-dim/70">Aptitude Practice</div>
              </div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-3 md:gap-5 font-mono text-xs">
            {showScore && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-bg-card">
                <span className="text-text-dim/70">SCORE</span>
                <span className="text-text tabular-nums">
                  {score}<span className="text-text-dim/60">/{total}</span>
                </span>
              </div>
            )}
            {showTimer && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-bg-card">
                <span className="text-text-dim/70">T</span>
                <span className="text-text tabular-nums">{formatDuration(elapsed)}</span>
              </div>
            )}
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

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">
        {phase === 'setup' && (
          <SetupScreen settings={settings} onChange={setSettings} onStart={startSession} />
        )}

        {phase === 'sheet' && (
          <SheetScreen
            results={results}
            answers={answers}
            submitted={submitted}
            answeredCount={answeredCount}
            score={score}
            total={total}
            reduced={!!reduced}
            onToggle={toggleChoice}
            onSubmit={submit}
            onEndSession={backToSetup}
            onViewSummary={() => setPhase('summary')}
          />
        )}

        {phase === 'summary' && (
          <SummaryScreen
            results={results}
            elapsedMs={elapsed}
            onBack={() => setPhase('sheet')}
            onAgain={() => setPhase('setup')}
          />
        )}
      </main>
    </div>
  );
}

// ---- Setup ----

function SetupScreen({
  settings,
  onChange,
  onStart,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onStart: () => void;
}) {
  const difficulties: Array<{ value: DifficultyOrMixed; label: string }> = [
    { value: 'easy', label: 'Easy' },
    { value: 'normal', label: 'Normal' },
    { value: 'hard', label: 'Hard' },
    { value: 'mixed', label: 'Mixed' },
  ];
  const scopes: Array<{ value: ShapeScope; label: string; hint: string }> = [
    { value: 'square', label: 'Square only', hint: 'Every puzzle completes to a perfect square.' },
    {
      value: 'square-rect',
      label: 'Square + Rectangle',
      hint: 'Puzzles complete to a square or a rectangle, for more variety.',
    },
  ];

  const difficultyHint: Record<DifficultyOrMixed, string> = {
    easy: 'Exactly one piece fills the gap.',
    normal: 'One or two pieces combine to fill the gap.',
    hard: 'One to four pieces combine — sometimes every choice is needed.',
    mixed: 'Each question independently rolls easy, normal, or hard.',
  };

  return (
    <div className="max-w-xl mx-auto rounded-2xl border border-border bg-bg-card p-6 md:p-8">
      <h2 className="font-display text-2xl font-semibold text-text mb-2">2D Puzzle</h2>
      <p className="text-text-dim text-sm mb-6 leading-relaxed">
        A square is shown with a chunk missing. Pick the combination of pieces that — rotated and
        combined — fills the gap to complete the square. Answer the whole sheet, then submit to
        reveal everything at once.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider text-text-dim mb-2">
            Shape mode
          </label>
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-bg p-1.5">
            {scopes.map((s) => {
              const active = settings.shapeScope === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => onChange({ ...settings, shapeScope: s.value })}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider font-mono transition',
                    active
                      ? 'bg-accent text-bg shadow-[0_0_18px_-4px_var(--accent)]'
                      : 'text-text-dim hover:text-text hover:bg-bg-card-hover',
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-text-dim/80">
            {scopes.find((s) => s.value === settings.shapeScope)?.hint}
          </p>
        </div>

        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider text-text-dim mb-2">
            Difficulty
          </label>
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-bg p-1.5">
            {difficulties.map((d) => {
              const active = settings.difficulty === d.value;
              return (
                <button
                  key={d.value}
                  onClick={() => onChange({ ...settings, difficulty: d.value })}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider font-mono transition',
                    active
                      ? 'bg-accent text-bg shadow-[0_0_18px_-4px_var(--accent)]'
                      : 'text-text-dim hover:text-text hover:bg-bg-card-hover',
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-text-dim/80">{difficultyHint[settings.difficulty]}</p>
        </div>

        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider text-text-dim mb-2">
            Questions
          </label>
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-bg p-1.5">
            {COUNT_PRESETS.map((c) => {
              const active = settings.count === c;
              return (
                <button
                  key={c}
                  onClick={() => onChange({ ...settings, count: c })}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider font-mono transition',
                    active
                      ? 'bg-accent text-bg shadow-[0_0_18px_-4px_var(--accent)]'
                      : 'text-text-dim hover:text-text hover:bg-bg-card-hover',
                  )}
                >
                  {c}
                </button>
              );
            })}
            <div className="flex items-center gap-2 px-2 py-1">
              <span className="text-[11px] text-text-dim font-mono">Custom:</span>
              <input
                type="number"
                min={1}
                max={100}
                value={settings.count}
                onChange={(e) => {
                  const n = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                  onChange({ ...settings, count: n });
                }}
                className="w-16 px-2 py-1 rounded-md border border-border bg-bg-card text-text font-mono text-xs tabular-nums focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onStart}
        className="mt-7 w-full px-4 py-3 rounded-xl bg-accent text-bg font-mono uppercase tracking-wider text-sm font-semibold hover:shadow-[0_0_24px_-4px_var(--accent)] transition"
      >
        Start session →
      </button>
    </div>
  );
}

// ---- Sheet ----

function SheetScreen({
  results,
  answers,
  submitted,
  answeredCount,
  score,
  total,
  reduced,
  onToggle,
  onSubmit,
  onEndSession,
  onViewSummary,
}: {
  results: SheetResult[];
  answers: Record<number, number[]>;
  submitted: boolean;
  answeredCount: number;
  score: number;
  total: number;
  reduced: boolean;
  onToggle: (qIdx: number, choiceIdx: number) => void;
  onSubmit: () => void;
  onEndSession: () => void;
  onViewSummary: () => void;
}) {
  const scorePct = total > 0 ? Math.round((score / total) * 100) : 0;
  const accuracyPct = answeredCount > 0 ? Math.round((score / answeredCount) * 100) : 0;

  return (
    <>
      <div className="flex flex-col gap-12 pb-28">
        {results.map((r, i) => {
          const selected = answers[i] ?? [];
          // One shared scale for the main shape and all four pieces of this question.
          const vb = r.puzzle.viewBox;
          return (
            <section key={r.puzzle.id} id={`q-${i}`} className="flex flex-col gap-4 scroll-mt-24">
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-xs text-text-dim">
                  Question <span className="text-text">{i + 1}</span> / {total}
                </div>
                {submitted && <DifficultyBadge difficulty={r.puzzle.difficulty} />}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 items-start">
                <div className="relative rounded-2xl border-2 border-accent/40 bg-bg-card p-3 text-text shadow-[0_0_40px_-16px_var(--accent)]">
                  <div className="absolute top-2 left-2 z-10 font-mono text-[11px] tracking-widest text-accent">
                    ?
                  </div>
                  <div className="w-full aspect-square flex items-center justify-center">
                    <PromptFigure main={r.puzzle.main} viewBox={vb} className="w-full h-full" />
                  </div>
                </div>

                {r.puzzle.choices.map((choice, ci) => (
                  <ChoiceCard
                    key={`${r.puzzle.id}-${ci}`}
                    choice={choice}
                    letter={LETTERS[ci]!}
                    index={ci}
                    selected={selected.includes(ci)}
                    revealed={submitted}
                    focused={false}
                    viewBox={vb}
                    onToggle={() => onToggle(i, ci)}
                    onFocus={() => {}}
                    reduced={reduced}
                  />
                ))}
              </div>

              {submitted && <RevealPanel result={r} />}
            </section>
          );
        })}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-border bg-bg/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-3">
          <button
            onClick={onEndSession}
            className="px-3 py-2 rounded-lg font-mono uppercase tracking-wider text-[11px] text-text-dim hover:text-text hover:bg-bg-card-hover border border-border"
          >
            {submitted ? '← New session' : '← End session'}
          </button>
          {submitted ? (
            <>
              <div className="font-mono text-xs text-text-dim flex flex-wrap items-center gap-x-2 gap-y-0.5 justify-center">
                <span>
                  Accuracy{' '}
                  <span className="text-text tabular-nums">
                    {score}<span className="text-text-dim/60">/{answeredCount}</span>
                  </span>{' '}
                  <span className="text-accent tabular-nums">({accuracyPct}%)</span>
                </span>
                <span className="text-text-dim/40">·</span>
                <span>
                  Score{' '}
                  <span className="text-text tabular-nums">
                    {score}<span className="text-text-dim/60">/{total}</span>
                  </span>{' '}
                  <span className="text-accent tabular-nums">({scorePct}%)</span>
                </span>
              </div>
              <button
                onClick={onViewSummary}
                className="px-4 py-2 rounded-lg font-mono uppercase tracking-wider text-xs bg-accent text-bg hover:shadow-[0_0_24px_-4px_var(--accent)] transition shrink-0"
              >
                View summary →
              </button>
            </>
          ) : (
            <>
              <div className="font-mono text-xs text-text-dim">
                Answered{' '}
                <span className="text-text tabular-nums">{answeredCount}</span>
                <span className="text-text-dim/60">/{total}</span>
              </div>
              <button
                onClick={onSubmit}
                className="px-4 py-2 rounded-lg font-mono uppercase tracking-wider text-xs bg-accent text-bg hover:shadow-[0_0_24px_-4px_var(--accent)] transition shrink-0"
              >
                Submit
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function RevealPanel({ result }: { result: SheetResult }) {
  const { puzzle, selected, correct } = result;
  const correctLetters = puzzle.correctIndices
    .slice()
    .sort((a, b) => a - b)
    .map((i) => LETTERS[i])
    .join(', ');
  const unanswered = selected.length === 0;

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 md:p-5">
      <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
        <div className="shrink-0 self-center">
          <div
            className="flex items-center justify-center"
            style={{ width: 'calc(var(--svg-slot) * 0.9)', height: 'calc(var(--svg-slot) * 0.9)' }}
          >
            <SolutionFigure puzzle={puzzle} className="w-full h-full" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div
              className={clsx('text-sm font-medium', correct ? 'text-correct' : 'text-wrong')}
            >
              {unanswered ? 'Not answered' : correct ? 'Correct' : 'Incorrect'}
            </div>
            <div className="font-mono text-xs text-text-dim">
              Answer: <span className="text-accent tracking-widest">{correctLetters}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {puzzle.choices.map((c, i) => {
              const picked = selected.includes(i);
              return (
                <div
                  key={i}
                  className={clsx(
                    'rounded-md p-2 border font-mono',
                    c.isCorrect
                      ? 'border-correct/30 bg-correct/5 text-correct'
                      : picked
                        ? 'border-wrong/30 bg-wrong/5 text-wrong'
                        : 'border-border bg-bg/30 text-text-dim',
                  )}
                >
                  <span className="font-semibold mr-1 lowercase">{LETTERS[i]}</span>
                  <span className="opacity-90">
                    {c.isCorrect
                      ? picked
                        ? '— fits the gap ✓'
                        : '— fits the gap (you missed it)'
                      : `— ${c.explanation}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Summary ----

function SummaryScreen({
  results,
  elapsedMs,
  onBack,
  onAgain,
}: {
  results: SheetResult[];
  elapsedMs: number;
  onBack: () => void;
  onAgain: () => void;
}) {
  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const attempted = results.filter((r) => r.selected.length > 0).length;
  const accuracyPct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const byDifficulty: Record<Difficulty, { correct: number; total: number }> = {
    easy: { correct: 0, total: 0 },
    normal: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
  };
  for (const r of results) {
    const d = r.puzzle.difficulty;
    byDifficulty[d].total += 1;
    if (r.correct) byDifficulty[d].correct += 1;
  }

  return (
    <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-bg-card p-6 md:p-8">
      <h2 className="font-display text-2xl font-semibold text-text mb-2">Session complete</h2>
      <p className="text-text-dim text-sm mb-6">
        You solved {correct} of {total} correctly in {formatDuration(elapsedMs)}.
      </p>

      <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 mb-5">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent mb-2">
          Overall
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim mb-1">
              Accuracy
            </div>
            <div className="flex items-baseline gap-2">
              <div className="font-display text-4xl text-text tabular-nums">{accuracyPct}%</div>
              <div className="text-text-dim text-sm tabular-nums">
                {correct}/{attempted}
              </div>
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim mb-1">
              Score
            </div>
            <div className="flex items-baseline gap-2">
              <div className="font-display text-4xl text-text tabular-nums">{scorePct}%</div>
              <div className="text-text-dim text-sm tabular-nums">
                {correct}/{total}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim mb-1">
          Breakdown by difficulty
        </div>
        {(Object.entries(byDifficulty) as Array<[Difficulty, { correct: number; total: number }]>).map(
          ([d, s]) => {
            if (s.total === 0) return null;
            const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
            return (
              <div
                key={d}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg/30 px-3 py-2"
              >
                <DifficultyBadge difficulty={d} />
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-text tabular-nums">
                    {s.correct}<span className="text-text-dim/60">/{s.total}</span>
                  </span>
                  <span className="text-accent tabular-nums w-10 text-right">{pct}%</span>
                </div>
              </div>
            );
          },
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onBack}
          className="sm:w-auto px-4 py-3 rounded-xl border border-border text-text-dim hover:text-text hover:bg-bg-card-hover font-mono uppercase tracking-wider text-sm transition"
        >
          ← Review answers
        </button>
        <button
          onClick={onAgain}
          className="flex-1 px-4 py-3 rounded-xl bg-accent text-bg font-mono uppercase tracking-wider text-sm font-semibold hover:shadow-[0_0_24px_-4px_var(--accent)] transition"
        >
          New session
        </button>
      </div>

      <span className="sr-only">{DIFFICULTY_LABEL.easy}</span>
    </div>
  );
}

function LogoMark() {
  return (
    <svg width={28} height={28} viewBox="-12 -12 24 24" aria-hidden="true">
      <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -9 -9 H 3 V -3 H 9 V 9 H -9 Z" />
        <path d="M 3 -3 H 9 V -9 H 3 Z" opacity={0.5} />
      </g>
    </svg>
  );
}

export default TwoDPuzzle;
