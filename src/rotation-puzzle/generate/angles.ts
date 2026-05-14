import type { Difficulty } from '../types';
import type { Rng } from './rng';
import { normalizeAngle } from './geometry';

type AngleSpec = { min: number; max: number; floor: number };

const SPEC: Record<Difficulty, AngleSpec> = {
  easy:   { min:  30, max: 180, floor: 30 },
  medium: { min:  20, max: 340, floor: 20 },
  hard:   { min:  15, max: 345, floor: 15 },
  expert: { min:  10, max: 350, floor: 10 },
};

export type AngleSample = {
  theta: number;
  needsChiralInternals: boolean;
};

/**
 * Continuous random angle sampler with rejection:
 *  - reject |θ mod 360| < difficulty floor
 *  - reject within ±8° of any rotational-symmetry angle of the outer
 *  - flag near-180° rotations so the caller ensures chiral internals
 *
 * For easy, we sample either positive or negative range (the spec gives the union).
 * For others we sample [floor, 360-floor) and randomly negate sign on harder difficulties.
 */
export function sampleAngle(
  difficulty: Difficulty,
  outerSymmetries: number[],
  rng: Rng,
): AngleSample {
  const spec = SPEC[difficulty];
  for (let i = 0; i < 100; i++) {
    let theta: number;
    if (difficulty === 'easy') {
      // ±[30, 180]
      const magnitude = rng.range(spec.min, spec.max);
      theta = rng.bool() ? magnitude : -magnitude;
    } else {
      const raw = rng.range(spec.min, spec.max);
      theta = rng.bool() ? raw : -raw;
    }
    const norm = ((theta % 360) + 360) % 360;
    const distFromZero = Math.min(norm, 360 - norm);
    if (distFromZero < spec.floor) continue;

    // Reject near outer rotational symmetries.
    let rejected = false;
    for (const s of outerSymmetries) {
      // s is positive 60..180. The figure looks identical if rotated by ±s.
      const candidates = [s, -s, 360 - s, -(360 - s)];
      for (const c of candidates) {
        const d = Math.abs(normalizeAngle(theta - c));
        if (d < 8) { rejected = true; break; }
      }
      if (rejected) break;
    }
    if (rejected) continue;

    const isNear180 = Math.abs(Math.abs(normalizeAngle(theta)) - 180) < 5;
    return { theta, needsChiralInternals: isNear180 };
  }
  // Fallback: pick a comfortable angle that won't fight constraints.
  const fallback = difficulty === 'easy' ? (rng.bool() ? 90 : -90) : (rng.bool() ? 73 : -73);
  return { theta: fallback, needsChiralInternals: false };
}

export function formatAngle(theta: number): string {
  const norm = normalizeAngle(theta);
  const mag = Math.abs(Math.round(norm));
  if (Math.abs(norm) < 0.5 || Math.abs(Math.abs(norm) - 180) < 0.5) return `${mag}°`;
  const dir = norm > 0 ? 'counterclockwise' : 'clockwise';
  return `${mag}° ${dir}`;
}

export const ANGLE_SPEC = SPEC;
