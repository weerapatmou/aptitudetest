import { describe, it, expect } from 'vitest';
import { generateDistinctSession } from '../generateDistinctSession';
import { pickFreshSeed } from '../pickFreshSeed';

describe('generateDistinctSession', () => {
  it('returns exactly `count` items and avoids duplicate signatures when the pool is large', () => {
    // makeOne walks a large deterministic pool; signature is the value itself.
    let n = 0;
    const out = generateDistinctSession(10, () => n++, (x) => String(x));
    expect(out).toHaveLength(10);
    expect(new Set(out.map(String)).size).toBe(10);
  });

  it('never loops forever and still returns `count` when the pool is tiny', () => {
    // Only two distinct signatures exist; retries can't find more, but it must
    // still fill the session (accepting repeats once retries are exhausted).
    let i = 0;
    const out = generateDistinctSession(6, () => i++ % 2, (x) => String(x), { retriesPerItem: 4 });
    expect(out).toHaveLength(6);
  });

  it('is deterministic for a given (seeded) makeOne sequence', () => {
    const run = () => {
      let n = 100;
      return generateDistinctSession(8, () => n++, (x) => String(x));
    };
    expect(run()).toEqual(run());
  });
});

describe('pickFreshSeed', () => {
  it('prefers a seed whose signatures do not overlap recent history', () => {
    const recent = new Set(['a', 'b', 'c']);
    // seed 1 -> all-seen; seed 2 -> partial; seed 3 -> fresh.
    const table: Record<number, string[]> = { 1: ['a', 'b'], 2: ['a', 'x'], 3: ['x', 'y'] };
    const seeds = [1, 2, 3];
    let k = 0;
    const { seed, signatures } = pickFreshSeed({
      recent,
      previewSignatures: (s) => table[s] ?? [],
      candidates: 3,
      randomSeed: () => seeds[k++ % seeds.length]!,
    });
    expect(seed).toBe(3);
    expect(signatures).toEqual(['x', 'y']);
  });

  it('works with empty history (returns the first candidate, zero overlap)', () => {
    const { seed } = pickFreshSeed({
      recent: new Set<string>(),
      previewSignatures: () => ['p', 'q'],
      candidates: 5,
      randomSeed: () => 42,
    });
    expect(seed).toBe(42);
  });
});
