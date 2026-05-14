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
          aria-labelledby="howto-title-matching"
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
              <h2 id="howto-title-matching" className="text-lg font-semibold tracking-tight">
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
                <span className="text-text font-medium">Find the option</span> whose two pieces, when
                rotated and joined together without overlap, reproduce the{' '}
                <span className="text-accent">reference shape</span> exactly.
              </p>
              <p>
                <span className="text-accent">Reject any option</span> where: the combined shape has
                the wrong proportions, the joining edges don't interlock, the combined shape is too
                large or too small, or the pieces leave a gap (or overlap) where they should meet.
              </p>
              <p className="text-text-dim/85">
                Click any choice — the pieces will snap together so you can compare your answer to
                the reference side-by-side.
              </p>
              <div className="rounded-lg border border-border bg-bg p-3 font-mono text-xs space-y-1">
                <div><kbd className="px-1.5 py-0.5 rounded bg-bg-card-hover">←/→/↑/↓</kbd> move focus</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-bg-card-hover">Enter</kbd> select</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-bg-card-hover">N</kbd> next question</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
