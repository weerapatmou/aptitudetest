import type { Mode } from './types';

const MODES: Array<{ id: Mode; label: string; aria: string }> = [
  { id: 'mirror', label: 'Mirror OK', aria: 'Mirroring allowed' },
  { id: 'strict', label: 'Strict 2D', aria: 'Strict 2D (no mirroring)' },
];

type Props = {
  value: Mode;
  onChange: (m: Mode) => void;
};

export function ModeChips({ value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Assembly mode"
      className="inline-flex items-center gap-1 rounded-xl border border-border bg-bg-card p-1"
    >
      {MODES.map((m) => {
        const active = m.id === value;
        return (
          <button
            key={m.id}
            role="radio"
            aria-checked={active}
            aria-label={m.aria}
            onClick={() => onChange(m.id)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider font-mono transition',
              active
                ? 'bg-accent text-bg shadow-[0_0_18px_-4px_var(--accent)]'
                : 'text-text-dim hover:text-text hover:bg-bg-card-hover',
            ].join(' ')}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
