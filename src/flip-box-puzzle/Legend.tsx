import type { Command } from './types';
import { COMMAND_LABEL, COMMANDS } from './types';
import { CubeFigure } from './CubeFigure';
import { applyCommand, IDENTITY, resolvePlacement } from './generate/cube';

const START = resolvePlacement(IDENTITY);

/** Visual reference for the six commands: a before→after mini cube for each. */
export function Legend({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {COMMANDS.map((cmd) => (
          <CommandDemo key={cmd} command={cmd} />
        ))}
      </div>
    </div>
  );
}

function CommandDemo({ command }: { command: Command }) {
  const after = resolvePlacement(applyCommand(IDENTITY, command));
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-bg/30 p-2">
      <div className="flex items-center gap-1">
        <CubeFigure placement={START} className="h-12 w-12" markColor="var(--text-dim, #98a)" ariaLabel="before" />
        <span className="text-text-dim text-sm">→</span>
        <CubeFigure placement={after} className="h-12 w-12" ariaLabel={`after ${command}`} />
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
        {COMMAND_LABEL[command]}
      </div>
    </div>
  );
}
