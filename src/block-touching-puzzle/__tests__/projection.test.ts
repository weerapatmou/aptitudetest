import { describe, expect, it } from 'vitest';
import type { Block } from '../types';
import { boxCorners, convexHull, faceGridLines } from '../generate/projection';

function area(poly: { x: number; y: number }[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

describe('convexHull', () => {
  it('drops collinear and interior points', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 }, // collinear on the bottom edge
      { x: 2, y: 2 },
      { x: 0, y: 2 },
      { x: 1, y: 1 }, // interior
    ];
    expect(convexHull(square)).toHaveLength(4);
  });

  it("a cube's projected silhouette is a hexagon", () => {
    const cube: Block = { id: 0, label: 'A', origin: { x: 0, y: 0, z: 0 }, size: { x: 1, y: 1, z: 1 }, touchingFaces: 0 };
    const hull = convexHull(boxCorners(cube));
    expect(hull).toHaveLength(6);
    expect(area(hull)).toBeGreaterThan(0);
  });
});

describe('faceGridLines', () => {
  const cube: Block = { id: 0, label: 'A', origin: { x: 0, y: 0, z: 0 }, size: { x: 1, y: 1, z: 1 }, touchingFaces: 0 };
  const beam: Block = { id: 1, label: 'B', origin: { x: 0, y: 0, z: 0 }, size: { x: 3, y: 1, z: 1 }, touchingFaces: 0 };

  it('a unit cube face has no internal grid lines', () => {
    expect(faceGridLines(cube, 'top')).toHaveLength(0);
    expect(faceGridLines(cube, 'left')).toHaveLength(0);
    expect(faceGridLines(cube, 'right')).toHaveLength(0);
  });

  it("a 1x1x3 beam's long top face yields 2 internal grid lines", () => {
    expect(faceGridLines(beam, 'top')).toHaveLength(2); // splits length-3 into 3 cells
    expect(faceGridLines(beam, 'right')).toHaveLength(0); // the 1x1 end face
  });
});
