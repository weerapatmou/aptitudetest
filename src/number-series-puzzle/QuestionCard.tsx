import clsx from 'clsx';
import type { SeriesQuestion } from './types';
import { DifficultyBadge } from './DifficultyBadge';

type Props = {
  question: SeriesQuestion;
  questionNumber: number;
  totalQuestions: number;
};

export function QuestionCard({ question, questionNumber, totalQuestions }: Props) {
  return (
    <div className="rounded-2xl border-2 border-accent/40 bg-bg-card p-5 md:p-7 shadow-[0_0_40px_-12px_var(--accent)]">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim">
          Question {questionNumber} <span className="text-text-dim/50">/ {totalQuestions}</span>
        </div>
        <DifficultyBadge difficulty={question.difficulty} />
      </div>

      <div
        className="flex flex-wrap items-center justify-center gap-2 md:gap-3 py-4"
        aria-label="Number sequence"
        role="list"
      >
        {question.visibleTerms.map((term, i) => {
          const isBlank = term === null;
          const isLast = i === question.visibleTerms.length - 1;
          return (
            <div key={i} className="flex items-center gap-2 md:gap-3">
              <div
                role="listitem"
                aria-label={isBlank ? 'missing term' : `term ${i + 1}: ${term}`}
                className={clsx(
                  'min-w-[3rem] md:min-w-[3.5rem] h-12 md:h-14 rounded-lg border px-3 flex items-center justify-center font-mono tabular-nums text-lg md:text-xl',
                  isBlank
                    ? 'border-accent border-dashed text-accent bg-accent/5 animate-pulse-slow'
                    : 'border-border bg-bg/40 text-text',
                )}
              >
                {isBlank ? '?' : term}
              </div>
              {!isLast && <span className="text-text-dim/50 font-mono">,</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
