import type { Difficulty } from './types';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

type Props = {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
};

export function DifficultyChips({ value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Difficulty"
      className="inline-flex items-center gap-1 rounded-xl border border-border bg-bg-card p-1"
    >
      {DIFFICULTIES.map((d) => {
        const active = d === value;
        return (
          <button
            key={d}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(d)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider font-mono transition',
              active
                ? 'bg-accent text-bg shadow-[0_0_18px_-4px_var(--accent)]'
                : 'text-text-dim hover:text-text hover:bg-bg-card-hover',
            ].join(' ')}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}
