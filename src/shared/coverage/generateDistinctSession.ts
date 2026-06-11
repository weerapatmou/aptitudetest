/**
 * Build a session of `count` items where no two share the same signature, using
 * a seeded generator. `makeOne` must draw only from a seeded Rng so the whole
 * thing stays deterministic per seed: each retry simply advances the same rng
 * stream (exactly like the retry loops already in several generators). The
 * `seen` set is rebuilt every call from the seed-driven sequence, so no external
 * state leaks in — `generateDistinctSession` with the same `makeOne`/seed is
 * reproducible, and the existing "same seed => identical session" tests hold.
 *
 * If every retry for a slot collides (a tiny pattern pool), the last candidate
 * is accepted anyway, so the result always has exactly `count` items.
 */
export function generateDistinctSession<T>(
  count: number,
  makeOne: () => T,
  sig: (item: T) => string,
  opts?: { retriesPerItem?: number },
): T[] {
  const retries = opts?.retriesPerItem ?? 8;
  const seen = new Set<string>();
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    let chosen = makeOne();
    let chosenSig = sig(chosen);
    for (let r = 0; r < retries && seen.has(chosenSig); r++) {
      chosen = makeOne();
      chosenSig = sig(chosen);
    }
    out.push(chosen);
    seen.add(chosenSig);
  }
  return out;
}
