import type { Polygon } from '../types';
import type { Rng } from '../../rotation-puzzle/generate/rng';

export type TargetKind =
  | 'rect'
  | 'pentagon'
  | 'hexagon'
  | 'lShape'
  | 'tShape'
  | 'trapezoid';

const R = 38;

function pentagon(): Polygon {
  const pts: Polygon = [];
  for (let i = 0; i < 5; i++) {
    const a = (-Math.PI / 2) + (i * 2 * Math.PI) / 5;
    pts.push({ x: R * Math.cos(a), y: R * Math.sin(a) });
  }
  return pts;
}

function hexagon(): Polygon {
  const pts: Polygon = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * 2 * Math.PI) / 6;
    pts.push({ x: R * Math.cos(a), y: R * Math.sin(a) });
  }
  return pts;
}

function rect(): Polygon {
  const w = 42, h = 32;
  return [
    { x: -w, y: -h },
    { x: w, y: -h },
    { x: w, y: h },
    { x: -w, y: h },
  ];
}

function lShape(): Polygon {
  return [
    { x: -34, y: -34 },
    { x: 8, y: -34 },
    { x: 8, y: 4 },
    { x: 34, y: 4 },
    { x: 34, y: 34 },
    { x: -34, y: 34 },
  ];
}

function tShape(): Polygon {
  return [
    { x: -38, y: -28 },
    { x: 38, y: -28 },
    { x: 38, y: 0 },
    { x: 14, y: 0 },
    { x: 14, y: 30 },
    { x: -14, y: 30 },
    { x: -14, y: 0 },
    { x: -38, y: 0 },
  ];
}

function trapezoid(): Polygon {
  return [
    { x: -42, y: 24 },
    { x: -22, y: -24 },
    { x: 22, y: -24 },
    { x: 42, y: 24 },
  ];
}

export function pickTarget(rng: Rng): { kind: TargetKind; polygon: Polygon } {
  const kinds: TargetKind[] = ['rect', 'pentagon', 'hexagon', 'lShape', 'tShape', 'trapezoid'];
  const kind = rng.pick(kinds);
  return { kind, polygon: makeTarget(kind) };
}

export function makeTarget(kind: TargetKind): Polygon {
  switch (kind) {
    case 'rect': return rect();
    case 'pentagon': return pentagon();
    case 'hexagon': return hexagon();
    case 'lShape': return lShape();
    case 'tShape': return tShape();
    case 'trapezoid': return trapezoid();
  }
}
