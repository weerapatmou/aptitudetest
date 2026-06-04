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
          aria-labelledby="block-howto-title"
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
              <h2 id="block-howto-title" className="text-lg font-semibold tracking-tight">
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
                Each question shows blocks stacked in 3D. All blocks are the same size, and every
                block has <span className="text-text">six faces</span> (the ends count too).
              </p>
              <p>
                For every labelled block (<span className="text-accent">A, B, C…</span>), type in how
                many of its faces are pressed <span className="text-text">flat against another
                block</span>. A face only counts when two flat faces meet —{' '}
                <span className="text-text">contact at an edge or a corner does not count</span>.
              </p>
              <p>
                The answer for a block is therefore a number from{' '}
                <span className="text-text">0 to 6</span>. Picture the hidden sides too: a block at
                the back of a stack can touch neighbours you cannot fully see.
              </p>
              <p>
                Answer every block in any order, then press{' '}
                <span className="text-text">Submit</span> to reveal the correct counts. Difficulty
                labels stay hidden until you submit.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
