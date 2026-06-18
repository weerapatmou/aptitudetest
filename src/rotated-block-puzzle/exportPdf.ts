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
  const optSvgs = svgs.slice(1, 6); // 5 choices A–E

  const opts = optSvgs.map((s, i) => svgOptionBox(s, PRINT_LETTERS[i]!)).join('');
  void puzzle;

  return (
    `<div class="question">` +
    `<div class="q-label">Q${qIdx + 1} — Which is a rotation of the reference solid?</div>` +
    `<div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;">` +
    `<div>` +
    `<div style="font-size:9px;color:#64748b;margin-bottom:3px;">Reference</div>` +
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

export function exportRotatedBlockPdf(puzzles: Puzzle[]): void {
  const containers = collectQuestionContainers();
  if (containers.length === 0) return;

  const body = containers
    .map((container, i) => {
      const svgs = Array.from(container.querySelectorAll<SVGSVGElement>('svg')).map(serializeSvg);
      return renderQuestion(puzzles[i]!, svgs, i);
    })
    .join('');

  const answerKey = renderAnswerKey(
    puzzles.slice(0, containers.length).map((p) => ({
      letter: PRINT_LETTERS[p.correctIndex] ?? '?',
    })),
  );

  const html = buildPageHtml('Rotated Block — Practice Sheet', containers.length, body + answerKey);
  openPrintWindow(html);
}
