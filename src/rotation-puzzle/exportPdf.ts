import type { Puzzle } from './types';
import {
  PRINT_LETTERS,
  buildPageHtml,
  collectQuestionContainers,
  openPrintWindow,
  renderAnswerKey,
  serializeSvg,
  svgOptionBox,
  svgPromptBox,
} from '../shared/exportPdf';

function renderQuestion(puzzle: Puzzle, svgs: string[], qIdx: number): string {
  const promptSvg = svgs[0] ?? '';
  const optSvgs = svgs.slice(1, 5); // 4 candidates A–D

  const opts = optSvgs.map((s, i) => svgOptionBox(s, PRINT_LETTERS[i]!)).join('');

  void puzzle; // correctIndex used below in the export function

  return (
    `<div class="question">` +
    `<div class="q-label">Q${qIdx + 1} — Which option is a valid rotation of the original figure?</div>` +
    `<div style="display:flex;gap:10px;align-items:flex-start;">` +
    `<div>` +
    `<div style="font-size:9px;color:#64748b;margin-bottom:3px;">Original</div>` +
    svgPromptBox(promptSvg, 90) +
    `</div>` +
    `<div>` +
    `<div style="font-size:9px;color:#64748b;margin-bottom:3px;">Options</div>` +
    `<div class="opts-row">${opts}</div>` +
    `</div>` +
    `</div>` +
    `</div>`
  );
}

export function exportRotationPdf(puzzle: Puzzle | null): void {
  if (!puzzle) return;
  const containers = collectQuestionContainers();
  if (containers.length === 0) return;

  const container = containers[0]!;
  const svgs = Array.from(container.querySelectorAll<SVGSVGElement>('svg')).map(serializeSvg);
  const body = renderQuestion(puzzle, svgs, 0);

  const correctIdx = puzzle.correctIndex;
  const answerKey = renderAnswerKey([{ letter: PRINT_LETTERS[correctIdx] ?? '?' }]);

  const html = buildPageHtml('Rotation Puzzle — Practice Sheet', 1, body + answerKey);
  openPrintWindow(html);
}
