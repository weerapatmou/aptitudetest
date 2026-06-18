import type { Puzzle } from './types';
import { COMMAND_LABEL } from './types';
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

function renderCommands(puzzle: Puzzle): string {
  const steps = puzzle.commands
    .map((cmd, i) => `<span style="font-size:10px;">${i + 1}. ${COMMAND_LABEL[cmd]}</span>`)
    .join('<span style="color:#94a3b8;margin:0 4px;">→</span>');

  return (
    `<div style="margin:4px 0 6px;padding:5px 8px;background:#f1f5f9;border-radius:6px;display:flex;flex-wrap:wrap;gap:2px;align-items:center;">` +
    steps +
    `</div>`
  );
}

function renderQuestion(puzzle: Puzzle, svgs: string[], qIdx: number): string {
  const initialCubeSvg = svgs[0] ?? '';
  const optSvgs = svgs.slice(1, 7); // up to 6 choices A–F

  const opts = optSvgs.map((s, i) => svgOptionBox(s, PRINT_LETTERS[i]!)).join('');
  void puzzle;

  return (
    `<div class="question">` +
    `<div class="q-label">Q${qIdx + 1} — Where does the mark end up after these commands?</div>` +
    renderCommands(puzzle) +
    `<div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;">` +
    `<div>` +
    `<div style="font-size:9px;color:#64748b;margin-bottom:3px;">Starting position</div>` +
    svgPromptBox(initialCubeSvg, 80) +
    `</div>` +
    `<div>` +
    `<div style="font-size:9px;color:#64748b;margin-bottom:3px;">Options</div>` +
    `<div class="opts-row">${opts}</div>` +
    `</div>` +
    `</div>` +
    `</div>`
  );
}

export function exportFlipBoxPdf(puzzles: Puzzle[]): void {
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

  const html = buildPageHtml('Flip Box — Practice Sheet', containers.length, body + answerKey);
  openPrintWindow(html);
}
