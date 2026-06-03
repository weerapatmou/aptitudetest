import type { ApproxQuestion } from './types';

type Props = {
  question: ApproxQuestion;
  questionNumber: number;
  totalQuestions: number;
};

export function QuestionCard({ question, questionNumber, totalQuestions }: Props) {
  return (
    <div className="rounded-2xl border-2 border-accent/40 bg-bg-card p-5 md:p-7 shadow-[0_0_40px_-12px_var(--accent)]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim">
          Question {questionNumber} <span className="text-text-dim/50">/ {totalQuestions}</span>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
          Estimate
        </div>
      </div>

      <p className="text-lg md:text-xl text-text leading-relaxed">{question.problem.prompt}</p>

      <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim/80">
        Pick the closest value{' '}
        <span className="text-text-dim/60 normal-case tracking-normal">
          ({question.problem.unit})
        </span>
      </div>
    </div>
  );
}
