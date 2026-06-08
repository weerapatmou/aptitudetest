import { describe, it, expect } from 'vitest';
import { renderSolid, boundingRadius, viewBoxFor, sharedRadius } from '../generate/render3d';
import type { Polycube } from '../types';

const CUBE: Polycube = [{ x: 0, y: 0, z: 0 }];
const DOMINO: Polycube = [
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
];
const L: Polycube = [
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: 1, y: 1, z: 0 },
  { x: 1, y: 1, z: 1 },
];

const ANGLES: Array<[number, number]> = [
  [0, 0],
  [37, 18],
  [90, 0],
  [180, -40],
  [255, 60],
  [330, -75],
];

/** Count external (non-internal) faces of a solid. */
function externalFaces(solid: Polycube): number {
  const occ = new Set(solid.map((c) => `${c.x},${c.y},${c.z}`));
  const off = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  let n = 0;
  for (const c of solid)
    for (const [dx, dy, dz] of off) if (!occ.has(`${c.x + dx!},${c.y + dy!},${c.z + dz!}`)) n++;
  return n;
}

describe('renderSolid — culling & shading', () => {
  it('at rest (0,0) a single cube shows exactly the 3 iso faces', () => {
    // Matches iso.ts facets(): +x/+y/+z are the camera-facing faces.
    expect(renderSolid(CUBE, 0, 0).length).toBe(3);
  });

  it('a single cube shows 1–3 faces with shades in range', () => {
    for (const [yaw, pitch] of ANGLES) {
      const fs = renderSolid(CUBE, yaw, pitch);
      expect(fs.length).toBeGreaterThanOrEqual(1);
      expect(fs.length).toBeLessThanOrEqual(3);
      for (const f of fs) {
        expect(f.shade).toBeGreaterThanOrEqual(0.45);
        expect(f.shade).toBeLessThanOrEqual(1.0001);
        expect(f.points.length).toBe(4);
      }
    }
  });

  it('never draws more than the external (non-internal) faces', () => {
    for (const solid of [CUBE, DOMINO, L]) {
      const ext = externalFaces(solid);
      for (const [yaw, pitch] of ANGLES) {
        expect(renderSolid(solid, yaw, pitch).length).toBeLessThanOrEqual(ext);
      }
    }
  });
});

/** Half-extent of an origin-centered square viewBox string. */
function halfExtent(vb: string): number {
  return Math.abs(parseFloat(vb.split(/\s+/)[0]!));
}

describe('frame never clips while spinning', () => {
  const MANY: Array<[number, number]> = [];
  for (let y = 0; y < 360; y += 23) for (let p = -85; p <= 85; p += 29) MANY.push([y, p]);

  for (const solid of [CUBE, DOMINO, L]) {
    it('every projected point stays within the constant viewBox at all angles', () => {
      const half = halfExtent(viewBoxFor(solid)) + 1e-6;
      for (const [yaw, pitch] of MANY) {
        for (const f of renderSolid(solid, yaw, pitch)) {
          for (const p of f.points) {
            expect(Math.abs(p.x)).toBeLessThanOrEqual(half);
            expect(Math.abs(p.y)).toBeLessThanOrEqual(half);
          }
        }
      }
    });
  }

  it('viewBox depends only on the solid, not the angle', () => {
    const vb = viewBoxFor(L);
    expect(vb).toBe(viewBoxFor(L));
    expect(vb).toMatch(/^-?\d/);
  });
});

describe('sharedRadius', () => {
  it('is the max bounding radius across solids', () => {
    expect(sharedRadius([CUBE, DOMINO, L])).toBe(
      Math.max(boundingRadius(CUBE), boundingRadius(DOMINO), boundingRadius(L)),
    );
    expect(sharedRadius([CUBE])).toBe(boundingRadius(CUBE));
  });
});

describe('renderSolid is a pure function of the cell set (order-independent)', () => {
  it('a permuted-but-equal solid renders identically — so the correct choice overlays the reference', () => {
    const shuffled: Polycube = [L[3]!, L[1]!, L[0]!, L[2]!];
    for (const [yaw, pitch] of ANGLES) {
      expect(JSON.stringify(renderSolid(shuffled, yaw, pitch))).toBe(
        JSON.stringify(renderSolid(L, yaw, pitch)),
      );
    }
  });
});
