import { useMemo } from 'react';
import type { Arrangement, Pt } from './types';
import { buildScene } from './generate/iso';

type Props = {
  arrangement: Arrangement;
  viewBox: string;
  className?: string;
};

// Grayscale cube shading (matches the printed test aesthetic and reads clearly
// on the dark card). Top is lightest, right darkest; dark seams aid counting.
const FACE_FILL = {
  top: '#dce3ec',
  left: '#9aa6b6',
  right: '#6c7889',
} as const;
const SEAM = '#1b2330';
// Faint ground shadow that anchors the stack so columns don't read as floating.
const FLOOR_FILL = 'rgba(148,163,184,0.10)';
const FLOOR_STROKE = 'rgba(148,163,184,0.35)';

function pts(p: Pt[]): string {
  return p.map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(' ');
}

export function CubeFigure({ arrangement, viewBox, className }: Props) {
  const scene = useMemo(() => buildScene(arrangement), [arrangement]);

  return (
    <svg
      viewBox={viewBox}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <polygon
        points={pts(scene.floor)}
        fill={FLOOR_FILL}
        stroke={FLOOR_STROKE}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <g stroke={SEAM} strokeWidth={1.1} strokeLinejoin="round">
        {scene.cubes.map(({ cell, faces, show }) => (
          <g key={`${cell.x},${cell.y},${cell.z}`}>
            {show.right && <polygon points={pts(faces.right)} fill={FACE_FILL.right} />}
            {show.left && <polygon points={pts(faces.left)} fill={FACE_FILL.left} />}
            {show.top && <polygon points={pts(faces.top)} fill={FACE_FILL.top} />}
          </g>
        ))}
      </g>
    </svg>
  );
}
