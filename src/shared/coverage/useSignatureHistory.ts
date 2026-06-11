import { useCallback, useMemo } from 'react';
import { useLocalStorage } from '@/rotation-puzzle/hooks/useLocalStorage';

export type SignatureHistory = {
  /** Set of recently-seen signatures (rolling window). */
  recent: Set<string>;
  /** Append the signatures the user just saw; oldest are pruned past `max`. */
  add: (sigs: string[]) => void;
  has: (sig: string) => boolean;
  clear: () => void;
};

/**
 * Rolling memory of recently-seen puzzle signatures for one test, persisted in
 * localStorage. Used only to bias the "fresh seed" choice away from patterns the
 * user has already practiced. SSR-safe via the shared useLocalStorage.
 *
 * `max` is the window size: large pools default to 150; small-pool tests should
 * pass a smaller value (~40) so the fresh-seed picker can always find a seed
 * that isn't entirely "recent".
 */
export function useSignatureHistory(
  storageKey: string,
  opts?: { max?: number },
): SignatureHistory {
  const max = opts?.max ?? 150;
  const [list, setList] = useLocalStorage<string[]>(storageKey, []);

  const recent = useMemo(() => new Set(list), [list]);

  const add = useCallback(
    (sigs: string[]) => {
      if (sigs.length === 0) return;
      setList((prev) => {
        const merged = prev.concat(sigs);
        return merged.length > max ? merged.slice(merged.length - max) : merged;
      });
    },
    [setList, max],
  );

  const has = useCallback((sig: string) => recent.has(sig), [recent]);
  const clear = useCallback(() => setList([]), [setList]);

  return { recent, add, has, clear };
}
