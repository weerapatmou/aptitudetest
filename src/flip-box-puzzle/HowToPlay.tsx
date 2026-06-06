import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Legend } from './Legend';

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
          aria-labelledby="fb-howto-title"
        >
          <motion.div
            initial={{ scale: 0.95, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 8, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-strong bg-bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="fb-howto-title" className="text-lg font-semibold tracking-tight">
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
                A cube with a single mark is shown. Apply the listed{' '}
                <span className="text-text">rotation commands in order</span>, in your head, then pick
                the choice (<span className="text-accent">A–F</span>) that shows where the mark ends up.
              </p>
              <p>
                The other five are wrong: the mark sits on the wrong face, or on the right face turned
                the wrong way — including the spot you'd land on if you do one turn too many or too few.
              </p>
              <p>
                Each command is a quarter turn. Use the reference below; on submit you can replay every
                step to see exactly how the cube moves.
              </p>
            </div>
            <div className="mt-5">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim mb-2">
                The six commands
              </div>
              <Legend />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
