import type { Glyph, Placement } from './types';
import {
  CUBE_FACES,
  GLYPH_STROKES,
  HIDDEN_EDGES,
  markMapper,
  polygonPath,
  project,
  VIEWBOX,
  type Pt,
} from './generate/iso';

type Props = {
  placement: Placement;
  /** Which glyph to draw for the mark (defaults to the asymmetric arrow-cross). */
  glyph?: Glyph;
  viewBox?: string;
  className?: string;
  ariaLabel?: string;
  /** Mark colour — accent by default; a muted tone for legend/replay frames. */
  markColor?: string;
};

const FACE_FILL: Record<'top' | 'right' | 'left', string> = {
  top: 'var(--bg-card-hover, #232733)',
  right: 'var(--bg-card, #1a1d26)',
  left: 'var(--bg, #14161d)',
};

/** A single isometric cube with an optional oriented mark on a visible face. */
export function CubeFigure({
  placement,
  glyph = 'arrow-cross',
  viewBox = VIEWBOX,
  className,
  ariaLabel,
  markColor = 'var(--accent)',
}: Props) {
  const mark = placement.face ? buildMark(glyph, placement.face, placement.angle) : null;
  // Vertical axis tick, like the worksheet's dashed centre line.
  const axisTop = project(0.5, 0.5, 1);

  return (
    <svg
      viewBox={viewBox}
      className={className}
      role="img"
      aria-label={ariaLabel ?? 'Cube with mark'}
    >
      {/* hidden back edges */}
      {HIDDEN_EDGES.map(([a, b], i) => (
        <line
          key={`h${i}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="var(--border, #3a3f4b)"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.7}
        />
      ))}

      {/* dashed vertical axis */}
      <line
        x1={axisTop.x}
        y1={axisTop.y}
        x2={axisTop.x}
        y2={axisTop.y - 12}
        stroke="var(--border, #3a3f4b)"
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={0.7}
      />

      {/* three visible faces */}
      {(['left', 'right', 'top'] as const).map((face) => (
        <path
          key={face}
          d={polygonPath(CUBE_FACES[face])}
          fill={FACE_FILL[face]}
          stroke="var(--text, #e8eaf0)"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      ))}

      {/* the mark */}
      {mark && (
        <g stroke={markColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none">
          {mark.map((stroke, i) => (
            <polyline key={i} points={stroke.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')} />
          ))}
        </g>
      )}
    </svg>
  );
}

function buildMark(glyph: Glyph, face: 'top' | 'right' | 'left', angle: Placement['angle']): Pt[][] {
  const map = markMapper(face, angle);
  return GLYPH_STROKES[glyph].map((stroke) => stroke.map(([gx, gy]) => map(gx, gy)));
}
