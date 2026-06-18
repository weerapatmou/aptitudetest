import type { SeriesQuestion } from './types';
import { PRINT_C, PRINT_LETTERS, buildPageHtml, openPrintWindow, renderAnswerKey } from '../shared/exportPdf';

const C = PRINT_C;

function renderQuestion(q: SeriesQuestion, qIdx: number): string {
  const terms = q.visibleTerms
    .map((t) => (t === null ? '<span style="color:#0891b2;font-weight:700">___</span>' : String(t)))
    .join('&nbsp;&nbsp;,&nbsp;&nbsp;');

  const opts = q.options
    .map((opt, i) => {
      const letter = PRINT_LETTERS[i] ?? '?';
      return (
        `<span style="display:inline-block;margin-right:16px;font-family:monospace;">` +
        `<span style="font-weight:700;">${letter})</span>&nbsp;${opt.value}` +
        `</span>`
      );
    })
    .join('');

  return (
    `<div class="question">` +
    `<div class="q-label">Q${qIdx + 1}</div>` +
    `<div style="font-size:13px;font-family:monospace;margin-bottom:10px;line-height:2;">${terms}</div>` +
    `<div style="font-size:11px;color:${C.textDim};margin-top:4px;">${opts}</div>` +
    `</div>`
  );
}

export function exportSeriesPdf(questions: SeriesQuestion[]): void {
  if (questions.length === 0) return;

  const qBlocks = questions.map((q, i) => renderQuestion(q, i)).join('');
  const answerKey = renderAnswerKey(
    questions.map((q) => ({
      letter: PRINT_LETTERS[q.options.findIndex((o) => o.isCorrect)] ?? '?',
    })),
  );

  const html = buildPageHtml(
    'Number Series — Practice Sheet',
    questions.length,
    qBlocks + answerKey,
  );
  openPrintWindow(html);
}
