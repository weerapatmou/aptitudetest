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

function correctLetters(puzzle: Puzzle): string {
  return puzzle.correctIndices.map((i) => PRINT_LETTERS[i] ?? '?').join(', ');
}

function renderQuestion(_puzzle: Puzzle, svgs: string[], qIdx: number): string {
  const promptSvg = svgs[0] ?? '';
  const optSvgs = svgs.slice(1, 5); // 4 choices A–D

  const opts = optSvgs.map((s, i) => svgOptionBox(s, PRINT_LETTERS[i]!)).join('');

  return (
    `<div class="question">` +
    `<div class="q-label">Q${qIdx + 1} — Which piece(s) fit the gap?</div>` +
    `<div style="display:flex;gap:10px;align-items:flex-start;">` +
    `<div>` +
    `<div style="font-size:9px;color:#64748b;margin-bottom:3px;">Shape with gap</div>` +
    svgPromptBox(promptSvg, 80) +
    `</div>` +
    `<div>` +
    `<div style="font-size:9px;color:#64748b;margin-bottom:3px;">Options (select all that fit)</div>` +
    `<div class="opts-row">${opts}</div>` +
    `</div>` +
    `</div>` +
    `</div>`
  );
}

export function exportTwoDPdf(puzzles: Puzzle[]): void {
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
      letter: correctLetters(p),
    })),
  );

  const html = buildPageHtml('2D Puzzle — Practice Sheet', containers.length, body + answerKey);
  openPrintWindow(html);
}
