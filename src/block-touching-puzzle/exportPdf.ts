import type { Puzzle } from './types';
import {
  PRINT_C,
  buildPageHtml,
  collectQuestionContainers,
  openPrintWindow,
  serializeSvg,
  svgPromptBox,
} from '../shared/exportPdf';

const C = PRINT_C;

function renderAnswerTable(puzzle: Puzzle): string {
  const cells = puzzle.blocks
    .map(
      (b) =>
        `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;` +
        `min-width:28px;padding:4px 6px;border:1px solid ${C.border};border-radius:6px;background:${C.cardBg};">` +
        `<span style="font-size:10px;font-weight:700;color:${C.fill};">${b.label}</span>` +
        `<span style="font-size:11px;font-weight:700;color:${C.correct};">${b.touchingFaces}</span>` +
        `</div>`,
    )
    .join('');

  return (
    `<div style="margin-top:6px;">` +
    `<div style="font-size:9px;color:${C.textDim};margin-bottom:4px;font-weight:600;letter-spacing:0.05em;">` +
    `Answer — touching faces per block</div>` +
    `<div style="display:flex;gap:4px;flex-wrap:wrap;">${cells}</div>` +
    `</div>`
  );
}

function renderQuestion(puzzle: Puzzle, svgs: string[], qIdx: number): string {
  const cubeSvg = svgs[0] ?? '';

  return (
    `<div class="question">` +
    `<div class="q-label">Q${qIdx + 1} — How many faces does each block touch?</div>` +
    `<div style="display:flex;gap:12px;align-items:flex-start;">` +
    svgPromptBox(cubeSvg, 110) +
    renderAnswerTable(puzzle) +
    `</div>` +
    `</div>`
  );
}

export function exportBlockTouchingPdf(puzzles: Puzzle[]): void {
  const containers = collectQuestionContainers();
  if (containers.length === 0) return;

  const body = containers
    .map((container, i) => {
      const svgs = Array.from(container.querySelectorAll<SVGSVGElement>('svg')).map(serializeSvg);
      return renderQuestion(puzzles[i]!, svgs, i);
    })
    .join('');

  const html = buildPageHtml('Block Touching — Practice Sheet', containers.length, body);
  openPrintWindow(html);
}
