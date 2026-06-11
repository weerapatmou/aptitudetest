import { useCallback, useRef, useState } from 'react';
import { useLocalStorage } from '@/rotation-puzzle/hooks/useLocalStorage';

/** A fresh random seed: a positive ~30-bit integer, nice to display and feed to makeRng. */
export const randomSeed = (): number => (Math.random() * 1e9) | 0;

/**
 * Parse a user-typed seed. Decimal digits only — keeps it consistent with the
 * `#1234567` display. Returns a non-negative integer, or null when the text is
 * empty / not a plain number. (makeRng truncates to 32 bits internally, so very
 * large values are accepted as-is; we never rewrite what the user typed.)
 */
export function parseSeed(raw: string): number | null {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

export type UseSeed = {
  /** The committed seed that produced the visible set (persisted in localStorage). */
  seed: number;
  /** Current text in the input box. */
  draft: string;
  /** Controlled-input onChange. */
  setDraft: (s: string) => void;
  /** Whether `draft` parses to a valid seed. */
  draftValid: boolean;
  /** Pick a new random seed, commit it, return it. */
  fresh: () => number;
  /** Set seed = n and resync the draft box. */
  commit: (n: number) => void;
  /** Parse the draft; if valid commit + return it, else return null and leave seed untouched. */
  applyDraft: () => number | null;
};

/**
 * Optional behaviour for useSeed. `pickSeed` overrides how a fresh seed is
 * chosen on `fresh()` (e.g. the anti-repeat picker that avoids recently-seen
 * patterns). It's read through a ref so the host can pass a new closure each
 * render (capturing current settings/history) without changing `fresh`'s
 * identity. Defaults to a plain random seed.
 */
export type UseSeedOptions = { pickSeed?: () => number };

export function useSeed(storageKey: string, initial?: number, opts?: UseSeedOptions): UseSeed {
  const [seed, setSeed] = useLocalStorage<number>(storageKey, initial ?? randomSeed());
  const [draft, setDraft] = useState<string>(() => String(seed));

  const pickSeedRef = useRef<(() => number) | undefined>(opts?.pickSeed);
  pickSeedRef.current = opts?.pickSeed;

  const commit = useCallback(
    (n: number) => {
      setSeed(n);
      setDraft(String(n));
    },
    [setSeed],
  );

  const fresh = useCallback(() => {
    const n = (pickSeedRef.current ?? randomSeed)();
    commit(n);
    return n;
  }, [commit]);

  const applyDraft = useCallback(() => {
    const n = parseSeed(draft);
    if (n === null) return null;
    commit(n);
    return n;
  }, [draft, commit]);

  return {
    seed,
    draft,
    setDraft,
    draftValid: parseSeed(draft) !== null,
    fresh,
    commit,
    applyDraft,
  };
}

export type UseSeedSequence = UseSeed & {
  /** Current puzzle index within the deterministic sequence (starts at 0). */
  index: number;
  /** The per-puzzle seed currently on screen: `seed + index`. Reproduces the exact puzzle. */
  current: number;
  /** Advance to the next puzzle in the sequence; returns the new per-puzzle seed. */
  advance: () => number;
  /** Restart the sequence at index 0; returns the per-puzzle seed (== seed). */
  restart: () => number;
};

/**
 * Seed model for single-puzzle tests that show one question at a time. A session
 * seed plus an in-memory index: each puzzle's seed is `seed + index`, so "Next"
 * advances deterministically and "Replay" restarts the same sequence. Picking a
 * fresh seed, applying a typed seed, or committing all reset the index to 0.
 */
export function useSeedSequence(
  storageKey: string,
  initial?: number,
  opts?: UseSeedOptions,
): UseSeedSequence {
  const base = useSeed(storageKey, initial, opts);
  const [index, setIndex] = useState(0);

  const advance = useCallback(() => {
    const next = index + 1;
    setIndex(next);
    return base.seed + next;
  }, [index, base.seed]);

  const restart = useCallback(() => {
    setIndex(0);
    return base.seed;
  }, [base.seed]);

  const fresh = useCallback(() => {
    const n = base.fresh();
    setIndex(0);
    return n;
  }, [base]);

  const applyDraft = useCallback(() => {
    const n = base.applyDraft();
    if (n !== null) setIndex(0);
    return n;
  }, [base]);

  const commit = useCallback(
    (n: number) => {
      base.commit(n);
      setIndex(0);
    },
    [base],
  );

  return {
    ...base,
    fresh,
    applyDraft,
    commit,
    index,
    current: base.seed + index,
    advance,
    restart,
  };
}
