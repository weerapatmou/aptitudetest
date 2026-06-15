import { useCallback, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import type { Difficulty, DifficultyOrMixed, Puzzle, Settings, SheetResult } from './types';
import { COMMAND_LABEL, DIFFICULTY_LABEL, DISTRACTOR_EXPLANATION } from './types';
import { DifficultyBadge } from './DifficultyBadge';
import { CubeFigure } from './CubeFigure';
import { ChoiceCard } from './ChoiceCard';
import { HowToPlay } from './HowToPlay';
import { Legend } from './Legend';
import { generateSession, signatureOf } from './generate';
import { useLocalStorage } from '@/rotation-puzzle/hooks/useLocalStorage';
import { formatDuration, useTimer } from '@/rotation-puzzle/hooks/useTimer';
import { SeedBar, useSeed, type UseSeed } from '@/shared/seed';
import { pickFreshSeed, useSignatureHistory } from '@/shared/coverage';
import { LogoMark } from '@/shared/LogoMark';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
const COUNT_PRESETS = [10, 15, 20, 30] as const;

type Phase = 'setup' | 'sheet' | 'summary';

type Props = { onHome?: () => void };

export function FlipBoxPuzzle({ onHome }: Props = {}) {
  const [settings, setSettings] = useLocalStorage<Settings>('flipBox:settings', {
    count: 15,
    difficulty: 'mixed',
  });
  const history = useSignatureHistory('flipBox:sigHistory', { max: 40 });
  const pickSeed = useCallback(
    () =>
      pickFreshSeed({
        recent: history.recent,
        previewSignatures: (s) =>
          generateSession({ ...settings, count: Math.min(settings.count, 8) }, s).map(signatureOf),
      }).seed,
    [history.recent, settings],
  );
  const seedState = useSeed('flipBox:lastSeed', undefined, { pickSeed });
  const seed = seedState.seed;

  const [phase, setPhase] = useState<Phase>('setup');
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const reduced = useReducedMotion();

  const { elapsed, reset: resetTimer } = useTimer(phase === 'sheet' && !submitted);

  const launch = useCallback(
    (useSeed: number) => {
      seedState.commit(useSeed);
      const pz = generateSession(settings, useSeed);
      setPuzzles(pz);
      history.add(pz.map(signatureOf));
      setAnswers({});
      setSubmitted(false);
      resetTimer();
      setPhase('sheet');
    },
    [settings, resetTimer, seedState, history],
  );

  // A fresh set of brand-new questions (new random seed each time).
  const startSession = useCallback(() => launch(seedState.fresh()), [launch, seedState]);
  // The exact same set again, rebuilt deterministically from the stored seed.
  const replaySet = useCallback(() => launch(seed), [launch, seed]);
  // Reproduce an exact set from a typed/pasted seed.
  const applyTypedSeed = useCallback(() => {
    const n = seedState.applyDraft();
    if (n !== null) launch(n);
  }, [seedState, launch]);

  const selectChoice = useCallback(
    (qIdx: number, choiceIdx: number) => {
      if (submitted) return;
      setAnswers((prev) => ({ ...prev, [qIdx]: prev[qIdx] === choiceIdx ? null : choiceIdx }));
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
        const selected = answers[i] ?? null;
        return { puzzle: p, selected, correct: selected === p.correctIndex };
      }),
    [puzzles, answers],
  );

  const score = results.filter((r) => r.correct).length;
  const total = puzzles.length;
  const answeredCount = useMemo(
    () => Object.values(answers).filter((a) => a !== null && a !== undefined).length,
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
                <div className="group-hover:text-text">Flip Box</div>
                <div className="text-[10px] text-text-dim/70 group-hover:text-accent">← Aptitude Practice</div>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <LogoMark />
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim leading-tight">
                <div>Flip Box</div>
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
          <SetupScreen
            settings={settings}
            onChange={setSettings}
            onStart={startSession}
            seedState={seedState}
            onApplySeed={applyTypedSeed}
            onReplay={replaySet}
          />
        )}
        {phase === 'sheet' && (
          <SheetScreen
            results={results}
            answers={answers}
            submitted={submitted}
            answeredCount={answeredCount}
            score={score}
            total={total}
            seed={seed}
            reduced={!!reduced}
            onSelect={selectChoice}
            onSubmit={submit}
            onEndSession={backToSetup}
            onViewSummary={() => setPhase('summary')}
          />
        )}
        {phase === 'summary' && (
          <SummaryScreen
            results={results}
            elapsedMs={elapsed}
            seed={seed}
            onBack={() => setPhase('sheet')}
            onReplay={replaySet}
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
  seedState,
  onApplySeed,
  onReplay,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onStart: () => void;
  seedState: UseSeed;
  onApplySeed: () => void;
  onReplay: () => void;
}) {
  const difficulties: Array<{ value: DifficultyOrMixed; label: string }> = [
    { value: 'easy', label: 'Easy' },
    { value: 'normal', label: 'Normal' },
    { value: 'hard', label: 'Hard' },
    { value: 'mixed', label: 'Mixed' },
  ];

  const difficultyHint: Record<DifficultyOrMixed, string> = {
    easy: 'Short 3-4 command sequences.',
    normal: '4-5 command sequences.',
    hard: '5-7 command sequences — easy to lose track.',
    mixed: 'Each question independently rolls easy, normal, or hard.',
  };

  return (
    <div className="max-w-xl mx-auto rounded-2xl border border-border bg-bg-card p-6 md:p-8">
      <h2 className="font-display text-2xl font-semibold text-text mb-2">Flip Box</h2>
      <p className="text-text-dim text-sm mb-6 leading-relaxed">
        A cube with a single mark is shown. Apply the rotation commands in order, then pick the choice
        (A–F) showing where the mark ends up. Answer the whole sheet, then submit to reveal everything
        and replay each step.
      </p>

      <div className="space-y-5">
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

        <div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-text-dim mb-2">
            The six commands
          </div>
          <Legend />
        </div>
      </div>

      <div className="mt-6">
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

function CommandList({ puzzle }: { puzzle: Puzzle }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {puzzle.commands.map((cmd, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg/40 px-2 py-1 font-mono text-[11px] text-text"
        >
          <span className="text-text-dim/60 tabular-nums">{i + 1}.</span>
          {COMMAND_LABEL[cmd]}
        </span>
      ))}
    </div>
  );
}

function SheetScreen({
  results,
  answers,
  submitted,
  answeredCount,
  score,
  total,
  seed,
  reduced,
  onSelect,
  onSubmit,
  onEndSession,
  onViewSummary,
}: {
  results: SheetResult[];
  answers: Record<number, number | null>;
  submitted: boolean;
  answeredCount: number;
  score: number;
  total: number;
  seed: number;
  reduced: boolean;
  onSelect: (qIdx: number, choiceIdx: number) => void;
  onSubmit: () => void;
  onEndSession: () => void;
  onViewSummary: () => void;
}) {
  const scorePct = total > 0 ? Math.round((score / total) * 100) : 0;
  const accuracyPct = answeredCount > 0 ? Math.round((score / answeredCount) * 100) : 0;

  return (
    <>
      <div className="mb-6 font-mono text-[11px] uppercase tracking-wider text-text-dim/70">
        Seed <span className="text-text-dim">#{seed}</span>
      </div>
      <div className="flex flex-col gap-12 pb-28">
        {results.map((r, i) => {
          const selected = answers[i] ?? null;
          const vb = r.puzzle.viewBox;
          return (
            <section key={r.puzzle.id} id={`q-${i}`} className="flex flex-col gap-4 scroll-mt-24">
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-xs text-text-dim">
                  Question <span className="text-text">{i + 1}</span> / {total}
                </div>
                {submitted && <DifficultyBadge difficulty={r.puzzle.difficulty} />}
              </div>

              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="relative shrink-0 rounded-2xl border-2 border-accent/40 bg-bg-card p-3 shadow-[0_0_40px_-16px_var(--accent)]">
                  <div className="absolute top-2 left-2 z-10 font-mono text-[11px] tracking-widest text-accent">
                    START
                  </div>
                  <div className="w-28 aspect-square flex items-center justify-center">
                    <CubeFigure
                      placement={r.puzzle.initial}
                      glyph={r.puzzle.glyph}
                      viewBox={vb}
                      className="w-full h-full"
                      ariaLabel="Starting cube"
                    />
                  </div>
                </div>
                <div className="flex-1 rounded-2xl border border-border bg-bg-card/60 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-text-dim mb-2">
                    Apply in order
                  </div>
                  <CommandList puzzle={r.puzzle} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 items-start">
                {r.puzzle.choices.map((choice, ci) => (
                  <ChoiceCard
                    key={`${r.puzzle.id}-${ci}`}
                    choice={choice}
                    glyph={r.puzzle.glyph}
                    letter={LETTERS[ci]!}
                    index={ci}
                    selected={selected === ci}
                    revealed={submitted}
                    viewBox={vb}
                    onSelect={() => onSelect(i, ci)}
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
                Answered <span className="text-text tabular-nums">{answeredCount}</span>
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
  const correctLetter = LETTERS[puzzle.correctIndex];
  const unanswered = selected === null;

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className={clsx('text-sm font-medium', correct ? 'text-correct' : 'text-wrong')}>
          {unanswered ? 'Not answered' : correct ? 'Correct' : 'Incorrect'}
        </div>
        <div className="font-mono text-xs text-text-dim">
          Answer: <span className="text-accent tracking-widest">{correctLetter}</span>
        </div>
      </div>

      {/* Step-by-step replay */}
      <div className="font-mono text-[10px] uppercase tracking-wider text-text-dim mb-2">Replay</div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <ReplayCube label="Start" placement={puzzle.initial} glyph={puzzle.glyph} />
        {puzzle.steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-text-dim/70 max-w-[5.5rem] leading-tight">
              {COMMAND_LABEL[puzzle.commands[i]!]}
            </span>
            <span className="text-text-dim/50">→</span>
            <ReplayCube
              label={i === puzzle.steps.length - 1 ? 'Answer' : `${i + 1}`}
              placement={step}
              glyph={puzzle.glyph}
              highlight={i === puzzle.steps.length - 1}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {puzzle.choices.map((c, i) => {
          const picked = selected === i;
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
              <span className="font-semibold mr-1 uppercase">{LETTERS[i]}</span>
              <span className="opacity-90">
                {c.isCorrect
                  ? picked
                    ? '— where the mark ends up ✓'
                    : '— where the mark ends up (you missed it)'
                  : `— ${DISTRACTOR_EXPLANATION[c.kind as Exclude<typeof c.kind, 'correct'>]}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReplayCube({
  label,
  placement,
  glyph,
  highlight,
}: {
  label: string;
  placement: SheetResult['puzzle']['initial'];
  glyph: SheetResult['puzzle']['glyph'];
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={clsx(
          'rounded-lg border bg-bg/40 p-1',
          highlight ? 'border-accent/60' : 'border-border',
        )}
      >
        <CubeFigure placement={placement} glyph={glyph} className="h-14 w-14" ariaLabel={`Step ${label}`} />
      </div>
      <span className="font-mono text-[9px] uppercase tracking-wider text-text-dim">{label}</span>
    </div>
  );
}

// ---- Summary ----

function SummaryScreen({
  results,
  elapsedMs,
  seed,
  onBack,
  onReplay,
  onAgain,
}: {
  results: SheetResult[];
  elapsedMs: number;
  seed: number;
  onBack: () => void;
  onReplay: () => void;
  onAgain: () => void;
}) {
  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const attempted = results.filter((r) => r.selected !== null).length;
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
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent mb-2">Overall</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim mb-1">Accuracy</div>
            <div className="flex items-baseline gap-2">
              <div className="font-display text-4xl text-text tabular-nums">{accuracyPct}%</div>
              <div className="text-text-dim text-sm tabular-nums">{correct}/{attempted}</div>
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim mb-1">Score</div>
            <div className="flex items-baseline gap-2">
              <div className="font-display text-4xl text-text tabular-nums">{scorePct}%</div>
              <div className="text-text-dim text-sm tabular-nums">{correct}/{total}</div>
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

      <div className="mb-6 font-mono text-[11px] uppercase tracking-wider text-text-dim/70">
        Seed <span className="text-text-dim">#{seed}</span>{' '}
        <span className="text-text-dim/50">— replay to retry this exact set</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onBack}
          className="sm:w-auto px-4 py-3 rounded-xl border border-border text-text-dim hover:text-text hover:bg-bg-card-hover font-mono uppercase tracking-wider text-sm transition"
        >
          ← Review answers
        </button>
        <button
          onClick={onReplay}
          className="sm:w-auto px-4 py-3 rounded-xl border border-accent/40 text-accent hover:bg-accent/10 font-mono uppercase tracking-wider text-sm transition"
        >
          ⟳ Replay this set
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


export default FlipBoxPuzzle;
