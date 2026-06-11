import clsx from 'clsx';

export type SeedBarProps = {
  seed: number;
  draft: string;
  draftValid: boolean;
  onDraftChange: (s: string) => void;
  /** Commit the typed seed + regenerate (host wires the regenerate). */
  onApply: () => void;
  /** Pick a fresh random seed + regenerate. */
  onNew: () => void;
  /** Re-run the current committed seed. */
  onReplay: () => void;
  className?: string;
  /** 'full' = editable input + Apply/New/Replay. 'compact' = read-only display + New/Replay. */
  variant?: 'full' | 'compact';
  /** Label for the "new random seed" button (defaults to "New"). */
  newLabel?: string;
};

const pill =
  'px-3 py-2 rounded-lg font-mono uppercase tracking-wider text-[11px] font-semibold bg-accent text-bg hover:shadow-[0_0_20px_-4px_var(--accent)] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none';
const outline =
  'px-3 py-2 rounded-lg font-mono uppercase tracking-wider text-[11px] border border-accent/40 text-accent hover:bg-accent/10 transition';

/**
 * Shared seed control: shows the seed that produced the current set and lets the
 * user paste/type a seed to reproduce an exact set, roll a fresh one, or replay.
 * Purely presentational — all regeneration is wired by the host via callbacks.
 */
export function SeedBar({
  seed,
  draft,
  draftValid,
  onDraftChange,
  onApply,
  onNew,
  onReplay,
  className,
  variant = 'full',
  newLabel = 'New',
}: SeedBarProps) {
  const invalid = variant === 'full' && draft.trim().length > 0 && !draftValid;

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center gap-2 rounded-xl border border-border bg-bg/40 p-2.5 font-mono text-xs',
        className,
      )}
    >
      <span className="text-text-dim/70 uppercase tracking-wider pl-1">Seed</span>

      {variant === 'full' ? (
        <div className="flex items-center gap-1.5">
          <span className="text-text-dim/50">#</span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Seed"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draftValid) onApply();
            }}
            className={clsx(
              'w-32 px-2 py-1.5 rounded-md border bg-bg-card text-text font-mono text-xs tabular-nums focus:outline-none focus:border-accent',
              invalid ? 'border-wrong' : 'border-border',
            )}
          />
          <button onClick={onApply} disabled={!draftValid} className={pill}>
            Use seed
          </button>
        </div>
      ) : (
        <span className="text-text tabular-nums">#{seed}</span>
      )}

      <div className="ml-auto flex items-center gap-2">
        <button onClick={onReplay} className={outline}>
          ⟳ Replay
        </button>
        <button onClick={onNew} className={pill}>
          {newLabel}
        </button>
      </div>
    </div>
  );
}

export default SeedBar;
