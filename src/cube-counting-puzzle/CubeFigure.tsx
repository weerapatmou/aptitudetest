import { useMemo } from 'react';
import type { Arrangement, Cell, Pt } from './types';
import { buildScene } from './generate/iso';

type Props = {
  arrangement: Arrangement;
  viewBox: string;
  viewAngle?: 0 | 1 | 2 | 3;
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

function rotateArrangement(arr: Arrangement, angle: 0 | 1 | 2 | 3): Arrangement {
  if (angle === 0) return arr;
  const { cols, rows, cells, archetype, total, height } = arr;
  const maxX = cols - 1;
  const maxY = rows - 1;

  const newCells = cells.map(({ x, y, z }): Cell => {
    if (angle === 1) return { x: maxY - y, y: x, z };
    if (angle === 2) return { x: maxX - x, y: maxY - y, z };
    return { x: y, y: maxX - x, z }; // angle === 3
  });

  const newCols = angle === 1 || angle === 3 ? rows : cols;
  const newRows = angle === 1 || angle === 3 ? cols : rows;

  return { archetype, cols: newCols, rows: newRows, height, cells: newCells, total };
}

export function CubeFigure({ arrangement, viewBox, viewAngle = 0, className }: Props) {
  const scene = useMemo(
    () => buildScene(rotateArrangement(arrangement, viewAngle)),
    [arrangement, viewAngle],
  );

  const effectiveViewBox = viewAngle !== 0 ? scene.viewBox : viewBox;

  return (
    <svg
      viewBox={effectiveViewBox}
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
