// Seedable PRNG so generation is reproducible in tests.
// mulberry32 - small, well-distributed, plenty for our purposes.

export type Rng = {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (minInclusive: number, maxExclusive: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  bool: (p?: number) => boolean;
  shuffle: <T>(arr: T[]) => T[];
};

export function makeRng(seed?: number): Rng {
  let s = (seed ?? ((Math.random() * 0xffffffff) | 0)) >>> 0;
  if (s === 0) s = 0x9e3779b9;
  const next = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (min: number, max: number) => min + (max - min) * next();
  const int = (minInclusive: number, maxExclusive: number) =>
    Math.floor(range(minInclusive, maxExclusive));
  const pick = <T>(arr: readonly T[]): T => arr[int(0, arr.length)]!;
  const bool = (p = 0.5) => next() < p;
  const shuffle = <T>(arr: T[]): T[] => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = int(0, i + 1);
      [a[i]!, a[j]!] = [a[j]!, a[i]!];
    }
    return a;
  };
  return { next, range, int, pick, bool, shuffle };
}

// Default ambient rng. Tests can construct their own with makeRng(seed).
export const defaultRng: Rng = makeRng();
