import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { IntervalMode, Page, Settings, Side } from './types';
import { generatePage } from './generate';
import { makeRng } from './generate/rng';
import { createAudioEngine } from './audio';
import { DotColumn } from './DotColumn';
import { HowToPlay } from './HowToPlay';
import { useLocalStorage } from '../rotation-puzzle/hooks/useLocalStorage';
import { formatDuration, useTimer } from '../rotation-puzzle/hooks/useTimer';
import { LogoMark } from '@/shared/LogoMark';

const CIRCLE_COUNTS = [10, 15, 20];
const LEAD_IN_MS = 700; // pause before the first knock
const FLASH_CORRECT_MS = 320; // brief green flash on a correct tap
const FLASH_WRONG_MS = 550; // brief red flash on a miss (then it clears)

const DEFAULT_SETTINGS: Settings = {
  circlesPerSide: 15,
  intervalMode: 'fixed',
  intervalMs: 2000,
  intervalMinMs: 1500,
  intervalMaxMs: 2500,
  jitterMs: 1000,
  responseMs: 1500,
  swapSides: false,
  muted: false,
};

type Phase = 'idle' | 'running' | 'stopped';

type GameState = {
  page: Page;
  rightIdx: number;
  leftIdx: number;
  turn: Side;
  pageCount: number;
};

type Target = { side: Side; order: number };
type FlashState = { side: Side; order: number; kind: 'correct' | 'wrong' };

function sampleInterval(s: Settings): number {
  let ms: number;
  if (s.intervalMode === 'random') {
    const lo = Math.min(s.intervalMinMs, s.intervalMaxMs);
    const hi = Math.max(s.intervalMinMs, s.intervalMaxMs);
    ms = lo + Math.random() * (hi - lo);
  } else if (s.intervalMode === 'mixed') {
    ms = s.intervalMs + Math.random() * Math.max(0, s.jitterMs);
  } else {
    ms = s.intervalMs;
  }
  return Math.max(500, ms);
}

// Time to tap after a knock before red — never longer than the gap to the next knock.
function responseFor(interval: number, s: Settings): number {
  return Math.max(300, Math.min(s.responseMs, interval - 150));
}

function targetOf(g: GameState): Target {
  return { side: g.turn, order: g.turn === 'right' ? g.rightIdx : g.leftIdx };
}

function advance(g: GameState, side: Side): GameState {
  return {
    ...g,
    turn: g.turn === 'right' ? 'left' : 'right',
    rightIdx: side === 'right' ? g.rightIdx + 1 : g.rightIdx,
    leftIdx: side === 'left' ? g.leftIdx + 1 : g.leftIdx,
  };
}

function pageComplete(g: GameState): boolean {
  const n = g.page.right.length;
  return g.rightIdx >= n && g.leftIdx >= n;
}

type Props = {
  onHome?: () => void;
};

export function DotWalkingTest({ onHome }: Props = {}) {
  const [rawSettings, setSettings] = useLocalStorage<Settings>('dotWalk:settings', DEFAULT_SETTINGS);
  const settings: Settings = { ...DEFAULT_SETTINGS, ...rawSettings };
  const [score, setScore] = useLocalStorage('dotWalk:score', { correct: 0, total: 0 });

  const [game, setGameState] = useState<GameState | null>(null);
  const [phase, setPhaseState] = useState<Phase>('idle');
  const [armed, setArmed] = useState(false);
  const [flash, setFlash] = useState<FlashState | null>(null);
  const [session, setSession] = useState({ green: 0, red: 0, pages: 0 });
  const [swapFlash, setSwapFlash] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const gameRef = useRef<GameState | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const settingsRef = useRef(settings);
  const windowOpenRef = useRef(false);
  const beatRef = useRef<number | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const swapTimerRef = useRef<number | null>(null);
  const onBeatRef = useRef<() => void>(() => {});
  const onDeadlineRef = useRef<() => void>(() => {});
  const audioRef = useRef(createAudioEngine(() => settingsRef.current.muted));

  settingsRef.current = settings;

  const timerRunning = phase === 'running';
  const { elapsed, reset: resetTimer } = useTimer(timerRunning);

  const commit = (g: GameState | null) => {
    gameRef.current = g;
    setGameState(g);
  };
  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const openWindow = (open: boolean) => {
    windowOpenRef.current = open;
    setArmed(open);
  };
  const clearBeat = () => {
    if (beatRef.current !== null) {
      clearTimeout(beatRef.current);
      beatRef.current = null;
    }
  };
  const clearDeadline = () => {
    if (deadlineRef.current !== null) {
      clearTimeout(deadlineRef.current);
      deadlineRef.current = null;
    }
  };
  const clearTimers = () => {
    clearBeat();
    clearDeadline();
  };

  const registerResult = (correct: boolean) => {
    setSession((s) => ({ ...s, green: s.green + (correct ? 1 : 0), red: s.red + (correct ? 0 : 1) }));
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
  };

  const showFlash = (t: Target, kind: 'correct' | 'wrong') => {
    setFlash({ ...t, kind });
    if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
    const dur = kind === 'wrong' ? FLASH_WRONG_MS : FLASH_CORRECT_MS;
    flashTimerRef.current = window.setTimeout(() => setFlash(null), dur);
  };

  const buildPage = (pageCount: number): GameState => {
    const s = settingsRef.current;
    const n = s.circlesPerSide;
    const page = generatePage(n, makeRng((Date.now() * 2654435761) >>> 0));
    // First page always leads with the right hand; later pages may swap.
    const turn: Side = pageCount > 1 && s.swapSides && Math.random() < 0.5 ? 'left' : 'right';
    return { page, rightIdx: 0, leftIdx: 0, turn, pageCount };
  };

  const flashSwap = () => {
    setSwapFlash(true);
    if (swapTimerRef.current !== null) clearTimeout(swapTimerRef.current);
    swapTimerRef.current = window.setTimeout(() => setSwapFlash(false), 1600);
  };

  const beginNewPage = (pageCount: number): GameState => {
    const g = buildPage(pageCount);
    setSession((s) => ({ ...s, pages: s.pages + 1 }));
    if (g.turn === 'left') flashSwap();
    return g;
  };

  const armBeat = (delay: number) => {
    clearBeat();
    beatRef.current = window.setTimeout(() => onBeatRef.current(), delay);
  };

  // A knock sounds → open the tap window and schedule the next knock (steady).
  const onBeat = () => {
    if (phaseRef.current !== 'running') return;
    if (!gameRef.current) return;
    audioRef.current.beep();
    openWindow(true);
    const iv = sampleInterval(settingsRef.current);
    const resp = responseFor(iv, settingsRef.current);
    clearBeat();
    beatRef.current = window.setTimeout(() => onBeatRef.current(), iv);
    clearDeadline();
    deadlineRef.current = window.setTimeout(() => onDeadlineRef.current(), resp);
  };

  // No tap within the window → red flash on the target, then the next knock re-cues it.
  const onDeadline = () => {
    if (phaseRef.current !== 'running' || !windowOpenRef.current) return;
    const g = gameRef.current;
    if (!g) return;
    deadlineRef.current = null;
    showFlash(targetOf(g), 'wrong');
    registerResult(false);
    audioRef.current.warn();
    openWindow(false);
    // The already-scheduled next knock re-cues the same target (no advance).
  };

  onBeatRef.current = onBeat;
  onDeadlineRef.current = onDeadline;

  const fail = (g: GameState) => {
    clearDeadline();
    openWindow(false);
    showFlash(targetOf(g), 'wrong'); // brief red on where it should have been
    registerResult(false);
    audioRef.current.warn();
    // Keep the pending knock → same target is re-cued next beat (no advance).
  };

  const handleTap = (side: Side, order: number) => {
    if (phaseRef.current !== 'running') return;
    if (!windowOpenRef.current) return; // must wait for the knock
    const g = gameRef.current;
    if (!g) return;
    const target = targetOf(g);

    if (side === target.side && order === target.order) {
      // Correct — score green, flash briefly (no lasting colour), move on.
      clearDeadline();
      openWindow(false);
      registerResult(true);
      showFlash(target, 'correct');
      let next = advance(g, target.side);
      if (pageComplete(next)) next = beginNewPage(next.pageCount + 1);
      commit(next);
      // The pending knock cues the next target.
    } else {
      fail(g);
    }
  };

  const handleTapEmpty = (_side: Side) => {
    if (phaseRef.current !== 'running' || !windowOpenRef.current) return;
    const g = gameRef.current;
    if (!g) return;
    fail(g);
  };

  const start = () => {
    audioRef.current.resume(); // unlock audio on the Start gesture (iOS)
    const g = buildPage(1);
    setSession({ green: 0, red: 0, pages: 1 });
    setSwapFlash(false);
    setFlash(null);
    resetTimer();
    openWindow(false);
    commit(g);
    setPhase('running');
    armBeat(LEAD_IN_MS);
  };

  const stop = () => {
    clearTimers();
    openWindow(false);
    setPhase('stopped');
  };

  // Cleanup on unmount.
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (beatRef.current !== null) clearTimeout(beatRef.current);
      if (deadlineRef.current !== null) clearTimeout(deadlineRef.current);
      if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
      if (swapTimerRef.current !== null) clearTimeout(swapTimerRef.current);
      audio.close();
    };
  }, []);

  const handleHome = () => {
    clearTimers();
    onHome?.();
  };

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  const red = score.total - score.correct;

  const turn = game?.turn ?? 'right';
  const inPlay = phase === 'running';

  return (
    <div className="h-[100dvh] flex flex-col bg-instrument overflow-hidden">
      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}

      {/* Header */}
      <header className="shrink-0 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-4">
          <button
            onClick={handleHome}
            aria-label="Back to home"
            className="group flex items-center gap-3 rounded-md px-1 -mx-1 hover:bg-bg-card-hover transition"
          >
            <LogoMark />
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim leading-tight text-left">
              <div className="group-hover:text-text">เดินจุด · Dot Walking</div>
              <div className="text-[10px] text-text-dim/70 group-hover:text-accent">← Aptitude Practice</div>
            </div>
          </button>

          <div className="ml-auto flex items-center gap-3 md:gap-4 font-mono text-xs">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-bg-card">
              <span className="inline-flex items-center gap-1 text-correct tabular-nums">
                <span className="w-2 h-2 rounded-full bg-correct" />
                {score.correct}
              </span>
              <span className="text-text-dim/40">·</span>
              <span className="inline-flex items-center gap-1 text-wrong tabular-nums">
                <span className="w-2 h-2 rounded-full bg-wrong" />
                {red}
              </span>
              <span className="text-text-dim/40">·</span>
              <span className="text-accent tabular-nums">{accuracy}%</span>
              <button
                onClick={() => {
                  if (score.total === 0) return;
                  if (typeof window !== 'undefined' && !window.confirm('Reset score to 0/0?')) return;
                  setScore({ correct: 0, total: 0 });
                }}
                disabled={score.total === 0}
                aria-label="Reset score"
                title="Reset score"
                className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded text-text-dim/70 hover:text-wrong hover:bg-wrong/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4v5h5" />
                </svg>
              </button>
            </div>
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

      {phase === 'idle' && <SetupPanel settings={settings} setSettings={setSettings} onStart={start} />}

      {phase === 'stopped' && (
        <SummaryPanel session={session} elapsed={elapsed} onStart={start} onHome={handleHome} />
      )}

      {inPlay && game && (
        <>
          {/* Turn / control strip */}
          <div className="shrink-0 border-b border-border bg-bg/60">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-2 flex items-center gap-3">
              <div className="font-mono text-[11px] uppercase tracking-wider text-text-dim">
                Page <span className="text-text">#{game.pageCount}</span>
              </div>
              {swapFlash && (
                <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-1 rounded-md bg-accent-warm/20 text-accent-warm">
                  🔀 สลับฝั่ง
                </span>
              )}
              <div
                className={clsx(
                  'font-mono text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-md transition-colors',
                  armed ? 'bg-accent/15 text-accent' : 'bg-bg-card text-text-dim',
                )}
                aria-live="polite"
              >
                {!armed ? 'รอเสียงเคาะ…' : turn === 'right' ? 'แตะ · ขวา' : 'แตะ · ซ้าย'}
              </div>
              <div className="ml-auto flex items-center gap-3 font-mono text-xs">
                <span className="text-correct tabular-nums">{session.green}</span>
                <span className="text-text-dim/40">/</span>
                <span className="text-wrong tabular-nums">{session.red}</span>
                <button
                  onClick={() => setSettings({ ...settings, muted: !settings.muted })}
                  aria-label={settings.muted ? 'Unmute' : 'Mute'}
                  className="px-2 py-1 rounded-md border border-border bg-bg-card text-text-dim hover:text-text transition"
                >
                  {settings.muted ? '🔇' : '🔊'}
                </button>
                <button
                  onClick={stop}
                  className="px-3 py-1 rounded-md border border-wrong/40 text-wrong hover:bg-wrong/10 transition uppercase tracking-wider"
                >
                  Stop
                </button>
              </div>
            </div>
          </div>

          {/* Two columns — left dashed, right solid */}
          <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-3 md:px-8 py-3 flex gap-3 md:gap-6">
            <DotColumn
              side="left"
              label="ซ้าย · Left"
              dashed
              circles={game.page.left}
              isActiveSide={turn === 'left'}
              flash={flash?.side === 'left' ? { order: flash.order, kind: flash.kind } : null}
              onTap={handleTap}
              onTapEmpty={handleTapEmpty}
            />
            <DotColumn
              side="right"
              label="ขวา · Right"
              dashed={false}
              circles={game.page.right}
              isActiveSide={turn === 'right'}
              flash={flash?.side === 'right' ? { order: flash.order, kind: flash.kind } : null}
              onTap={handleTap}
              onTapEmpty={handleTapEmpty}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Setup panel ──────────────────────────────────────────────────────────────

function SetupPanel({
  settings,
  setSettings,
  onStart,
}: {
  settings: Settings;
  setSettings: (v: Settings | ((p: Settings) => Settings)) => void;
  onStart: () => void;
}) {
  const [countDraft, setCountDraft] = useState(String(settings.circlesPerSide));

  const applyCount = (raw: string) => {
    const n = Math.max(3, Math.min(40, parseInt(raw, 10) || settings.circlesPerSide));
    setCountDraft(String(n));
    setSettings({ ...settings, circlesPerSide: n });
  };

  const modes: { id: IntervalMode; label: string }[] = [
    { id: 'fixed', label: 'คงที่' },
    { id: 'random', label: 'สุ่ม' },
    { id: 'mixed', label: 'คงที่+สุ่ม' },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="max-w-lg mx-auto px-4 py-8 md:py-12 space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-text mb-2">เดินจุด</h1>
          <p className="text-text-dim text-sm">
            ฝึก multitask สองมือ — รอเสียงเคาะแล้วแตะจุดตามลำดับให้ทัน เริ่มขวาก่อนแล้วสลับซ้าย
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-5">
          {/* Circles per side */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-text-dim/70 mb-2">วงกลมต่อฝั่ง</div>
            <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-bg p-1">
              {CIRCLE_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setCountDraft(String(n));
                    setSettings({ ...settings, circlesPerSide: n });
                  }}
                  className={clsx(
                    'rounded-lg px-3 py-1 font-mono text-xs transition',
                    n === settings.circlesPerSide
                      ? 'bg-accent text-bg shadow-[0_0_12px_-2px_var(--accent)]'
                      : 'text-text-dim hover:text-text hover:bg-bg-card-hover',
                  )}
                >
                  {n}
                </button>
              ))}
              <input
                type="number"
                min={3}
                max={40}
                value={countDraft}
                onChange={(e) => setCountDraft(e.target.value)}
                onBlur={(e) => applyCount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyCount((e.target as HTMLInputElement).value);
                }}
                className="w-[4ch] rounded-lg bg-transparent px-1 py-1 font-mono text-xs text-text-dim text-center outline-none hover:bg-bg-card-hover focus:bg-bg-card-hover focus:text-text transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Custom circle count"
              />
            </div>
          </div>

          {/* Tempo mode */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-text-dim/70 mb-2">จังหวะเสียงเคาะ</div>
            <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-bg p-1">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSettings({ ...settings, intervalMode: m.id })}
                  className={clsx(
                    'rounded-lg px-3 py-1 font-mono text-xs transition',
                    m.id === settings.intervalMode
                      ? 'bg-accent text-bg shadow-[0_0_12px_-2px_var(--accent)]'
                      : 'text-text-dim hover:text-text hover:bg-bg-card-hover',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Knock interval per mode */}
          <div className="space-y-3">
            {settings.intervalMode === 'fixed' && (
              <SecondsField
                label="เคาะทุก ๆ (วินาที)"
                ms={settings.intervalMs}
                onChange={(ms) => setSettings({ ...settings, intervalMs: ms })}
              />
            )}
            {settings.intervalMode === 'random' && (
              <div className="flex gap-3">
                <SecondsField
                  label="เคาะถี่สุด (วิ)"
                  ms={settings.intervalMinMs}
                  onChange={(ms) => setSettings({ ...settings, intervalMinMs: ms })}
                />
                <SecondsField
                  label="เคาะห่างสุด (วิ)"
                  ms={settings.intervalMaxMs}
                  onChange={(ms) => setSettings({ ...settings, intervalMaxMs: ms })}
                />
              </div>
            )}
            {settings.intervalMode === 'mixed' && (
              <div className="flex gap-3">
                <SecondsField
                  label="ฐาน (วิ)"
                  ms={settings.intervalMs}
                  onChange={(ms) => setSettings({ ...settings, intervalMs: ms })}
                />
                <SecondsField
                  label="สุ่มเพิ่ม สูงสุด (วิ)"
                  ms={settings.jitterMs}
                  onChange={(ms) => setSettings({ ...settings, jitterMs: ms })}
                />
              </div>
            )}
            <SecondsField
              label="กดภายในหลังเคาะ (วิ) — เกินขึ้นแดง"
              ms={settings.responseMs}
              onChange={(ms) => setSettings({ ...settings, responseMs: ms })}
            />
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-3 pt-1">
            <Toggle
              label="สุ่มสลับฝั่งเริ่มเมื่อขึ้นหน้าใหม่ (ไขว่ซ้าย-ขวา)"
              checked={settings.swapSides}
              onChange={(v) => setSettings({ ...settings, swapSides: v })}
            />
            <Toggle
              label="เปิดเสียง"
              checked={!settings.muted}
              onChange={(v) => setSettings({ ...settings, muted: !v })}
            />
          </div>
        </div>

        <button
          onClick={onStart}
          className="w-full py-3 rounded-xl bg-accent text-bg font-mono text-sm uppercase tracking-[0.2em] hover:shadow-[0_0_28px_-4px_var(--accent)] transition"
        >
          เริ่ม ▶
        </button>
      </div>
    </div>
  );
}

function SecondsField({
  label,
  ms,
  onChange,
}: {
  label: string;
  ms: number;
  onChange: (ms: number) => void;
}) {
  const [draft, setDraft] = useState((ms / 1000).toFixed(1));
  useEffect(() => {
    setDraft((ms / 1000).toFixed(1));
  }, [ms]);
  const apply = (raw: string) => {
    const sec = Math.max(0, Math.min(10, parseFloat(raw) || 0));
    onChange(Math.round(sec * 1000));
  };
  return (
    <label className="flex-1 block">
      <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim/70">{label}</span>
      <input
        type="number"
        min={0}
        max={10}
        step={0.1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => apply(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') apply((e.target as HTMLInputElement).value);
        }}
        className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-text outline-none focus:border-accent transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className="inline-flex items-center gap-2 font-mono text-xs text-text-dim hover:text-text transition text-left"
    >
      <span
        className={clsx(
          'shrink-0 w-9 h-5 rounded-full p-0.5 transition-colors',
          checked ? 'bg-accent' : 'bg-border-strong',
        )}
      >
        <span
          className={clsx(
            'block w-4 h-4 rounded-full bg-bg transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </span>
      {label}
    </button>
  );
}

// ─── Summary panel ────────────────────────────────────────────────────────────

function SummaryPanel({
  session,
  elapsed,
  onStart,
  onHome,
}: {
  session: { green: number; red: number; pages: number };
  elapsed: number;
  onStart: () => void;
  onHome: () => void;
}) {
  const total = session.green + session.red;
  const acc = total > 0 ? Math.round((session.green / total) * 100) : 0;
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="max-w-md mx-auto px-4 py-12 space-y-6">
        <h1 className="font-display text-2xl font-semibold text-text text-center">สรุปผล</h1>
        <div className="rounded-2xl border border-border bg-bg-card p-6 grid grid-cols-2 gap-4">
          <Stat label="ถูก (เขียว)" value={session.green} tone="text-correct" />
          <Stat label="ผิด (แดง)" value={session.red} tone="text-wrong" />
          <Stat label="ความแม่นยำ" value={`${acc}%`} tone="text-accent" />
          <Stat label="เวลา" value={formatDuration(elapsed)} tone="text-text" />
          <Stat label="หน้า" value={session.pages} tone="text-text" />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onHome}
            className="flex-1 py-2.5 rounded-xl border border-border text-text-dim hover:text-text hover:bg-bg-card-hover font-mono text-xs uppercase tracking-wider transition"
          >
            หน้าแรก
          </button>
          <button
            onClick={onStart}
            className="flex-1 py-2.5 rounded-xl bg-accent text-bg font-mono text-xs uppercase tracking-wider hover:shadow-[0_0_24px_-4px_var(--accent)] transition"
          >
            เริ่มใหม่ ▶
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <span className={clsx('font-display text-2xl font-semibold tabular-nums', tone)}>{value}</span>
      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-dim">{label}</span>
    </div>
  );
}

export default DotWalkingTest;
