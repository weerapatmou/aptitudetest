import { describe, expect, it } from 'vitest';
import type { Block } from '../types';
import {
  boxCells,
  buildOccupancy,
  computeAllTouching,
  countTouchingFaces,
  countTouchingFacesGeometric,
  drawOrder,
  growCluster,
  hasOcclusionCycle,
  isConnected,
  orientationsOf,
} from '../generate/geometry';
import { makeRng } from '../../rotation-puzzle/generate/rng';

function block(id: number, origin: Block['origin'], size: Block['size']): Block {
  return { id, label: '', origin, size, touchingFaces: 0 };
}

const cube = { x: 1, y: 1, z: 1 };

describe('touch counting', () => {
  it('two face-adjacent cubes touch on one face each', () => {
    const blocks = [block(0, { x: 0, y: 0, z: 0 }, cube), block(1, { x: 1, y: 0, z: 0 }, cube)];
    computeAllTouching(blocks);
    expect(blocks[0]!.touchingFaces).toBe(1);
    expect(blocks[1]!.touchingFaces).toBe(1);
  });

  it('cubes meeting only at an edge do not touch', () => {
    const blocks = [block(0, { x: 0, y: 0, z: 0 }, cube), block(1, { x: 1, y: 1, z: 0 }, cube)];
    computeAllTouching(blocks);
    expect(blocks[0]!.touchingFaces).toBe(0);
    expect(blocks[1]!.touchingFaces).toBe(0);
  });

  it('cubes meeting only at a corner do not touch', () => {
    const blocks = [block(0, { x: 0, y: 0, z: 0 }, cube), block(1, { x: 1, y: 1, z: 1 }, cube)];
    computeAllTouching(blocks);
    expect(blocks[0]!.touchingFaces).toBe(0);
    expect(blocks[1]!.touchingFaces).toBe(0);
  });

  it('a beam touched on its long side counts that side once', () => {
    const beam = block(0, { x: 0, y: 0, z: 0 }, { x: 3, y: 1, z: 1 });
    // Two separate cubes resting on the same long (top) face of the beam.
    const a = block(1, { x: 0, y: 0, z: 1 }, cube);
    const b = block(2, { x: 2, y: 0, z: 1 }, cube);
    const blocks = [beam, a, b];
    computeAllTouching(blocks);
    expect(beam.touchingFaces).toBe(1); // one face (the top), touched twice
    expect(a.touchingFaces).toBe(1);
    expect(b.touchingFaces).toBe(1);
  });

  it('counts at most six faces and is symmetric', () => {
    // A center cube surrounded on all six faces.
    const center = block(0, { x: 1, y: 1, z: 1 }, cube);
    const neighbors = [
      block(1, { x: 0, y: 1, z: 1 }, cube),
      block(2, { x: 2, y: 1, z: 1 }, cube),
      block(3, { x: 1, y: 0, z: 1 }, cube),
      block(4, { x: 1, y: 2, z: 1 }, cube),
      block(5, { x: 1, y: 1, z: 0 }, cube),
      block(6, { x: 1, y: 1, z: 2 }, cube),
    ];
    const blocks = [center, ...neighbors];
    computeAllTouching(blocks);
    expect(center.touchingFaces).toBe(6);
    for (const n of neighbors) expect(n.touchingFaces).toBe(1);
  });
});

describe('helpers', () => {
  it('boxCells expands a beam to its unit cells', () => {
    const cells = boxCells(block(0, { x: 0, y: 0, z: 0 }, { x: 3, y: 1, z: 1 }));
    expect(cells).toHaveLength(3);
  });

  it('occupancy size equals total cell volume when no overlap', () => {
    const blocks = [block(0, { x: 0, y: 0, z: 0 }, { x: 2, y: 1, z: 1 }), block(1, { x: 0, y: 1, z: 0 }, { x: 2, y: 1, z: 1 })];
    const occ = buildOccupancy(blocks);
    expect(occ.size).toBe(4);
  });

  it('isConnected detects a gap', () => {
    const joined = [block(0, { x: 0, y: 0, z: 0 }, cube), block(1, { x: 1, y: 0, z: 0 }, cube)];
    const split = [block(0, { x: 0, y: 0, z: 0 }, cube), block(1, { x: 3, y: 0, z: 0 }, cube)];
    expect(isConnected(joined)).toBe(true);
    expect(isConnected(split)).toBe(false);
  });

  it('orientationsOf gives one pose for a cube and three for a beam', () => {
    expect(orientationsOf({ x: 1, y: 1, z: 1 })).toHaveLength(1);
    expect(orientationsOf({ x: 3, y: 1, z: 1 })).toHaveLength(3);
  });
});

describe('answer-key correctness (independent oracle)', () => {
  it('the geometric interval-overlap count equals the cell-neighbourhood count', () => {
    const sizes = [
      { x: 1, y: 1, z: 1 },
      { x: 2, y: 1, z: 1 },
      { x: 3, y: 1, z: 1 },
      { x: 4, y: 1, z: 1 },
    ];
    let checked = 0;
    for (let seed = 0; seed < 4000; seed++) {
      const rng = makeRng(seed);
      const blocks = growCluster(rng, rng.pick(sizes), rng.int(1, 10), rng.int(1, 4));
      if (!blocks) continue;
      const occ = buildOccupancy(blocks);
      for (const b of blocks) {
        expect(countTouchingFacesGeometric(b, blocks)).toBe(countTouchingFaces(b, occ));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('matches the hand fixtures too (documents the contract both ways)', () => {
    const adj = [block(0, { x: 0, y: 0, z: 0 }, cube), block(1, { x: 1, y: 0, z: 0 }, cube)];
    expect(countTouchingFacesGeometric(adj[0]!, adj)).toBe(1);

    const edge = [block(0, { x: 0, y: 0, z: 0 }, cube), block(1, { x: 1, y: 1, z: 0 }, cube)];
    expect(countTouchingFacesGeometric(edge[0]!, edge)).toBe(0);

    const beam = block(0, { x: 0, y: 0, z: 0 }, { x: 3, y: 1, z: 1 });
    const twoOnTop = [beam, block(1, { x: 0, y: 0, z: 1 }, cube), block(2, { x: 2, y: 0, z: 1 }, cube)];
    expect(countTouchingFacesGeometric(beam, twoOnTop)).toBe(1);
  });
});

describe('draw order (occlusion)', () => {
  it('draws the upper, nearer beam after the one it occludes', () => {
    // Lower beam along x at z=0; upper beam along y at z=1 crossing in front of it.
    const lower = block(0, { x: 0, y: 0, z: 0 }, { x: 3, y: 1, z: 1 });
    const upper = block(1, { x: 2, y: 0, z: 1 }, { x: 1, y: 3, z: 1 });
    const order = drawOrder([lower, upper]);
    expect(order.map((b) => b.id)).toEqual([0, 1]); // lower first, upper painted on top
    expect(hasOcclusionCycle([lower, upper])).toBe(false);
  });

  it('order is stable regardless of input order', () => {
    const lower = block(0, { x: 0, y: 0, z: 0 }, { x: 3, y: 1, z: 1 });
    const upper = block(1, { x: 2, y: 0, z: 1 }, { x: 1, y: 3, z: 1 });
    expect(drawOrder([upper, lower]).map((b) => b.id)).toEqual([0, 1]);
  });
});

// Sanity: recomputing a single block matches computeAllTouching.
it('countTouchingFaces matches computeAllTouching', () => {
  const blocks = [block(0, { x: 0, y: 0, z: 0 }, cube), block(1, { x: 1, y: 0, z: 0 }, cube)];
  const occ = buildOccupancy(blocks);
  expect(countTouchingFaces(blocks[0]!, occ)).toBe(1);
});
