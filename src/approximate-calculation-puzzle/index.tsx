import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import type {
  ApproxQuestion,
  ApproxSettings,
  PracticeMode,
  SessionResult,
} from './types';
import { QuestionCard } from './QuestionCard';
import { HowToPlay } from './HowToPlay';
import { generateSession } from './generate';
import { useLocalStorage } from '@/rotation-puzzle/hooks/useLocalStorage';
import { formatDuration, useTimer } from '@/rotation-puzzle/hooks/useTimer';

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
const COUNT_PRESETS = [5, 10, 20, 50] as const;

type Phase = 'setup' | 'answering' | 'revealed' | 'sheet' | 'summary';

type Props = {
  onHome?: () => void;
};

/** Format an option value with its unit ("$" prefixes, everything else suffixes). */
function formatValue(value: number, unit: string, precision: number): string {
  const num = value.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  if (unit === '$') return `$${num}`;
  return `${num} ${unit}`;
}

export function ApproximateCalculationPuzzle({ onHome }: Props = {}) {
  const [settings, setSettings] = useLocalStorage<ApproxSettings>('approxCalc:settings', {
    count: 10,
    mode: 'sequential',
  });

  const mode: PracticeMode = settings.mode ?? 'sequential';

  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<ApproxQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [focused, setFocused] = useState(0);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [sheetSubmitted, setSheetSubmitted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const reduced = useReducedMotion();

  const timerRunning =
    phase === 'answering' ||
    phase === 'revealed' ||
    (phase === 'sheet' && !sheetSubmitted);
  const { elapsed, reset: resetTimer } = useTimer(timerRunning);

  const current = questions[currentIdx] ?? null;

  const startSession = useCallback(() => {
    const generated = generateSession(settings);
    setQuestions(generated);
    setResults([]);
    resetTimer();
    if (mode === 'sheet') {
      setAnswers({});
      setSheetSubmitted(false);
      setPhase('sheet');
    } else {
      setCurrentIdx(0);
      setPick(null);
      setFocused(0);
      setPhase('answering');
    }
  }, [settings, mode, resetTimer]);

  const handleSheetPick = useCallback(
    (qIdx: number, optIdx: number) => {
      if (sheetSubmitted) return;
      setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
    },
    [sheetSubmitted],
  );

  const submitSheet = useCallback(() => {
    if (sheetSubmitted) return;
    const computed: SessionResult[] = questions.map((q, i) => {
      const picked = answers[i];
      if (picked === undefined) {
        return { question: q, pickedIndex: -1, correct: false };
      }
      return { question: q, pickedIndex: picked, correct: q.options[picked]!.isCorrect };
    });
    setResults(computed);
    setSheetSubmitted(true);
  }, [questions, answers, sheetSubmitted]);

  const handlePick = useCallback(
    (idx: number) => {
      if (!current || phase !== 'answering') return;
      const opt = current.options[idx]!;
      setPick(idx);
      setPhase('revealed');
      setResults((prev) => [
        ...prev,
        { question: current, pickedIndex: idx, correct: opt.isCorrect },
      ]);
    },
    [current, phase],
  );

  const nextQuestion = useCallback(() => {
    if (phase !== 'revealed') return;
    if (currentIdx + 1 >= questions.length) {
      setPhase('summary');
      return;
    }
    setCurrentIdx((i) => i + 1);
    setPick(null);
    setFocused(0);
    setPhase('answering');
  }, [phase, currentIdx, questions.length]);

  const backToSetup = useCallback(() => {
    setPhase('setup');
    setQuestions([]);
    setCurrentIdx(0);
    setPick(null);
    setResults([]);
    setAnswers({});
    setSheetSubmitted(false);
  }, []);

  // Keyboard navigation during answering / revealed.
  useEffect(() => {
    if (phase !== 'answering' && phase !== 'revealed') return;
    if (showHelp) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'n' || e.key === 'N') {
        if (phase === 'revealed') {
          e.preventDefault();
          nextQuestion();
        }
        return;
      }
      if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown'
      ) {
        if (phase !== 'answering') return;
        e.preventDefault();
        setFocused((f) => {
          const delta = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
          return Math.max(0, Math.min(LETTERS.length - 1, f + delta));
        });
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (phase === 'answering') handlePick(focused);
        else if (phase === 'revealed') nextQuestion();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, focused, handlePick, nextQuestion, showHelp]);

  const score = useMemo(() => results.filter((r) => r.correct).length, [results]);
  const accuracy = results.length > 0 ? Math.round((score / results.length) * 100) : 0;

  const showScore =
    phase === 'answering' || phase === 'revealed' || (phase === 'sheet' && sheetSubmitted);
  const showTimer =
    phase === 'answering' || phase === 'revealed' || phase === 'sheet';

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
                <div className="group-hover:text-text">Approximation</div>
                <div className="text-[10px] text-text-dim/70 group-hover:text-accent">← Aptitude Practice</div>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <LogoMark />
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim leading-tight">
                <div>Approximation</div>
                <div className="text-[10px] text-text-dim/70">Aptitude Practice</div>
              </div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-3 md:gap-5 font-mono text-xs">
            {showScore && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-bg-card">
                <span className="text-text-dim/70">SCORE</span>
                <span className="text-text tabular-nums">
                  {score}<span className="text-text-dim/60">/{results.length}</span>
                </span>
                {results.length > 0 && (
                  <>
                    <span className="text-text-dim/40">·</span>
                    <span className="text-accent tabular-nums">{accuracy}%</span>
                  </>
                )}
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

        {(phase === 'answering' || phase === 'revealed') && current && (
          <div className="flex flex-col gap-6">
            <QuestionCard
              question={current}
              questionNumber={currentIdx + 1}
              totalQuestions={questions.length}
            />
            <OptionsGrid
              question={current}
              phase={phase}
              pick={pick}
              focused={focused}
              onPick={handlePick}
              onFocus={setFocused}
              reduced={!!reduced}
            />
            <AnimatePresence mode="wait">
              {phase === 'revealed' && pick !== null && (
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.25 }}
                  className="rounded-xl border border-border bg-bg-card p-4 md:p-5"
                >
                  <RevealPanel question={current} pickedIndex={pick} />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={backToSetup}
                className="px-3 py-2 rounded-lg font-mono uppercase tracking-wider text-[11px] text-text-dim hover:text-text hover:bg-bg-card-hover border border-border"
              >
                ← End session
              </button>
              <button
                onClick={nextQuestion}
                disabled={phase !== 'revealed'}
                className={clsx(
                  'px-4 py-2 rounded-lg font-mono uppercase tracking-wider text-xs transition shrink-0',
                  phase === 'revealed'
                    ? 'bg-accent text-bg hover:shadow-[0_0_24px_-4px_var(--accent)]'
                    : 'bg-bg-card text-text-dim/60 cursor-not-allowed border border-border',
                )}
              >
                {currentIdx + 1 >= questions.length ? 'Finish' : 'Next →'}
              </button>
            </div>
          </div>
        )}

        {phase === 'sheet' && (
          <SheetScreen
            questions={questions}
            answers={answers}
            submitted={sheetSubmitted}
            reduced={!!reduced}
            onPick={handleSheetPick}
            onSubmit={submitSheet}
            onEndSession={backToSetup}
            onViewSummary={() => setPhase('summary')}
          />
        )}

        {phase === 'summary' && (
          <SummaryScreen
            results={results}
            elapsedMs={elapsed}
            onAgain={() => {
              setPhase('setup');
            }}
          />
        )}
      </main>
    </div>
  );
}

// ---- Sub-components ----

function SetupScreen({
  settings,
  onChange,
  onStart,
}: {
  settings: ApproxSettings;
  onChange: (s: ApproxSettings) => void;
  onStart: () => void;
}) {
  const modes: Array<{ value: PracticeMode; label: string; hint: string }> = [
    { value: 'sequential', label: 'One at a time', hint: 'Answer → instant feedback → next.' },
    {
      value: 'sheet',
      label: 'Practice sheet',
      hint: 'All questions on one page — answer in any order, then submit to reveal everything.',
    },
  ];
  const activeMode: PracticeMode = settings.mode ?? 'sequential';

  return (
    <div className="max-w-xl mx-auto rounded-2xl border border-border bg-bg-card p-6 md:p-8">
      <h2 className="font-display text-2xl font-semibold text-text mb-2">Approximate Calculation</h2>
      <p className="text-text-dim text-sm mb-6 leading-relaxed">
        Real-world word problems with numbers chosen to sit just off round values. Round, estimate
        in your head, and pick the closest of five answers — no exact arithmetic needed.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider text-text-dim mb-2">
            Mode
          </label>
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-bg p-1.5">
            {modes.map((m) => {
              const active = activeMode === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => onChange({ ...settings, mode: m.value })}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider font-mono transition',
                    active
                      ? 'bg-accent text-bg shadow-[0_0_18px_-4px_var(--accent)]'
                      : 'text-text-dim hover:text-text hover:bg-bg-card-hover',
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-text-dim/80">
            {modes.find((m) => m.value === activeMode)?.hint}
          </p>
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

function OptionsGrid({
  question,
  phase,
  pick,
  focused,
  onPick,
  onFocus,
  reduced,
}: {
  question: ApproxQuestion;
  phase: Phase;
  pick: number | null;
  focused: number;
  onPick: (i: number) => void;
  onFocus: (i: number) => void;
  reduced: boolean;
}) {
  const { unit, precision } = question.problem;
  return (
    <section aria-label="Answer choices">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
        {question.options.map((opt, i) => (
          <OptionCard
            key={`${question.id}-${i}`}
            label={formatValue(opt.value, unit, precision)}
            letter={LETTERS[i]!}
            isCorrect={opt.isCorrect}
            selected={pick === i}
            focused={focused === i}
            phase={phase}
            onPick={() => onPick(i)}
            onFocus={() => onFocus(i)}
            index={i}
            reduced={reduced}
          />
        ))}
      </div>
    </section>
  );
}

function OptionCard({
  label,
  letter,
  isCorrect,
  selected,
  focused,
  phase,
  onPick,
  onFocus,
  index,
  reduced,
}: {
  label: string;
  letter: string;
  isCorrect: boolean;
  selected: boolean;
  focused: boolean;
  phase: Phase;
  onPick: () => void;
  onFocus: () => void;
  index: number;
  reduced: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const revealed = phase === 'revealed';
  const showCorrectRing = revealed && isCorrect;
  const showWrongRing = revealed && selected && !isCorrect;
  const showPendingRing = !revealed && selected;

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
      transition={reduced ? { duration: 0 } : { delay: index * 0.05, duration: 0.2 }}
      whileTap={revealed || reduced ? undefined : { scale: 0.98 }}
      aria-label={`Option ${letter}: ${label}`}
      className={clsx(
        'relative rounded-2xl border bg-bg-card p-5 md:p-6 transition-colors text-text card-focus-ring',
        !revealed && 'hover:bg-bg-card-hover hover:border-border-strong',
        showCorrectRing && 'border-correct',
        showWrongRing && 'border-wrong',
        showPendingRing && 'border-accent',
        !showCorrectRing && !showWrongRing && !showPendingRing && 'border-border',
      )}
      style={
        showCorrectRing
          ? { boxShadow: '0 0 0 2px var(--correct), 0 0 28px -6px var(--correct)' }
          : showWrongRing
          ? { boxShadow: '0 0 0 2px var(--wrong), 0 0 24px -6px var(--wrong)' }
          : showPendingRing
          ? { boxShadow: '0 0 0 2px var(--accent), 0 0 20px -8px var(--accent)' }
          : undefined
      }
    >
      <div className="absolute top-2 left-2 font-mono text-[10px] tracking-widest text-text-dim">
        {letter}
      </div>
      {revealed && (
        <div className="absolute top-2 right-2">
          {isCorrect ? <CheckIcon /> : selected ? <XIcon /> : null}
        </div>
      )}
      <div className="flex items-center justify-center mt-3 font-mono tabular-nums text-lg md:text-xl">
        {label}
      </div>
    </motion.button>
  );
}

function RevealPanel({
  question,
  pickedIndex,
}: {
  question: ApproxQuestion;
  pickedIndex: number;
}) {
  const { unit, precision } = question.problem;
  const pickedOption = pickedIndex >= 0 ? question.options[pickedIndex] : undefined;
  const correct = pickedOption?.isCorrect ?? false;
  const unanswered = pickedIndex < 0;
  const correctLetter =
    LETTERS[question.options.findIndex((o) => o.isCorrect)] ?? LETTERS[0];
  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div
          className={clsx('text-sm font-medium', correct ? 'text-correct' : 'text-wrong')}
        >
          {unanswered ? 'Not answered' : correct ? 'Correct' : 'Incorrect'}
        </div>
        <div className="font-mono text-xs text-text-dim">
          Correct answer: <span className="text-text">{correctLetter}</span>{' '}
          <span className="text-accent tabular-nums">
            ({formatValue(question.correctValue, unit, precision)})
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-3 md:p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent mb-1">
          Quick mental logic
        </div>
        <div className="font-mono text-sm text-text mb-2">{question.problem.formula}</div>
        <div className="text-sm text-text-dim leading-relaxed">
          {question.problem.mentalLogic}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {question.options.map((opt, i) => (
          <div
            key={i}
            className={clsx(
              'rounded-md p-2 border font-mono',
              opt.isCorrect
                ? 'border-correct/30 bg-correct/5 text-correct'
                : 'border-border bg-bg/30 text-text-dim',
            )}
          >
            <span className="font-semibold mr-1">{LETTERS[i]}</span>
            <span className="tabular-nums mr-2">{formatValue(opt.value, unit, precision)}</span>
            <span className="opacity-90">— {opt.rationale}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SheetScreen({
  questions,
  answers,
  submitted,
  reduced,
  onPick,
  onSubmit,
  onEndSession,
  onViewSummary,
}: {
  questions: ApproxQuestion[];
  answers: Record<number, number>;
  submitted: boolean;
  reduced: boolean;
  onPick: (qIdx: number, optIdx: number) => void;
  onSubmit: () => void;
  onEndSession: () => void;
  onViewSummary: () => void;
}) {
  const answeredCount = Object.keys(answers).length;
  const total = questions.length;
  const score = questions.reduce((acc, q, i) => {
    const picked = answers[i];
    return acc + (picked !== undefined && q.options[picked]?.isCorrect ? 1 : 0);
  }, 0);
  const accuracyPct = answeredCount > 0 ? Math.round((score / answeredCount) * 100) : 0;
  const scorePct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <>
      <div className="flex flex-col gap-10 pb-28">
        {questions.map((q, i) => {
          const picked = answers[i];
          const cardPhase: Phase = submitted ? 'revealed' : 'answering';
          return (
            <section key={q.id} id={`q-${i}`} className="flex flex-col gap-4 scroll-mt-24">
              <QuestionCard question={q} questionNumber={i + 1} totalQuestions={total} />
              <OptionsGrid
                question={q}
                phase={cardPhase}
                pick={picked ?? null}
                focused={-1}
                onPick={(optIdx) => onPick(i, optIdx)}
                onFocus={() => {}}
                reduced={reduced}
              />
              {submitted && (
                <div className="rounded-xl border border-border bg-bg-card p-4 md:p-5">
                  <RevealPanel question={q} pickedIndex={picked ?? -1} />
                </div>
              )}
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

function SummaryScreen({
  results,
  elapsedMs,
  onAgain,
}: {
  results: SessionResult[];
  elapsedMs: number;
  onAgain: () => void;
}) {
  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const attempted = results.filter((r) => r.pickedIndex >= 0).length;
  const accuracyPct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-bg-card p-6 md:p-8">
      <h2 className="font-display text-2xl font-semibold text-text mb-2">Session complete</h2>
      <p className="text-text-dim text-sm mb-6">
        You answered {correct} of {total} correctly in {formatDuration(elapsedMs)}.
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

      <button
        onClick={onAgain}
        className="w-full px-4 py-3 rounded-xl bg-accent text-bg font-mono uppercase tracking-wider text-sm font-semibold hover:shadow-[0_0_24px_-4px_var(--accent)] transition"
      >
        New session
      </button>

      <div className="mt-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim mb-2">
          Question log
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border border-border bg-bg/30 px-2.5 py-1.5 text-[11px] font-mono"
            >
              <span className="text-text-dim w-6 tabular-nums">{i + 1}.</span>
              <span className="flex-1 truncate text-text-dim/90">{r.question.problem.formula}</span>
              <span className={clsx('shrink-0', r.correct ? 'text-correct' : 'text-wrong')}>
                {r.correct ? '✓' : '✕'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <svg width={28} height={28} viewBox="-12 -12 24 24" aria-hidden="true">
      <g
        stroke="var(--accent)"
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <text
          x={0}
          y={4}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={11}
          fill="var(--accent)"
          stroke="none"
        >
          ≈
        </text>
        <circle cx={0} cy={0} r={10} />
      </g>
    </svg>
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

export default ApproximateCalculationPuzzle;
