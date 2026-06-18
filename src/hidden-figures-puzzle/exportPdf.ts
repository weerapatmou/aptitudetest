import type { HiddenFiguresSession, HiddenQuestion } from './types';
import {
  PRINT_C,
  buildPageHtml,
  collectQuestionContainers,
  openPrintWindow,
  serializeSvg,
  svgPromptBox,
} from '../shared/exportPdf';

const C = PRINT_C;

function renderPreamble(svgs: string[]): string {
  const labels = ['A', 'B', 'C', 'D', 'E'];
  const cells = svgs
    .map((s, i) =>
      `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;">` +
      `<div style="width:50px;height:50px;">${s}</div>` +
      `<span style="font-size:10px;font-weight:700;color:${C.fill};">${labels[i] ?? ''}</span>` +
      `</div>`,
    )
    .join('');

  return (
    `<div style="margin-bottom:16px;padding:10px 12px;border:1.5px solid ${C.border};border-radius:10px;background:${C.cardBg};page-break-inside:avoid;">` +
    `<div style="font-size:10px;font-weight:700;color:${C.textDim};margin-bottom:8px;letter-spacing:0.1em;text-transform:uppercase;">Simple Shapes</div>` +
    `<div style="display:flex;gap:12px;align-items:center;">${cells}</div>` +
    `</div>`
  );
}

function renderQuestion(_question: HiddenQuestion, svgs: string[], qIdx: number): string {
  const figureSvg = svgs[0] ?? '';

  return (
    `<div class="question" style="display:inline-flex;flex-direction:column;align-items:center;gap:6px;width:140px;vertical-align:top;margin:4px;">` +
    `<div class="q-label" style="text-align:center;">Q${qIdx + 1}</div>` +
    svgPromptBox(figureSvg, 110) +
    `</div>`
  );
}

function renderAnswerKeyHidden(questions: HiddenQuestion[]): string {
  const cells = questions
    .map((q, i) =>
      `<div class="ak-cell"><span class="ak-qnum">Q${i + 1}</span><span class="ak-letter">${q.correctLabel}</span></div>`,
    )
    .join('');
  return (
    `<div class="answer-key"><div class="ak-title">ANSWER KEY</div>` +
    `<div class="ak-grid">${cells}</div></div>`
  );
}

export function exportHiddenFiguresPdf(session: HiddenFiguresSession | null): void {
  if (!session) return;

  const preambleEl = document.querySelector<HTMLElement>('[data-pdf-preamble]');
  const containers = collectQuestionContainers();

  if (containers.length === 0 && !preambleEl) return;

  const preambleSvgs = preambleEl
    ? Array.from(preambleEl.querySelectorAll<SVGSVGElement>('svg')).map(serializeSvg)
    : [];

  const questionsHtml = containers
    .map((container, i) => {
      const svgs = Array.from(container.querySelectorAll<SVGSVGElement>('svg')).map(serializeSvg);
      return renderQuestion(session.questions[i]!, svgs, i);
    })
    .join('');

  const preambleHtml = preambleSvgs.length > 0 ? renderPreamble(preambleSvgs) : '';
  const answersHtml = renderAnswerKeyHidden(session.questions.slice(0, containers.length));

  const body =
    preambleHtml +
    `<div style="margin-bottom:14px;">${questionsHtml}</div>` +
    answersHtml;

  const html = buildPageHtml(
    'Hidden Figures — Practice Sheet',
    containers.length,
    body,
  );
  openPrintWindow(html);
}
