import type { ApproxQuestion } from './types';
import { PRINT_C, PRINT_LETTERS, buildPageHtml, openPrintWindow, renderAnswerKey } from '../shared/exportPdf';

const C = PRINT_C;

function fmtValue(value: number, unit: string, precision: number): string {
  const num = value.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  if (unit === '$') return `$${num}`;
  if (unit === '%') return `${num}%`;
  return `${num}${unit ? ' ' + unit : ''}`;
}

function renderQuestion(q: ApproxQuestion, qIdx: number): string {
  const { problem } = q;

  const opts = q.options
    .map((opt, i) => {
      const letter = PRINT_LETTERS[i] ?? '?';
      const val = fmtValue(opt.value, problem.unit, problem.precision);
      return (
        `<span style="display:inline-block;margin-right:16px;font-family:monospace;">` +
        `<span style="font-weight:700;">${letter})</span>&nbsp;${val}` +
        `</span>`
      );
    })
    .join('');

  return (
    `<div class="question">` +
    `<div class="q-label">Q${qIdx + 1}</div>` +
    `<div style="font-size:12px;margin-bottom:10px;line-height:1.6;">${problem.prompt}</div>` +
    `<div style="font-size:11px;color:${C.textDim};margin-top:4px;">${opts}</div>` +
    `</div>`
  );
}

export function exportApproxPdf(questions: ApproxQuestion[]): void {
  if (questions.length === 0) return;

  const qBlocks = questions.map((q, i) => renderQuestion(q, i)).join('');
  const answerKey = renderAnswerKey(
    questions.map((q) => ({
      letter: PRINT_LETTERS[q.options.findIndex((o) => o.isCorrect)] ?? '?',
    })),
  );

  const html = buildPageHtml(
    'Approximate Calculation — Practice Sheet',
    questions.length,
    qBlocks + answerKey,
  );
  openPrintWindow(html);
}
