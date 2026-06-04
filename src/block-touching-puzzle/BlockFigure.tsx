import clsx from 'clsx';
import type { Block, Pt, Puzzle, Vec3 } from './types';
import { polygonPath } from '../matching-parts-puzzle/Piece';
import {
  U,
  boxCorners,
  boxVisibleFaces,
  cellTopCentroid,
  convexHull,
  faceGridLines,
  floorGrid,
  topFaceCentroid,
} from './generate/projection';
import { frontMostCellsByBlock } from './generate/fairness';

// Monochrome, paper-like fills with isometric shading (top lit, sides shaded). Every
// block uses the SAME shades — telling blocks apart is the spatial skill.
const FILL = { top: '#eef0f4', left: '#cdd2dd', right: '#b0b6c4' };
const GRID = '#243044'; // thin unit-cube grid + face edges
const OUTLINE = '#0b0e16'; // bold per-block silhouette
const OUTLINE_CORRECT = '#16a34a';
const OUTLINE_WRONG = '#dc2626';

const GRID_W = U * 0.04;
const OUTLINE_W = U * 0.1;
const FLOOR_W = U * 0.03;

type Props = {
  puzzle: Puzzle;
  className?: string;
  /** When provided, each block's silhouette is coloured by correctness (reveal mode). */
  perLabel?: Record<string, boolean>;
};

export function BlockFigure({ puzzle, className, perLabel }: Props) {
  const fronts = frontMostCellsByBlock(puzzle.blocks);
  const floor = floorGrid(puzzle.blocks);
  return (
    <svg
      viewBox={puzzle.viewBox}
      className={clsx('block', className)}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {/* Faint ground grid (depth anchor), behind everything. */}
      <g stroke="#3a465c" strokeWidth={FLOOR_W} opacity={0.35}>
        {floor.map((s, i) => (
          <line key={i} x1={s[0].x} y1={s[0].y} x2={s[1].x} y2={s[1].y} />
        ))}
      </g>

      {/* Blocks far → near (drawOrder): shaded voxel faces + bold block outline. */}
      {puzzle.blocks.map((b) => {
        const outline = perLabel
          ? perLabel[b.label]
            ? OUTLINE_CORRECT
            : OUTLINE_WRONG
          : OUTLINE;
        return <BlockSolid key={b.id} block={b} outline={outline} />;
      })}

      {/* Labels last, on top. */}
      {puzzle.blocks.map((b) => (
        <Label key={b.id} text={b.label} at={labelAnchor(b, fronts.get(b.id) ?? [])} />
      ))}
    </svg>
  );
}

function labelAnchor(block: Block, frontMost: Vec3[]): Pt {
  if (frontMost.length === 0) return topFaceCentroid(block);
  const near = frontMost.reduce((best, c) =>
    c.x + c.y + c.z > best.x + best.y + best.z ? c : best,
  );
  return cellTopCentroid(near);
}

function BlockSolid({ block, outline }: { block: Block; outline: string }) {
  const f = boxVisibleFaces(block);
  const silhouette = convexHull(boxCorners(block));
  const faces: Array<{ key: string; pts: Pt[]; fill: string; face: 'top' | 'left' | 'right' }> = [
    { key: 'right', pts: f.right, fill: FILL.right, face: 'right' },
    { key: 'left', pts: f.left, fill: FILL.left, face: 'left' },
    { key: 'top', pts: f.top, fill: FILL.top, face: 'top' },
  ];
  return (
    <g>
      {faces.map(({ key, pts, fill, face }) => (
        <g key={key}>
          <path d={polygonPath(pts)} fill={fill} stroke={GRID} strokeWidth={GRID_W} strokeLinejoin="round" />
          {faceGridLines(block, face).map((s, i) => (
            <line key={i} x1={s[0].x} y1={s[0].y} x2={s[1].x} y2={s[1].y} stroke={GRID} strokeWidth={GRID_W} strokeLinecap="round" />
          ))}
        </g>
      ))}
      {/* Bold outline of the whole block — shows which cubes form one block. */}
      <path
        d={polygonPath(silhouette)}
        fill="none"
        stroke={outline}
        strokeWidth={OUTLINE_W}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </g>
  );
}

function Label({ text, at }: { text: string; at: Pt }) {
  const common = {
    x: at.x.toFixed(2),
    y: at.y.toFixed(2),
    fontSize: U * 0.46,
    fontWeight: 700,
    fontFamily: 'ui-monospace, monospace',
    textAnchor: 'middle' as const,
    dominantBaseline: 'central' as const,
  };
  return (
    <g>
      <text {...common} fill="none" stroke="#f8fafc" strokeWidth={3.5} strokeLinejoin="round">
        {text}
      </text>
      <text {...common} fill="#0b0e16">
        {text}
      </text>
    </g>
  );
}
