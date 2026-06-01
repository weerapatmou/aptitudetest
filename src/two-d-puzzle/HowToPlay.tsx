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
          aria-labelledby="twod-howto-title"
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
              <h2 id="twod-howto-title" className="text-lg font-semibold tracking-tight">
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
                Each question shows a main shape on the left — a square with a chunk missing.
                Select the combination of pieces (<span className="text-accent">a, b, c, d</span>)
                that can be <span className="text-text">rotated and combined</span> to fit
                perfectly into the gap and complete the square.
              </p>
              <p>
                <span className="text-text">More than one piece can be correct.</span> A question
                may need one piece, or several together. Pieces are never flipped — a mirror image
                is always a wrong choice.
              </p>
              <p>
                Answer every question in any order, then press{' '}
                <span className="text-text">Submit</span> to reveal the completed square, the
                correct letters, and why each wrong piece doesn't belong. Difficulty labels stay
                hidden until you submit, so you can scan and tackle the easy ones first.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
