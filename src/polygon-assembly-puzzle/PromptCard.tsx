import type { AssemblyPuzzle } from './types';
import { polygonBounds } from '../rotation-puzzle/generate/geometry';
import { pathFromPolygon, viewBoxFromBounds } from './svgHelpers';

type Props = {
  puzzle: AssemblyPuzzle;
};

export function PromptCard({ puzzle }: Props) {
  const bounds = polygonBounds(puzzle.target.polygon);
  const viewBox = viewBoxFromBounds(bounds, 0.18);
  return (
    <div className="relative rounded-2xl border-2 border-accent/40 bg-bg-card p-4 shadow-[0_0_40px_-12px_var(--accent)]">
      <div className="absolute top-3 left-3 z-10 font-mono text-[10px] tracking-[0.18em] uppercase text-accent">
        Mission · Target
      </div>
      <div className="absolute top-3 right-3 z-10 font-mono text-[10px] tracking-[0.18em] uppercase text-text-dim">
        {puzzle.difficulty} · {puzzle.mode === 'strict' ? 'Strict 2D' : 'Mirror OK'} · {puzzle.pieceCount} parts
      </div>
      <div
        className="flex items-center justify-center text-text mt-6"
        style={{ width: 'var(--svg-slot)', height: 'var(--svg-slot)' }}
      >
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full overflow-visible"
          aria-label="Target silhouette"
        >
          <path
            d={pathFromPolygon(puzzle.target.polygon)}
            fill="var(--accent)"
            fillOpacity={0.12}
            stroke="var(--accent)"
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim/80">
        Which option's pieces assemble into this shape?
      </div>
    </div>
  );
}
