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
          aria-labelledby="cube-howto-title"
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
              <h2 id="cube-howto-title" className="text-lg font-semibold tracking-tight">
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
                Each question shows a stack of identical cubes. Count{' '}
                <span className="text-text">how many cubes there are in total</span> and pick the
                matching number from <span className="text-accent">a, b, c, d</span>.
              </p>
              <p>
                <span className="text-text">Don't forget the hidden cubes.</span> Every cube you can
                see rests on the cubes beneath it — there are exactly enough hidden cubes to support
                what's visible, and no extras. Counting only the cubes you can see is the most common
                mistake.
              </p>
              <p>
                Answer every question in any order, then press{' '}
                <span className="text-text">Submit</span> to reveal the totals — visible plus hidden
                — and why each wrong number is wrong.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
