import clsx from 'clsx';
import type { HiddenQuestion } from './types';

const LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

type Props = {
  question: HiddenQuestion;
  qIdx: number;
  answer: number;
  submitted: boolean;
  onPick: (labelIdx: number) => void;
};

export function ComplexFigureCard({ question, qIdx, answer, submitted, onPick }: Props) {
  const { complexFigure, correctIndex } = question;
  const isAnswered = answer !== -1;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg-card p-3">
      {/* Question number */}
      <div className="font-mono text-[10px] tracking-widest text-text-dim/60">
        {qIdx + 1}.
      </div>

      {/* Complex figure SVG */}
      <div className="flex items-center justify-center bg-bg rounded-lg border border-border/50 p-2">
        <svg
          viewBox={complexFigure.viewBox}
          className="w-32 h-32 md:w-40 md:h-40"
          aria-label={`Complex figure ${qIdx + 1}`}
        >
          {complexFigure.segments.map((seg, i) => {
            const isHidden = submitted && i < complexFigure.hiddenSegmentCount;
            return (
              <line
                key={i}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke={isHidden ? 'var(--color-accent-warm)' : 'currentColor'}
                strokeWidth={isHidden ? 3.5 : 2}
                strokeLinecap="round"
                className={isHidden ? '' : 'text-text'}
              />
            );
          })}
        </svg>
      </div>

      {/* Answer buttons A–E */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {LABELS.map((label, i) => {
          const isSelected = answer === i;
          const isCorrect = submitted && i === correctIndex;
          const isWrong = submitted && isSelected && i !== correctIndex;

          return (
            <button
              key={label}
              onClick={() => !submitted && onPick(i)}
              disabled={submitted}
              aria-label={`Answer ${label}`}
              className={clsx(
                'w-8 h-8 rounded-lg font-mono text-xs font-bold transition border',
                isCorrect
                  ? 'bg-correct/20 border-correct text-correct'
                  : isWrong
                    ? 'bg-wrong/20 border-wrong text-wrong'
                    : isSelected
                      ? 'bg-accent text-bg border-accent shadow-[0_0_10px_-2px_var(--accent)]'
                      : submitted
                        ? 'border-border text-text-dim/40 bg-bg cursor-not-allowed'
                        : 'border-border text-text-dim hover:bg-bg-card-hover hover:text-text hover:border-accent/50',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Post-submit: show correct answer label if user was wrong or unanswered */}
      {submitted && (!isAnswered || answer !== correctIndex) && (
        <div className="font-mono text-[10px] text-text-dim/50 text-center">
          answer: <span className="text-correct">{LABELS[correctIndex]}</span>
        </div>
      )}
    </div>
  );
}
