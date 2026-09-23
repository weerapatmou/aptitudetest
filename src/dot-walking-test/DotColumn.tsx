import type { Circle, Side } from './types';
import { LAYOUT } from './generate';

export type Flash = { order: number; kind: 'correct' | 'wrong' };

type Props = {
  side: Side;
  label: string;
  /** Dashed connecting line (left) vs solid (right). */
  dashed: boolean;
  circles: Circle[];
  /** Brief colour flash on this side (last tap result), or null. No target is ever revealed. */
  flash: Flash | null;
  onTap: (side: Side, order: number) => void;
  onTapEmpty: (side: Side) => void;
};

// Both columns look identical at all times — which hand is next is never shown,
// so the player must remember (always starting on the right and alternating).
export function DotColumn({ side, label, dashed, circles, flash, onTap, onTapEmpty }: Props) {
  const { VB_W, VB_H, R } = LAYOUT;

  const ordered = [...circles].sort((a, b) => a.order - b.order);
  const points = ordered.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-border bg-bg-card/40">
      <div className="shrink-0 text-center font-mono text-[11px] uppercase tracking-[0.25em] py-2 border-b border-border text-text-dim/70">
        {label}
      </div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full flex-1 min-h-0 touch-none select-none"
        role="group"
        aria-label={`${label} trail`}
      >
        {/* Background — taps that miss every circle count as a miss. */}
        <rect
          x={0}
          y={0}
          width={VB_W}
          height={VB_H}
          fill="transparent"
          onPointerDown={(e) => {
            e.preventDefault();
            onTapEmpty(side);
          }}
        />
        <polyline
          points={points}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={1.1}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={dashed ? '4 3.5' : undefined}
          opacity={0.75}
          pointerEvents="none"
        />
        {ordered.map((c) => {
          const isFlash = flash?.order === c.order;
          // Only brief feedback flashes ever colour a dot — the next target is never shown.
          const fill = isFlash
            ? flash!.kind === 'correct'
              ? 'var(--correct)'
              : 'var(--wrong)'
            : 'var(--border-strong)';

          return (
            <g
              key={c.id}
              role="button"
              aria-label={`${label} dot ${c.order + 1}`}
              className="cursor-pointer"
              onPointerDown={(e) => {
                e.preventDefault();
                onTap(side, c.order);
              }}
            >
              {/* Enlarged invisible hit area for comfortable touch. */}
              <circle cx={c.x} cy={c.y} r={R * 1.7} fill="transparent" />
              <circle cx={c.x} cy={c.y} r={R} fill={fill} stroke="var(--bg)" strokeWidth={0.8} opacity={isFlash ? 1 : 0.85} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
