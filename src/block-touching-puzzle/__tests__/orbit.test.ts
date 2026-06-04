import { describe, expect, it } from 'vitest';
import type { Block } from '../types';
import { buildOrbitView, projectRotated, rotate } from '../generate/orbit';

function block(id: number, origin: Block['origin'], size: Block['size']): Block {
  return { id, label: String.fromCharCode(65 + id), origin, size, touchingFaces: 0 };
}

describe('orbit projection sign conventions', () => {
  it('+z projects above -z on screen (SVG y is down)', () => {
    const top = projectRotated(rotate({ x: 0, y: 0, z: 1 }, 0, 0));
    const bottom = projectRotated(rotate({ x: 0, y: 0, z: -1 }, 0, 0));
    expect(top.screen.y).toBeLessThan(bottom.screen.y);
  });

  it('points nearer the camera have greater depth (sorted last)', () => {
    const near = projectRotated(rotate({ x: 0, y: 1, z: 0 }, 0, 0));
    const far = projectRotated(rotate({ x: 0, y: -1, z: 0 }, 0, 0));
    expect(near.depth).toBeGreaterThan(far.depth);
  });
});

describe('orbit view culling', () => {
  it('a single cube shows exactly three faces at a 3/4 view', () => {
    const view = buildOrbitView([block(0, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })], -Math.PI / 5, Math.PI / 6);
    expect(view.quads).toHaveLength(3);
  });

  it('faces are ordered far → near', () => {
    const view = buildOrbitView(
      [
        block(0, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }),
        block(1, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }),
      ],
      -Math.PI / 5,
      Math.PI / 6,
    );
    for (let i = 1; i < view.quads.length; i++) {
      expect(view.quads[i]!.depth).toBeGreaterThanOrEqual(view.quads[i - 1]!.depth);
    }
    expect(view.viewBox.split(' ')).toHaveLength(4);
  });
});
