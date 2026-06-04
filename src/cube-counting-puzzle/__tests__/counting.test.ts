import { describe, it, expect } from 'vitest';
import type { Arrangement, Cell } from '../types';
import { totalCubes, visibleCubes, hiddenCubes, footprintCubes, faceTiles } from '../generate/counting';

/** Build an Arrangement directly from a heightmap for testing. */
function fromHeights(height: number[][]): Arrangement {
  const cols = height.length;
  const rows = height[0]!.length;
  const cells: Cell[] = [];
  for (let x = 0; x < cols; x++)
    for (let y = 0; y < rows; y++)
      for (let z = 0; z < height[x]![y]!; z++) cells.push({ x, y, z });
  return { cols, rows, height, cells, total: cells.length };
}

function solid(n: number): Arrangement {
  return fromHeights(Array.from({ length: n }, () => new Array<number>(n).fill(n)));
}

describe('cube counting — totals', () => {
  it('counts a single column', () => {
    const a = fromHeights([[3]]);
    expect(totalCubes(a)).toBe(3);
  });

  it('a solid 3×3×3 block totals 27', () => {
    expect(totalCubes(solid(3))).toBe(27);
  });

  it('sums staircase heights', () => {
    const a = fromHeights([
      [1, 2],
      [3, 4],
    ]);
    expect(totalCubes(a)).toBe(10);
  });
});

describe('cube counting — visibility', () => {
  it('a single cube is fully visible, none hidden', () => {
    const a = fromHeights([[1]]);
    expect(visibleCubes(a)).toBe(1);
    expect(hiddenCubes(a)).toBe(0);
  });

  it('a solid n³ block hides exactly (n-1)³ cubes (corner view)', () => {
    for (const n of [2, 3, 4]) {
      const a = solid(n);
      expect(hiddenCubes(a)).toBe((n - 1) ** 3);
      expect(visibleCubes(a)).toBe(n ** 3 - (n - 1) ** 3);
    }
  });

  it('visible never exceeds total and hidden is never negative', () => {
    const a = fromHeights([
      [2, 3, 1],
      [1, 4, 2],
      [3, 1, 2],
    ]);
    expect(visibleCubes(a)).toBeLessThanOrEqual(totalCubes(a));
    expect(hiddenCubes(a)).toBeGreaterThanOrEqual(0);
    expect(visibleCubes(a) + hiddenCubes(a)).toBe(totalCubes(a));
  });
});

describe('cube counting — surrogate metrics for distractors', () => {
  it('footprint counts occupied columns', () => {
    const a = fromHeights([
      [2, 0],
      [1, 3],
    ]);
    expect(footprintCubes(a)).toBe(3);
  });

  it('a single cube exposes 3 faces', () => {
    expect(faceTiles(fromHeights([[1]]))).toBe(3);
  });
});
