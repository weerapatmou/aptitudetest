import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Props = { open: boolean; onClose: () => void };

export function HowToPlay({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="howto-title-assembly"
        >
          <motion.div
            initial={{ scale: 0.95, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 8, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="max-w-md w-full rounded-2xl border border-border-strong bg-bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="howto-title-assembly" className="text-lg font-semibold tracking-tight">
                How to play
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-text-dim hover:text-text px-2 py-1 rounded-md hover:bg-bg-card-hover"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm text-text-dim leading-relaxed">
              <p>
                A <span className="text-accent">target silhouette</span> is shown at the top.
                Five candidate sets (A–E) of <span className="text-text">scattered pieces</span> sit
                below — pick the one set whose pieces actually assemble into the target.
              </p>
              <p>
                Use <span className="text-text">Mirror OK</span> to allow flipping pieces during
                assembly. Switch to <span className="text-text">Strict 2D</span> for rotation-only
                — at least one distractor will then secretly require a mirror (you must reject it).
              </p>
              <p className="text-text-dim/85">
                When you click any option, all five cards animate piece-by-piece toward the target.
                <span className="text-wrong"> Red squares</span> mark gaps,{' '}
                <span style={{ color: '#ff8a3a' }}>orange squares</span> mark overlaps, and
                mirrored pieces in Strict mode <span className="text-wrong">shake</span>.
              </p>
              <div className="rounded-lg border border-border bg-bg p-3 font-mono text-xs space-y-1">
                <div><kbd className="px-1.5 py-0.5 rounded bg-bg-card-hover">←/→</kbd> move focus</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-bg-card-hover">Enter</kbd> select</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-bg-card-hover">N</kbd> next puzzle</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
