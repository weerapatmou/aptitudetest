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
          aria-labelledby="frs-howto-title"
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
              <h2 id="frs-howto-title" className="text-lg font-semibold tracking-tight">
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
                Each question shows one outline shape on the left. Exactly one of the five choices
                (<span className="text-accent">A, B, C, D, E</span>) is the{' '}
                <span className="text-text">same outline simply turned to a different angle</span>.
                Pick it.
              </p>
              <p>
                The other four can never be made to match by turning. They are{' '}
                <span className="text-text">mirror images</span>, or have a corner moved, added or
                removed, or have been stretched or slanted out of shape. Turn the outline in your
                head and compare.
              </p>
              <p>
                Answer every question in any order, then press{' '}
                <span className="text-text">Submit</span> to reveal the correct letters and why each
                wrong outline is different.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
