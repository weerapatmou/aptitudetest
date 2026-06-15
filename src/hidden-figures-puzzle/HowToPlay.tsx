type Props = {
  onClose: () => void;
};

export function HowToPlay({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full rounded-2xl border border-border bg-bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-dim hover:text-text transition font-mono text-sm"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="font-display text-lg font-semibold text-text mb-4">
          How to Play — Hidden Figures
        </h2>

        <ol className="space-y-3 text-sm text-text-dim leading-relaxed">
          <li className="flex gap-3">
            <span className="font-mono text-accent font-bold shrink-0">1.</span>
            <span>
              Five simple shapes are shown at the top, labeled <strong className="text-text">(A)</strong> through <strong className="text-text">(E)</strong>. Study them carefully.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-accent font-bold shrink-0">2.</span>
            <span>
              Each numbered figure below is more complex — but one of the five simple shapes is <strong className="text-text">hidden inside it</strong>. The shape's edges are present in the complex figure, but obscured by extra lines.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-accent font-bold shrink-0">3.</span>
            <span>
              For each question, click <strong className="text-text">A, B, C, D, or E</strong> to select the simple shape you find hidden in the complex figure.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-accent font-bold shrink-0">4.</span>
            <span>
              When done, click <strong className="text-text">Submit</strong> to check all your answers at once.
            </span>
          </li>
        </ol>

        <div className="mt-5 rounded-lg border border-border/50 bg-bg p-3 font-mono text-[11px] text-text-dim/70">
          <strong className="text-accent">Tip:</strong> The hidden shape may be rotated up to ±45° on harder difficulties, but its outline is always fully present in the complex figure.
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2 rounded-lg bg-accent text-bg font-mono text-xs uppercase tracking-wider hover:shadow-[0_0_20px_-4px_var(--accent)] transition"
        >
          Got it →
        </button>
      </div>
    </div>
  );
}
