import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import type { Candidate, Difficulty, Puzzle, RotationSettings, SessionResult } from './types';
import { Figure, FigurePatternsDefs } from './Figure';
import { Reveal } from './Reveal';
import { DifficultyChips } from './DifficultyChips';
import { HowToPlay } from './HowToPlay';
import { generateSession, signatureOf } from './generate';
import { isPureRotationOf } from './validation';
import { useLocalStorage } from './hooks/useLocalStorage';
import { formatDuration, useTimer } from './hooks/useTimer';
import { SeedBar, useSeed, type UseSeed } from '@/shared/seed';
import { pickFreshSeed, useSignatureHistory } from '@/shared/coverage';
import { LogoMark } from '@/shared/LogoMark';
import { exportRotationPdf } from './exportPdf';

const LETTERS = ['A', 'B', 'C', 'D'] as const;

type Phase = 'setup' | 'answering' | 'revealed' | 'sheet' | 'summary';

type Props = {
  difficulty?: Difficulty;
  onHome?: () => void;
};

export function RotationPuzzle({ difficulty: difficultyProp, onHome }: Props = {}) {
  const [settings, setSettings] = useLocalStorage<RotationSettings>('rotation:settings', {
    count: 10,
    difficulty: difficultyProp ?? 'medium',
    mode: 'sheet',
  });

  // Normalize mode for old entries that lack the field
  const mode = settings.mode ?? 'sheet';

  const [showReveal, setShowReveal] = useLocalStorage('rotation:showReveal', true);
  const [showHelp, setShowHelp] = useState(false);

  const history = useSignatureHistory('rotation:sigHistory', { max: 150 });

  const pickSeed = useCallback(
    () =>
      pickFreshSeed({
        recent: history.recent,
        previewSignatures: (s) =>
          generateSession({ ...settings, count: Math.min(settings.count, 8) }, s).map(signatureOf),
      }).seed,
    [history.recent, settings],
  );

  const seedState = useSeed('rotation:lastSeed', undefined, { pickSeed });
  const seed = seedState.seed;

  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<Puzzle[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [focused, setFocused] = useState(0);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [sheetSubmitted, setSheetSubmitted] = useState(false);
  const reduced = useReducedMotion();

  const timerRunning =
    phase === 'answering' ||
    phase === 'revealed' ||
    (phase === 'sheet' && !sheetSubmitted);
  const { elapsed, reset: resetTimer } = useTimer(timerRunning);

  const current = questions[currentIdx] ?? null;

  const launch = useCallback(
    (useSeedVal: number) => {
      seedState.commit(useSeedVal);
      const generated = generateSession(settings, useSeedVal);
      setQuestions(generated);
      history.add(generated.map(signatureOf));
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
    },
    [settings, mode, resetTimer, seedState, history],
  );

  const startSession = useCallback(() => launch(seedState.fresh()), [launch, seedState]);
  const replaySet = useCallback(() => launch(seed), [launch, seed]);
  const applyTypedSeed = useCallback(() => {
    const n = seedState.applyDraft();
    if (n !== null) launch(n);
  }, [seedState, launch]);

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
      if (picked === undefined) return { puzzle: q, pickedIndex: -1, correct: false };
      return { puzzle: q, pickedIndex: picked, correct: isPureRotationOf(q.original, q.candidates[picked]!) };
    });
    setResults(computed);
    setSheetSubmitted(true);
  }, [questions, answers, sheetSubmitted]);

  const handlePick = useCallback(
    (idx: number) => {
      if (!current || phase !== 'answering') return;
      const pickIsCorrect = isPureRotationOf(current.original, current.candidates[idx]!);
      setPick(idx);
      setPhase('revealed');
      setResults((prev) => [...prev, { puzzle: current, pickedIndex: idx, correct: pickIsCorrect }]);
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

  // Keyboard nav for sequential mode
  useEffect(() => {
    if (phase !== 'answering' && phase !== 'revealed') return;
    if (showHelp) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'n' || e.key === 'N') {
        if (phase === 'revealed') { e.preventDefault(); nextQuestion(); }
        return;
      }
      if (
        e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' || e.key === 'ArrowDown'
      ) {
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
        e.preventDefault();
        if (phase === 'answering') handlePick(focused);
        else if (phase === 'revealed') nextQuestion();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, focused, handlePick, nextQuestion, showHelp]);

  const sessionScore = useMemo(() => results.filter((r) => r.correct).length, [results]);
  const sessionAccuracy =
    results.length > 0 ? Math.round((sessionScore / results.length) * 100) : 0;

  const showScore =
    phase === 'answering' || phase === 'revealed' || (phase === 'sheet' && sheetSubmitted);
  const showTimer = phase === 'answering' || phase === 'revealed' || phase === 'sheet';

  const correctness = current
    ? current.candidates.map((c) => isPureRotationOf(current.original, c))
    : [];

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
          {(phase === 'answering' || phase === 'revealed') && (
            <div className="hidden md:flex items-center gap-2 ml-4 font-mono text-xs text-text-dim">
              <span className="text-text-dim/70">Q</span>
              <span className="text-text font-medium">
                {currentIdx + 1}
                <span className="text-text-dim/60">/{questions.length}</span>
              </span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-3 md:gap-5 font-mono text-xs">
            {showScore && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-bg-card">
                <span className="text-text-dim/70">SCORE</span>
                <span className="text-text tabular-nums">
                  {sessionScore}
                  <span className="text-text-dim/60">/{results.length}</span>
                </span>
                {results.length > 0 && (
                  <>
                    <span className="text-text-dim/40">·</span>
                    <span className="text-accent tabular-nums">{sessionAccuracy}%</span>
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

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
        {phase === 'setup' && (
          <SetupScreen
            settings={settings}
            onChange={setSettings}
            onStart={startSession}
            seedState={seedState}
            onApplySeed={applyTypedSeed}
            onReplay={replaySet}
          />
        )}

        {(phase === 'answering' || phase === 'revealed') && current && (
          <div className="flex flex-col items-center gap-6">
            <section aria-label="Original figure" className="flex justify-center">
              <OriginalCard puzzle={current} phase={phase} showReveal={showReveal} />
            </section>

            <section aria-label="Candidate options" className="w-full">
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
                {current.candidates.map((c, i) => (
                  <CandidateCard
                    key={`${currentIdx}-${i}`}
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

              <div className="mt-6 mx-auto max-w-4xl">
                <AnimatePresence mode="wait">
                  {phase === 'revealed' && current && pick !== null && (
                    <motion.div
                      key={currentIdx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={reduced ? { duration: 0 } : { duration: 0.25 }}
                      className="rounded-xl border border-border bg-bg-card p-4 md:p-5"
                    >
                      <RevealSummary puzzle={current} pick={pick} correctness={correctness} />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={backToSetup}
                      className="px-3 py-2 rounded-lg font-mono uppercase tracking-wider text-[11px] text-text-dim hover:text-text hover:bg-bg-card-hover border border-border"
                    >
                      ← End session
                    </button>
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
                  <div className="flex items-center gap-2">
                    {phase === 'revealed' && (
                      <button
                        onClick={() => exportRotationPdf(questions)}
                        className="px-4 py-2 rounded-lg font-mono uppercase tracking-wider text-xs border border-accent/40 text-accent hover:bg-accent/10 transition"
                      >
                        Export PDF
                      </button>
                    )}
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
              </div>
            </section>
          </div>
        )}

        {phase === 'sheet' && (
          <SheetScreen
            questions={questions}
            answers={answers}
            submitted={sheetSubmitted}
            seed={seed}
            reduced={!!reduced}
            showReveal={showReveal}
            onSetShowReveal={setShowReveal}
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
            seed={seed}
            onReplay={replaySet}
            onAgain={backToSetup}
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
  seedState,
  onApplySeed,
  onReplay,
}: {
  settings: RotationSettings;
  onChange: (s: RotationSettings) => void;
  onStart: () => void;
  seedState: UseSeed;
  onApplySeed: () => void;
  onReplay: () => void;
}) {
  const modes: Array<{ value: 'sequential' | 'sheet'; label: string; hint: string }> = [
    { value: 'sequential', label: 'One at a time', hint: 'Answer → instant feedback → next.' },
    {
      value: 'sheet',
      label: 'Practice sheet',
      hint: 'All questions on one page — answer in any order, then submit to reveal everything.',
    },
  ];
  const activeMode = settings.mode ?? 'sheet';

  return (
    <div className="max-w-xl mx-auto rounded-2xl border border-border bg-bg-card p-6 md:p-8">
      <h2 className="font-display text-2xl font-semibold text-text mb-2">Rotation Test</h2>
      <p className="text-text-dim text-sm mb-6 leading-relaxed">
        Pick the option that shows the original figure rotated — not mirrored, not altered.
        Difficulty controls the rotation angle and distractor types.
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
            Difficulty
          </label>
          <DifficultyChips
            value={settings.difficulty}
            onChange={(d) => onChange({ ...settings, difficulty: d })}
          />
        </div>

        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider text-text-dim mb-2">
            Questions
          </label>
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-bg p-1.5">
            {([5, 10, 20] as const).map((c) => {
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
                max={50}
                value={settings.count}
                onChange={(e) =>
                  onChange({ ...settings, count: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })
                }
                className="w-14 px-2 py-1 rounded-md border border-border bg-bg-card text-text font-mono text-xs tabular-nums focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider text-text-dim mb-2">
            Seed{' '}
            <span className="text-text-dim/50 normal-case tracking-normal">
              — paste one to replay an exact set
            </span>
          </label>
          <SeedBar
            seed={seedState.seed}
            draft={seedState.draft}
            draftValid={seedState.draftValid}
            onDraftChange={seedState.setDraft}
            onApply={onApplySeed}
            onNew={onStart}
            onReplay={onReplay}
          />
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

function SheetScreen({
  questions,
  answers,
  submitted,
  seed,
  reduced,
  showReveal,
  onSetShowReveal,
  onPick,
  onSubmit,
  onEndSession,
  onViewSummary,
}: {
  questions: Puzzle[];
  answers: Record<number, number>;
  submitted: boolean;
  seed: number;
  reduced: boolean;
  showReveal: boolean;
  onSetShowReveal: (v: boolean) => void;
  onPick: (qIdx: number, optIdx: number) => void;
  onSubmit: () => void;
  onEndSession: () => void;
  onViewSummary: () => void;
}) {
  const answeredCount = Object.keys(answers).length;
  const total = questions.length;
  const score = questions.reduce((acc, q, i) => {
    const picked = answers[i];
    return acc + (picked !== undefined && isPureRotationOf(q.original, q.candidates[picked]!) ? 1 : 0);
  }, 0);
  const scorePct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <>
      <div className="mb-6 font-mono text-[11px] uppercase tracking-wider text-text-dim/70">
        Seed <span className="text-text-dim">#{seed}</span>
      </div>
      <div className="flex flex-col gap-12 pb-28">
        {questions.map((q, i) => {
          const picked = answers[i];
          const cardPhase: 'answering' | 'revealed' = submitted ? 'revealed' : 'answering';
          const qCorrectness = q.candidates.map((c) => isPureRotationOf(q.original, c));
          return (
            <section
              key={i}
              id={`q-${i}`}
              data-pdf-q={i}
              className="flex flex-col items-center gap-6 scroll-mt-24"
            >
              <div className="w-full font-mono text-[11px] uppercase tracking-wider text-text-dim/70">
                Q{i + 1} <span className="text-text-dim/40">of {total}</span>
              </div>
              <OriginalCard
                puzzle={q}
                phase={cardPhase}
                showReveal={submitted && showReveal}
              />
              <div className="w-full">
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
                  {q.candidates.map((c, j) => (
                    <CandidateCard
                      key={`sheet-${i}-${j}`}
                      candidate={c}
                      letter={LETTERS[j]!}
                      index={j}
                      focused={false}
                      selected={picked === j}
                      isCorrect={qCorrectness[j] === true}
                      phase={cardPhase}
                      onPick={() => onPick(i, j)}
                      onFocus={() => {}}
                      reduced={reduced}
                    />
                  ))}
                </div>
                {submitted && (
                  <div className="mt-4 mx-auto max-w-4xl rounded-xl border border-border bg-bg-card p-4 md:p-5">
                    <RevealSummary puzzle={q} pick={picked ?? -1} correctness={qCorrectness} />
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-border bg-bg/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onEndSession}
              className="px-3 py-2 rounded-lg font-mono uppercase tracking-wider text-[11px] text-text-dim hover:text-text hover:bg-bg-card-hover border border-border"
            >
              {submitted ? '← New session' : '← End session'}
            </button>
            <button
              onClick={() => exportRotationPdf(questions)}
              disabled={questions.length === 0}
              className="px-4 py-2 rounded-lg font-mono uppercase tracking-wider text-xs border border-accent/40 text-accent hover:bg-accent/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Export PDF
            </button>
            {submitted && (
              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-text-dim font-mono uppercase tracking-wider ml-1">
                <input
                  type="checkbox"
                  checked={showReveal}
                  onChange={(e) => onSetShowReveal(e.target.checked)}
                  className="accent-accent"
                />
                Show rotation
              </label>
            )}
          </div>
          {submitted ? (
            <>
              <div className="font-mono text-xs text-text-dim flex items-center gap-2">
                Score{' '}
                <span className="text-text tabular-nums">
                  {score}
                  <span className="text-text-dim/60">/{total}</span>
                </span>
                <span className="text-text-dim/40">·</span>
                <span className="text-accent tabular-nums">{scorePct}%</span>
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
  seed,
  onReplay,
  onAgain,
}: {
  results: SessionResult[];
  elapsedMs: number;
  seed: number;
  onReplay: () => void;
  onAgain: () => void;
}) {
  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="max-w-xl mx-auto rounded-2xl border border-border bg-bg-card p-6 md:p-8">
      <h2 className="font-display text-2xl font-semibold text-text mb-1">Session complete</h2>
      <p className="text-text-dim text-sm mb-6">Seed #{seed}</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-bg p-3 text-center">
          <div className="font-mono text-2xl font-semibold text-text tabular-nums">
            {correct}/{total}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-text-dim mt-1">Score</div>
        </div>
        <div className="rounded-xl border border-border bg-bg p-3 text-center">
          <div className="font-mono text-2xl font-semibold text-accent tabular-nums">{accuracy}%</div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-text-dim mt-1">Accuracy</div>
        </div>
        <div className="rounded-xl border border-border bg-bg p-3 text-center">
          <div className="font-mono text-lg font-semibold text-text tabular-nums">
            {formatDuration(elapsedMs)}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-text-dim mt-1">Time</div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onReplay}
          className="flex-1 px-4 py-2.5 rounded-xl font-mono uppercase tracking-wider text-xs border border-border text-text-dim hover:text-text hover:bg-bg-card-hover transition"
        >
          Replay same set
        </button>
        <button
          onClick={onAgain}
          className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-bg font-mono uppercase tracking-wider text-xs hover:shadow-[0_0_24px_-4px_var(--accent)] transition"
        >
          New session →
        </button>
      </div>
    </div>
  );
}

function OriginalCard({
  puzzle,
  phase,
  showReveal,
}: {
  puzzle: Puzzle;
  phase: 'answering' | 'revealed';
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
  phase: 'answering' | 'revealed';
  onPick: () => void;
  onFocus: () => void;
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
      transition={reduced ? { duration: 0 } : { delay: index * 0.06, duration: 0.25 }}
      whileTap={revealed || reduced ? undefined : { scale: 0.98 }}
      aria-label={`Option ${letter}: figure`}
      className={clsx(
        'group relative rounded-2xl border bg-bg-card p-4 transition-colors text-text card-focus-ring w-full',
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
      <div className="absolute top-2 left-2 z-10 font-mono text-[10px] tracking-widest text-text-dim group-hover:text-accent">
        {letter}
      </div>
      {revealed && (
        <div className="absolute top-2 right-2 z-10">
          {isCorrect ? <CheckIcon /> : selected ? <XIcon /> : null}
        </div>
      )}
      <div
        className="flex items-center justify-center mt-5 mx-auto"
        style={{ width: '100%', maxWidth: 'var(--svg-slot)', aspectRatio: '1' }}
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
            'absolute font-mono text-[10px] tracking-wide',
            isCorrect ? 'text-correct' : 'text-wrong',
          )}
          style={{ bottom: 6, left: 6 }}
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
  const correct = pick >= 0 && correctness[pick] === true;
  const correctIdx = correctness.indexOf(true);
  const correctLetter = LETTERS[correctIdx >= 0 ? correctIdx : puzzle.correctIndex];
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className={clsx('text-sm font-medium', correct ? 'text-correct' : 'text-wrong')}>
          {pick < 0 ? 'Not answered' : correct ? 'Correct' : 'Incorrect'}
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
                isC
                  ? 'border-correct/30 bg-correct/5 text-correct'
                  : 'border-border bg-bg/30 text-text-dim',
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
