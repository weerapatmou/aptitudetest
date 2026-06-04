import type { Polycube } from './types';
import { facets, facetPath, type FaceKind } from './generate/iso';

type Props = {
  solid: Polycube;
  /** Shared origin-centered viewBox so every solid renders at one scale. */
  viewBox: string;
  className?: string;
  ariaLabel?: string;
};

// Subtle top-lit shading so the three visible faces read apart, while keeping
// the clean line-art look of the source test (dark edges on light faces).
const FILL: Record<FaceKind, string> = {
  top: 'var(--block-top, #f4f5f7)',
  left: 'var(--block-left, #c9cdd6)',
  right: 'var(--block-right, #dde0e7)',
};

export function BlockFigure({ solid, viewBox, className, ariaLabel }: Props) {
  const fs = facets(solid);
  return (
    <svg
      viewBox={viewBox}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel ?? '3D block'}
    >
      {fs.map((f, i) => (
        <path
          key={i}
          d={facetPath(f)}
          fill={FILL[f.kind]}
          stroke="#1b1d22"
          strokeWidth={0.7}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
