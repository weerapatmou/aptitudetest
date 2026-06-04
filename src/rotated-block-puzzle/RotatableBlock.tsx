import { useCallback, useRef, useState } from 'react';
import type { Polycube } from './types';
import { Block3DViewer } from './Block3DViewer';

type Props = {
  solid: Polycube;
  /** Optional shared viewBox so sibling cards render at one scale. */
  viewBox?: string;
  className?: string;
  ariaLabel?: string;
};

/**
 * A block you can spin 360° by dragging, with its own local rotation state.
 * Each instance is independent. Double-click resets to the starting view.
 */
export function RotatableBlock({ solid, viewBox, className, ariaLabel }: Props) {
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const dragging = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !last.current) return;
    e.stopPropagation();
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setYaw((y) => y + dx * 0.7);
    setPitch((p) => Math.max(-85, Math.min(85, p - dy * 0.7)));
  }, []);

  const endDrag = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    e.stopPropagation();
    dragging.current = false;
    last.current = null;
  }, []);

  const reset = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    setYaw(0);
    setPitch(0);
  }, []);

  const rotated = yaw !== 0 || pitch !== 0;

  return (
    <div
      className={`relative touch-none select-none cursor-grab active:cursor-grabbing ${className ?? ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={reset}
      title="Drag to rotate · double-click to reset"
    >
      <Block3DViewer solid={solid} yaw={yaw} pitch={pitch} viewBox={viewBox} className="w-full h-full" ariaLabel={ariaLabel} />
      {rotated && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={reset}
          aria-label="Reset to the original view"
          title="Reset to the original view"
          className="absolute bottom-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-md border border-border bg-bg-card/90 text-text-dim hover:text-accent hover:border-accent/40 transition"
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
