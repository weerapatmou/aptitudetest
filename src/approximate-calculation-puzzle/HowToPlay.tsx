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
          aria-labelledby="approx-howto-title"
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
              <h2 id="approx-howto-title" className="text-lg font-semibold tracking-tight">
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
                Each question is a short word problem with numbers chosen to sit{' '}
                <span className="text-accent">just off round values</span> (like 14.95, 7.9, or
                995). Don't compute exactly — <span className="text-text">round</span> the numbers
                and estimate in your head.
              </p>
              <p>
                The five options are an evenly-spaced ladder. The correct answer is the one{' '}
                <span className="text-text">closest to the true value</span>, so a quick rounded
                estimate is enough to land on it.
              </p>
              <p>
                After you answer, the reveal panel shows the formula and the quick mental shortcut
                that gets you there.
              </p>
              <div className="rounded-lg border border-border bg-bg p-3 font-mono text-xs space-y-1">
                <div><kbd className="px-1.5 py-0.5 rounded bg-bg-card-hover">←/→</kbd> move focus</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-bg-card-hover">Enter</kbd> select / next</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-bg-card-hover">N</kbd> next question</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
