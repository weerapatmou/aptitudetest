import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import type { Puzzle } from './types';
import { Block3DViewer } from './Block3DViewer';
import { canonicalForm } from './generate/polycube';
import { sharedViewBox3D } from './generate/render3d';

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

type Props = {
  puzzle: Puzzle | null;
  onClose: () => void;
};

/**
 * A modal that lets the solver orbit the reference and a chosen block in sync to
 * confirm the answer. Drag to rotate, nudge 90° with the buttons, or auto-spin.
 */
export function BlockInspector({ puzzle, onClose }: Props) {
  const reduced = useReducedMotion();
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [autoSpin, setAutoSpin] = useState(false);
  const [rightIndex, setRightIndex] = useState(0);

  const dragging = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  // Render both panes from each solid's canonical orientation: the correct
  // choice shares the reference's canonical form, so it overlays the reference
  // exactly at every synced angle, while distractors never line up.
  const refSolid = useMemo(() => (puzzle ? canonicalForm(puzzle.reference) : null), [puzzle]);
  const rightSolid = useMemo(
    () => (puzzle ? canonicalForm(puzzle.choices[rightIndex]!.solid) : null),
    [puzzle, rightIndex],
  );
  // Stable shared frame across the reference and every choice (canonical forms)
  // so the scale doesn't jump when switching which choice is compared.
  const frame = useMemo(
    () =>
      puzzle
        ? sharedViewBox3D([
            canonicalForm(puzzle.reference),
            ...puzzle.choices.map((c) => canonicalForm(c.solid)),
          ])
        : undefined,
    [puzzle],
  );

  // Reset state whenever a new puzzle opens.
  useEffect(() => {
    if (!puzzle) return;
    setYaw(0);
    setPitch(0);
    setAutoSpin(false);
    setRightIndex(puzzle.correctIndex);
  }, [puzzle]);

  // Escape to close.
  useEffect(() => {
    if (!puzzle) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [puzzle, onClose]);

  // Auto-spin loop.
  useEffect(() => {
    if (!puzzle || !autoSpin || reduced) return;
    let raf = 0;
    const tick = () => {
      if (!dragging.current) setYaw((y) => (y + 0.7) % 360);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [puzzle, autoSpin, reduced]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !last.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setYaw((y) => y + dx * 0.6);
    setPitch((p) => Math.max(-85, Math.min(85, p - dy * 0.6)));
  }, []);

  const endDrag = useCallback(() => {
    dragging.current = false;
    last.current = null;
  }, []);

  const reset = useCallback(() => {
    setYaw(0);
    setPitch(0);
  }, []);

  if (!puzzle) return null;
  const rightLetter = LETTERS[rightIndex]!;
  const rightIsCorrect = rightIndex === puzzle.correctIndex;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rb-inspect-title"
      >
        <motion.div
          initial={{ scale: 0.96, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 10, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="max-w-2xl w-full rounded-2xl border border-border-strong bg-bg-card p-5 md:p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <h2 id="rb-inspect-title" className="text-base font-semibold tracking-tight">
              Inspect in 3D
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-text-dim hover:text-text px-2 py-1 rounded-md hover:bg-bg-card-hover"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] text-text-dim mb-4 leading-relaxed">
            Drag to rotate both blocks together. The reference and the correct answer line up from
            every angle; swap in a wrong choice below to see it never does.
          </p>

          {/* Two synced viewers */}
          <div
            className="grid grid-cols-2 gap-3 touch-none select-none cursor-grab active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            onPointerCancel={endDrag}
          >
            <ViewerPane label="Reference" tone="accent">
              <Block3DViewer solid={refSolid!} yaw={yaw} pitch={pitch} viewBox={frame} className="w-full h-full" ariaLabel="Reference block" />
            </ViewerPane>
            <ViewerPane
              label={rightIsCorrect ? `Answer ✓ ${rightLetter}` : `Choice ${rightLetter} — wrong`}
              tone={rightIsCorrect ? 'correct' : 'wrong'}
            >
              <Block3DViewer solid={rightSolid!} yaw={yaw} pitch={pitch} viewBox={frame} className="w-full h-full" ariaLabel={`Choice ${rightLetter}`} />
            </ViewerPane>
          </div>

          {/* Choice switcher */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {puzzle.choices.map((_c, i) => {
              const active = i === rightIndex;
              const correct = i === puzzle.correctIndex;
              return (
                <button
                  key={i}
                  onClick={() => setRightIndex(i)}
                  aria-label={`Compare choice ${LETTERS[i]}`}
                  className={clsx(
                    'w-9 h-9 rounded-lg border font-mono text-xs uppercase transition',
                    active
                      ? 'border-accent text-accent bg-accent/10'
                      : 'border-border text-text-dim hover:text-text hover:bg-bg-card-hover',
                    correct && !active && 'border-correct/50 text-correct',
                  )}
                >
                  {LETTERS[i]}
                </button>
              );
            })}
          </div>

          {/* Controls */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-wider">
            <NudgeButton label="◀" onClick={() => setYaw((y) => y - 90)} title="Rotate left 90°" />
            <NudgeButton label="▶" onClick={() => setYaw((y) => y + 90)} title="Rotate right 90°" />
            <NudgeButton label="▲" onClick={() => setPitch((p) => Math.min(85, p + 45))} title="Tilt up" />
            <NudgeButton label="▼" onClick={() => setPitch((p) => Math.max(-85, p - 45))} title="Tilt down" />
            <button
              onClick={reset}
              className="px-3 h-9 rounded-lg border border-border text-text-dim hover:text-text hover:bg-bg-card-hover"
            >
              Reset
            </button>
            <button
              onClick={() => setAutoSpin((s) => !s)}
              disabled={!!reduced}
              className={clsx(
                'px-3 h-9 rounded-lg border transition',
                autoSpin && !reduced
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-border text-text-dim hover:text-text hover:bg-bg-card-hover',
                reduced && 'opacity-40 cursor-not-allowed',
              )}
            >
              {autoSpin ? 'Stop spin' : 'Auto-spin'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ViewerPane({
  label,
  tone,
  children,
}: {
  label: string;
  tone: 'accent' | 'correct' | 'wrong';
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        'rounded-xl border bg-bg p-2',
        tone === 'accent' && 'border-accent/40',
        tone === 'correct' && 'border-correct/50',
        tone === 'wrong' && 'border-wrong/50',
      )}
    >
      <div
        className={clsx(
          'font-mono text-[10px] uppercase tracking-[0.18em] mb-1 text-center',
          tone === 'accent' && 'text-accent',
          tone === 'correct' && 'text-correct',
          tone === 'wrong' && 'text-wrong',
        )}
      >
        {label}
      </div>
      <div className="w-full aspect-square">{children}</div>
    </div>
  );
}

function NudgeButton({ label, onClick, title }: { label: string; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="w-9 h-9 rounded-lg border border-border text-text-dim hover:text-text hover:bg-bg-card-hover transition"
    >
      {label}
    </button>
  );
}
