import type { AssemblyPuzzle } from './types';
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

function renderQuestion(_puzzle: AssemblyPuzzle, svgs: string[], qIdx: number): string {
  const promptSvg = svgs[0] ?? '';
  const optSvgs = svgs.slice(1, 5); // 4 options A–D

  const opts = optSvgs.map((s, i) => svgOptionBox(s, PRINT_LETTERS[i]!)).join('');

  return (
    `<div class="question">` +
    `<div class="q-label">Q${qIdx + 1} — Which set of pieces assembles into the target shape?</div>` +
    `<div style="display:flex;gap:10px;align-items:flex-start;">` +
    `<div>` +
    `<div style="font-size:9px;color:#64748b;margin-bottom:3px;">Target</div>` +
    svgPromptBox(promptSvg, 80) +
    `</div>` +
    `<div>` +
    `<div style="font-size:9px;color:#64748b;margin-bottom:3px;">Options</div>` +
    `<div class="opts-row">${opts}</div>` +
    `</div>` +
    `</div>` +
    `</div>`
  );
}

export function exportPolygonAssemblyPdf(puzzle: AssemblyPuzzle | null): void {
  if (!puzzle) return;
  const containers = collectQuestionContainers();
  if (containers.length === 0) return;

  const container = containers[0]!;
  const svgs = Array.from(container.querySelectorAll<SVGSVGElement>('svg')).map(serializeSvg);
  const body = renderQuestion(puzzle, svgs, 0);

  const answerKey = renderAnswerKey([{ letter: PRINT_LETTERS[puzzle.correctIndex] ?? '?' }]);

  const html = buildPageHtml('Polygon Assembly — Practice Sheet', 1, body + answerKey);
  openPrintWindow(html);
}
