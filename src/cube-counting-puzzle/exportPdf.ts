import type { Puzzle } from './types';
import {
  PRINT_LETTERS,
  buildPageHtml,
  collectQuestionContainers,
  openPrintWindow,
  renderAnswerKey,
  serializeSvg,
  svgPromptBox,
} from '../shared/exportPdf';

function renderOptions(puzzle: Puzzle): string {
  const cells = puzzle.choices
    .map((c, i) => {
      const letter = PRINT_LETTERS[i] ?? String(i + 1);
      return (
        `<div style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;">` +
        `<span style="font-weight:700;font-size:11px;">${letter})</span>` +
        `<span style="font-size:11px;">${c.value}</span>` +
        `</div>`
      );
    })
    .join('');

  return (
    `<div style="margin-top:6px;padding:6px 8px;background:#f1f5f9;border-radius:6px;">` +
    cells +
    `</div>`
  );
}

function renderQuestion(puzzle: Puzzle, svgs: string[], qIdx: number): string {
  const cubeSvg = svgs[0] ?? '';

  return (
    `<div class="question">` +
    `<div class="q-label">Q${qIdx + 1} — How many cubes are in this arrangement?</div>` +
    `<div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;">` +
    svgPromptBox(cubeSvg, 110) +
    `<div>` +
    `<div style="font-size:9px;color:#64748b;margin-bottom:4px;">Options</div>` +
    renderOptions(puzzle) +
    `</div>` +
    `</div>` +
    `</div>`
  );
}

export function exportCubeCountingPdf(puzzles: Puzzle[]): void {
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

  const html = buildPageHtml('Cube Counting — Practice Sheet', containers.length, body + answerKey);
  openPrintWindow(html);
}
