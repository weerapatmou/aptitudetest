import { randomSeed as defaultRandomSeed } from '@/shared/seed/useSeed';

/**
 * Choose a fresh seed whose puzzles overlap the least with what the user has
 * recently seen. This is the ONLY place cross-session history influences
 * generation — it picks the seed, never the deterministic generation from a
 * committed seed. So "replay seed X" / "type seed X" always rebuild set X.
 *
 * Tries `candidates` random seeds, previews each one's signatures (cheaply — a
 * prefix is enough), and returns the lowest-overlap seed. Short-circuits on the
 * first zero-overlap candidate (the common case once the pool is large).
 */
export function pickFreshSeed(opts: {
  previewSignatures: (seed: number) => string[];
  recent: ReadonlySet<string>;
  candidates?: number;
  randomSeed?: () => number;
}): { seed: number; signatures: string[] } {
  const n = Math.max(1, opts.candidates ?? 6);
  const rnd = opts.randomSeed ?? defaultRandomSeed;
  let best: { seed: number; signatures: string[]; overlap: number } | null = null;
  for (let i = 0; i < n; i++) {
    const seed = rnd();
    const signatures = opts.previewSignatures(seed);
    let overlap = 0;
    for (const s of signatures) if (opts.recent.has(s)) overlap++;
    if (best === null || overlap < best.overlap) {
      best = { seed, signatures, overlap };
      if (overlap === 0) break;
    }
  }
  return { seed: best!.seed, signatures: best!.signatures };
}
