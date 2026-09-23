import { describe, expect, it } from 'vitest';
import { generatePage, LAYOUT } from '../generate';
import { makeRng } from '../generate/rng';
import type { Circle } from '../types';

const N = 15;

function eachSide(cb: (circles: Circle[], side: 'right' | 'left') => void) {
  for (let seed = 1; seed <= 40; seed++) {
    const page = generatePage(N, makeRng(seed));
    cb(page.right, 'right');
    cb(page.left, 'left');
  }
}

describe('generatePage', () => {
  it('produces the requested count on both sides', () => {
    const page = generatePage(N, makeRng(123));
    expect(page.right).toHaveLength(N);
    expect(page.left).toHaveLength(N);
  });

  it('assigns order 0..n-1 exactly once per side', () => {
    eachSide((circles) => {
      const orders = circles.map((c) => c.order).sort((a, b) => a - b);
      expect(orders).toEqual(Array.from({ length: N }, (_, i) => i));
    });
  });

  it('ascends bottom → top: y strictly decreases as order increases', () => {
    eachSide((circles) => {
      const byOrder = [...circles].sort((a, b) => a.order - b.order);
      for (let i = 1; i < byOrder.length; i++) {
        expect(byOrder[i]!.y).toBeLessThan(byOrder[i - 1]!.y);
      }
    });
  });

  it('keeps circles inside the column bounds (respecting the radius margin)', () => {
    const { VB_W, VB_H, R } = LAYOUT;
    eachSide((circles) => {
      for (const c of circles) {
        expect(c.x).toBeGreaterThanOrEqual(R);
        expect(c.x).toBeLessThanOrEqual(VB_W - R);
        expect(c.y).toBeGreaterThanOrEqual(0);
        expect(c.y).toBeLessThanOrEqual(VB_H);
      }
    });
  });

  it('never overlaps two circles on the same side', () => {
    const minDist = 2 * LAYOUT.R;
    eachSide((circles) => {
      for (let i = 0; i < circles.length; i++) {
        for (let j = i + 1; j < circles.length; j++) {
          const dx = circles[i]!.x - circles[j]!.x;
          const dy = circles[i]!.y - circles[j]!.y;
          expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(minDist);
        }
      }
    });
  });

  it('generates different left and right trails', () => {
    const page = generatePage(N, makeRng(7));
    const same = page.right.every(
      (c, i) => c.x === page.left[i]!.x && c.y === page.left[i]!.y,
    );
    expect(same).toBe(false);
  });
});
