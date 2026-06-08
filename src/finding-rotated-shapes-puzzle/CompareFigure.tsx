import { useMemo } from 'react';
import { centroid, polygonBounds } from '@/rotation-puzzle/generate/geometry';
import { displayedCloud } from './generate/viewBox';
import { bestAlignmentRotation } from './generate/equivalence';
import type { Choice, OuterShape, Pt } from './types';

// Boundary sample density for the overlay outlines.
const N = 160;
// A point is "diverging" when it sits more than this far from the aligned
// question outline. Generation guarantees distractors leave a gap ≥ 8 (see
// DISTRACTOR_MARGIN), while a true rotation aligns to < 5, so 6 sits cleanly
// between: no red on the correct option, clear red on every distractor.
const DIVERGE = 6;

type Props = {
  option: Choice;
  reference: OuterShape;
  caption: string;
  tone: 'wrong' | 'correct';
};

/**
 * Overlays the question outline (a faint, dashed "ghost", rotation-aligned for
 * best fit) on top of one option's outline, and paints the parts of the option
 * that diverge from the question in red — so the flaw (moved/added/removed corner,
 * stretch, skew, or a mirror flip) is visible at a glance.
 */
export function CompareFigure({ option, reference, caption, tone }: Props) {
  const { viewBox, optPoints, ghostPoints, redEdges, redDots } = useMemo(() => {
    const opt = displayedCloud(option.shape, option.transform, N);
    const deg = bestAlignmentRotation(reference, option.shape, option.transform);
    const rawGhost = displayedCloud(reference, { rotate: deg, flipX: false }, N);

    // Lay the ghost's centroid on the option's centroid so the two outlines overlap.
    const co = centroid(opt);
    const cg = centroid(rawGhost);
    const ghost = rawGhost.map((p) => ({ x: p.x + (co.x - cg.x), y: p.y + (co.y - cg.y) }));

    const diverge = opt.map((p) => nearestDist(p, ghost) > DIVERGE);

    // One red line per diverging edge; adjacent red edges share endpoints and
    // read as a continuous red arc.
    const redEdges: Array<[Pt, Pt]> = [];
    for (let i = 0; i < opt.length; i++) {
      const j = (i + 1) % opt.length;
      if (diverge[i] || diverge[j]) redEdges.push([opt[i]!, opt[j]!]);
    }
    const redDots = opt.filter((_, i) => diverge[i]);

    const b = polygonBounds([...opt, ...ghost]);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    const half = Math.max(b.maxX - b.minX, b.maxY - b.minY) / 2;
    const r = half + half * 0.14 + 4;
    const viewBox = `${(cx - r).toFixed(2)} ${(cy - r).toFixed(2)} ${(r * 2).toFixed(2)} ${(r * 2).toFixed(2)}`;

    return {
      viewBox,
      optPoints: toPoints(opt),
      ghostPoints: toPoints(ghost),
      redEdges,
      redDots,
    };
  }, [option, reference]);

  return (
    <figure className="flex flex-col items-center gap-1.5">
      <svg
        viewBox={viewBox}
        className="w-full aspect-square"
        role="img"
        aria-label={caption}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* The question outline, laid over the option. */}
        <polygon
          points={ghostPoints}
          fill="none"
          stroke="var(--text-dim)"
          strokeWidth={2}
          strokeDasharray="4 3"
          strokeLinejoin="round"
          opacity={0.5}
          vectorEffect="non-scaling-stroke"
        />
        {/* The option outline. */}
        <polygon
          points={optPoints}
          fill="none"
          stroke={tone === 'correct' ? 'var(--correct)' : 'var(--text)'}
          strokeWidth={2.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Where the option differs from the question. */}
        {redEdges.map(([a, c], i) => (
          <line
            key={`e${i}`}
            x1={a.x}
            y1={a.y}
            x2={c.x}
            y2={c.y}
            stroke="var(--wrong)"
            strokeWidth={3.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {redDots.map((p, i) => (
          <circle key={`d${i}`} cx={p.x} cy={p.y} r={2.4} fill="var(--wrong)" />
        ))}
      </svg>
      <figcaption className="font-mono text-[10px] uppercase tracking-wider text-text-dim text-center">
        {caption}
      </figcaption>
    </figure>
  );
}

function toPoints(cloud: Pt[]): string {
  return cloud.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

function nearestDist(p: Pt, cloud: Pt[]): number {
  let best = Infinity;
  for (const q of cloud) {
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < best) best = d2;
  }
  return Math.sqrt(best);
}
