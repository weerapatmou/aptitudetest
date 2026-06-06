import { describe, it, expect } from 'vitest';
import { CUBE_FACES, markMapper, type Pt } from '../generate/iso';
import type { Angle, Face } from '../types';

const FACES: Face[] = ['top', 'right', 'left'];
const ANGLES: Angle[] = [0, 90, 180, 270];

/** Ray-casting point-in-polygon. */
function inside(p: Pt, poly: Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    const crosses = a.y > p.y !== b.y > p.y;
    if (crosses && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

describe('mark placement', () => {
  it('keeps the mark inside its face for every face and angle', () => {
    for (const face of FACES) {
      const poly = CUBE_FACES[face];
      for (const angle of ANGLES) {
        const map = markMapper(face, angle);
        for (const gx of [-1, 0, 1]) {
          for (const gy of [-1, 0, 1]) {
            const pt = map(gx, gy);
            expect(inside(pt, poly)).toBe(true);
          }
        }
      }
    }
  });

  it('different angles place the glyph tip in different spots', () => {
    const tips = ANGLES.map((a) => markMapper('right', a)(0, 0.92));
    const keys = new Set(tips.map((t) => `${t.x.toFixed(1)},${t.y.toFixed(1)}`));
    expect(keys.size).toBe(4);
  });
});
