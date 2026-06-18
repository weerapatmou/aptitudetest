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

  void puzzle;

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

export function exportRotationPdf(puzzles: Puzzle[]): void {
  if (!puzzles.length) return;
  const containers = collectQuestionContainers();
  if (containers.length === 0) return;

  const body = containers
    .map((container, i) => {
      const puzzle = puzzles[i];
      if (!puzzle) return '';
      const svgs = Array.from(container.querySelectorAll<SVGSVGElement>('svg')).map(serializeSvg);
      return renderQuestion(puzzle, svgs, i);
    })
    .join('');

  const answerKey = renderAnswerKey(
    puzzles.map((p) => ({ letter: PRINT_LETTERS[p.correctIndex] ?? '?' })),
  );

  const html = buildPageHtml('Rotation Puzzle — Practice Sheet', puzzles.length, body + answerKey);
  openPrintWindow(html);
}
