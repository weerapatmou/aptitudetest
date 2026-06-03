import type { Rng } from './rng';

export function roundDec(n: number, places = 0): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

export function round1(n: number): number {
  return roundDec(n, 1);
}

/**
 * Pick a value near `round` by nudging it off by a small fraction so the solver
 * has to round it back to estimate. e.g. messyNear(rng, 15) -> 14.8 / 15.1;
 * messyNear(rng, 500) -> 495 / 510. Never lands exactly on `round`.
 */
export function messyNear(
  rng: Rng,
  round: number,
  opts?: { decimals?: 0 | 1 | 2 },
): number {
  const decimals = opts?.decimals ?? (round < 100 ? 1 : 0);
  // Small jitter so the messy value still visibly rounds back to `round`.
  const frac = rng.range(-0.025, 0.025);
  const f = Math.pow(10, decimals);
  let v = Math.round(round * (1 + frac) * f) / f;
  if (v === round) v = round + (rng.bool() ? 1 / f : -1 / f);
  return v;
}

/** Format a number with thousands separators and fixed decimals. */
export function fmt(n: number, precision = 0): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}
