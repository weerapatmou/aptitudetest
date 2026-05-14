import { describe, it, expect } from 'vitest';
import { REFERENCE_KINDS } from '../types';
import { generateReferenceShape, nearTwinShape } from '../generate/shapes';
import { centroid, polygonBounds } from '../../rotation-puzzle/generate/geometry';
import { signedArea } from '../generate/cuts';

const EXPECTED_VERT_COUNT: Record<string, { min: number; max: number }> = {
  hexagon: { min: 6, max: 6 },
  square: { min: 4, max: 4 },
  circle: { min: 32, max: 128 },
  oval: { min: 32, max: 128 },
  kite: { min: 4, max: 4 },
  triangle: { min: 3, max: 3 },
};

describe('shapes — reference generators', () => {
  for (const kind of REFERENCE_KINDS) {
    it(`${kind}: produces a non-empty polygon with expected vertex count`, () => {
      const shape = generateReferenceShape(kind);
      expect(shape.polygon.length).toBeGreaterThanOrEqual(EXPECTED_VERT_COUNT[kind]!.min);
      expect(shape.polygon.length).toBeLessThanOrEqual(EXPECTED_VERT_COUNT[kind]!.max);
    });

    it(`${kind}: centered within 1px of origin`, () => {
      const shape = generateReferenceShape(kind);
      const c = centroid(shape.polygon);
      expect(Math.abs(c.x)).toBeLessThan(1.5);
      expect(Math.abs(c.y)).toBeLessThan(1.5);
    });

    it(`${kind}: positive area (CCW winding) and fits within ±110`, () => {
      const shape = generateReferenceShape(kind);
      // Positive signed area means CCW in math coordinates.
      expect(Math.abs(signedArea(shape.polygon))).toBeGreaterThan(100);
      const b = polygonBounds(shape.polygon);
      expect(b.minX).toBeGreaterThan(-110);
      expect(b.maxX).toBeLessThan(110);
      expect(b.minY).toBeGreaterThan(-110);
      expect(b.maxY).toBeLessThan(110);
    });

    it(`${kind}: near-twin is well-formed`, () => {
      const twin = nearTwinShape(kind);
      expect(twin.polygon.length).toBeGreaterThanOrEqual(3);
      expect(Math.abs(signedArea(twin.polygon))).toBeGreaterThan(100);
    });
  }
});
