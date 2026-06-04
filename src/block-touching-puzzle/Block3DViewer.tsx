import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Block } from './types';
import { polygonPath } from '../matching-parts-puzzle/Piece';
import { BLOCK_PALETTE, blockColorIndex, buildOrbitView } from './generate/orbit';

type Props = { open: boolean; blocks: Block[]; onClose: () => void };

const INIT_YAW = -Math.PI / 5;
const INIT_PITCH = Math.PI / 6;
const PITCH_LIMIT = (Math.PI / 2) * 0.94;
const STEP = Math.PI / 12;

function clampPitch(p: number): number {
  return Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, p));
}

export function Block3DViewer({ open, blocks, onClose }: Props) {
  const reduced = useReducedMotion();
  const [yaw, setYaw] = useState(INIT_YAW);
  const [pitch, setPitch] = useState(INIT_PITCH);
  const [spin, setSpin] = useState(false);

  const drag = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef<number | null>(null);
  const pending = useRef<{ yaw: number; pitch: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Auto-spin (disabled under reduced-motion).
  useEffect(() => {
    if (!open || !spin || reduced) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (t: number) => {
      const dt = (t - prev) / 1000;
      prev = t;
      setYaw((y) => y + 0.5 * dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, spin, reduced]);

  const view = useMemo(() => buildOrbitView(blocks, yaw, pitch), [blocks, yaw, pitch]);
  const colorIdx = useMemo(() => blockColorIndex(blocks), [blocks]);
  const legend = useMemo(
    () => blocks.slice().sort((a, b) => a.label.localeCompare(b.label)),
    [blocks],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
    setSpin(false);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    const next = {
      yaw: (pending.current?.yaw ?? yaw) + dx * 0.01,
      pitch: clampPitch((pending.current?.pitch ?? pitch) - dy * 0.01),
    };
    pending.current = next;
    if (frame.current === null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        if (pending.current) {
          setYaw(pending.current.yaw);
          setPitch(pending.current.pitch);
          pending.current = null;
        }
      });
    }
  };
  const endDrag = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    drag.current = null;
  };

  const reset = () => {
    setSpin(false);
    setYaw(INIT_YAW);
    setPitch(INIT_PITCH);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="block-3d-title"
        >
          <motion.div
            initial={{ scale: 0.95, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 8, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="max-w-3xl w-full rounded-2xl border border-border-strong bg-bg-card p-5 md:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="block-3d-title" className="text-lg font-semibold tracking-tight">
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

            <div className="grid md:grid-cols-[1fr_minmax(0,11rem)] gap-4">
              <div className="rounded-xl border border-border bg-bg/40 overflow-hidden">
                <svg
                  viewBox={view.viewBox}
                  className="w-full h-[320px] md:h-[380px] cursor-grab active:cursor-grabbing select-none"
                  style={{ touchAction: 'none' }}
                  role="img"
                  aria-label="Rotatable 3D view of the blocks. Drag to orbit."
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  {view.quads.map((q) => (
                    <path
                      key={q.key}
                      d={polygonPath(q.points)}
                      fill={q.fill}
                      stroke="#18181b"
                      strokeWidth={0.02}
                      strokeLinejoin="round"
                    />
                  ))}
                </svg>
              </div>

              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-border bg-bg/40 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim mb-2">
                    Blocks
                  </div>
                  <ul className="space-y-1.5">
                    {legend.map((b) => {
                      const rgb = BLOCK_PALETTE[colorIdx.get(b.id) ?? 0]!;
                      return (
                        <li key={b.id} className="flex items-center gap-2 font-mono text-xs">
                          <span
                            className="inline-block w-3 h-3 rounded-sm border border-black/30"
                            style={{ background: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` }}
                          />
                          <span className="text-text font-semibold w-4">{b.label}</span>
                          <span className="text-text-dim">
                            touches <span className="text-accent tabular-nums">{b.touchingFaces}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <CtrlButton label="◤" title="Rotate up" onClick={() => { setSpin(false); setPitch((p) => clampPitch(p + STEP)); }} className="col-start-2" />
                  <CtrlButton label="◀" title="Rotate left" onClick={() => { setSpin(false); setYaw((y) => y - STEP); }} className="col-start-1 row-start-2" />
                  <CtrlButton label="⟳" title="Reset view" onClick={reset} className="col-start-2 row-start-2" />
                  <CtrlButton label="▶" title="Rotate right" onClick={() => { setSpin(false); setYaw((y) => y + STEP); }} className="col-start-3 row-start-2" />
                  <CtrlButton label="◣" title="Rotate down" onClick={() => { setSpin(false); setPitch((p) => clampPitch(p - STEP)); }} className="col-start-2 row-start-3" />
                </div>

                {!reduced && (
                  <button
                    onClick={() => setSpin((s) => !s)}
                    className="px-3 py-2 rounded-lg font-mono uppercase tracking-wider text-[11px] border border-border bg-bg-card hover:bg-bg-card-hover text-text-dim hover:text-text transition"
                  >
                    {spin ? '❚❚ Stop spin' : '▶ Auto-spin'}
                  </button>
                )}
                <p className="text-[11px] text-text-dim/70 leading-snug">
                  Drag the figure to look at it from any side and verify each block's touching faces.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CtrlButton({
  label,
  title,
  onClick,
  className,
}: {
  label: string;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={title}
      title={title}
      className={`px-2 py-2 rounded-lg border border-border bg-bg-card hover:bg-bg-card-hover text-text-dim hover:text-text font-mono text-sm transition ${className ?? ''}`}
    >
      {label}
    </button>
  );
}
