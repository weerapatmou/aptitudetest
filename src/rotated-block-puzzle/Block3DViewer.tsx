import { useMemo } from 'react';
import type { Polycube } from './types';
import { renderSolid, viewBoxFor, facet3dPath } from './generate/render3d';

type Props = {
  solid: Polycube;
  yaw: number;
  pitch: number;
  /** Optional shared viewBox so several viewers render at one scale. */
  viewBox?: string;
  className?: string;
  ariaLabel?: string;
};

/** Shade [0,1] → a light grey fill, matching the line-art look of the cards. */
function fill(shade: number): string {
  const v = Math.round(190 + shade * 60); // 190–250
  return `rgb(${v},${v + 3},${v + 8})`;
}

/**
 * A controlled, rotatable SVG view of a polycube. Rotation is driven entirely by
 * the `yaw`/`pitch` props so several viewers can share one rotation.
 */
export function Block3DViewer({ solid, yaw, pitch, viewBox, className, ariaLabel }: Props) {
  // The frame is rotation-invariant, so compute it once per solid (unless a
  // shared one is supplied).
  const ownViewBox = useMemo(() => viewBoxFor(solid), [solid]);
  const frame = viewBox ?? ownViewBox;
  const facets = renderSolid(solid, yaw, pitch);

  return (
    <svg
      viewBox={frame}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel ?? '3D block'}
    >
      {facets.map((f, i) => (
        <path
          key={i}
          d={facet3dPath(f)}
          fill={fill(f.shade)}
          stroke="#1b1d22"
          strokeWidth={0.6}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
