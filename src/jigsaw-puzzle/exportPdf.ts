import type { JigsawPuzzle, JigsawPiece, AssembledOption, Polygon } from './types';
import { pathFromPolygon, viewBoxFromBounds } from '../polygon-assembly-puzzle/svgHelpers';
import { polygonBounds, rotatePolygon } from '../rotation-puzzle/generate/geometry';

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

const C = {
  fill: '#0891b2',
  stroke: '#0e7490',
  correct: '#16a34a',
  text: '#1e293b',
  textDim: '#64748b',
  border: '#e2e8f0',
  cardBg: '#ffffff',
  pageBg: '#f8fafc',
  targetOutline: '#94a3b8',
};

function piecePanelSvg(pieces: JigsawPiece[]): string {
  const allPts: Array<{ x: number; y: number }> = [];
  for (const p of pieces) {
    const rotated = rotatePolygon(p.polygon, p.displayRotation);
    for (const pt of rotated) {
      allPts.push({
        x: pt.x * p.displayScale + p.displayCenter.x,
        y: pt.y * p.displayScale + p.displayCenter.y,
      });
    }
  }

  if (allPts.length === 0) {
    return `<svg viewBox="-60 -60 120 120" style="width:100%;height:100%"></svg>`;
  }

  const b = polygonBounds(allPts);
  const pad = 0.15;
  const w = (b.maxX - b.minX) * (1 + pad);
  const h = (b.maxY - b.minY) * (1 + pad);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const vb = `${(cx - w / 2).toFixed(2)} ${(cy - h / 2).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`;

  const paths = pieces
    .map((p) => {
      const d = pathFromPolygon(p.polygon);
      const tx = p.displayCenter.x.toFixed(2);
      const ty = p.displayCenter.y.toFixed(2);
      const rot = p.displayRotation.toFixed(2);
      const sc = p.displayScale.toFixed(4);
      return (
        `<g transform="translate(${tx},${ty}) rotate(${rot}) scale(${sc})">` +
        `<path d="${d}" fill="${C.fill}" fill-opacity="0.2" stroke="${C.stroke}" stroke-width="1.4" stroke-linejoin="round"/>` +
        `</g>`
      );
    })
    .join('');

  return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">${paths}</svg>`;
}

function assembledOptionSvg(option: AssembledOption, targetPolygon: Polygon, uid: string): string {
  const b = polygonBounds(targetPolygon);
  const vb = viewBoxFromBounds(b, 0.14);
  const targetPath = pathFromPolygon(targetPolygon);
  const clipId = `clip-${uid}`;

  const paths = option.pieces
    .map((p) => {
      const d = pathFromPolygon(p.polygon);
      const tx = p.assembledCenter.x.toFixed(2);
      const ty = p.assembledCenter.y.toFixed(2);
      const flip = p.assembledFlipped ? -1 : 1;
      const rot = p.assembledRotation.toFixed(2);
      return (
        `<g transform="translate(${tx},${ty}) scale(${flip},1) rotate(${rot})">` +
        `<path d="${d}" fill="${C.fill}" fill-opacity="0.22" stroke="${C.fill}" stroke-width="1.6" stroke-linejoin="round"/>` +
        `</g>`
      );
    })
    .join('');

  return (
    `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">` +
    `<defs><clipPath id="${clipId}"><path d="${targetPath}"/></clipPath></defs>` +
    `<path d="${targetPath}" fill="${C.fill}" fill-opacity="0.05" stroke="${C.targetOutline}" stroke-width="0.8"/>` +
    `<g clip-path="url(#${clipId})">${paths}</g>` +
    `</svg>`
  );
}

function renderQuestion(q: JigsawPuzzle, qIdx: number): string {
  const optionCells = q.options
    .map((opt, i) => {
      const letter = LETTERS[i] ?? '?';
      return (
        `<div class="option">` +
        `<span class="opt-letter">${letter}</span>` +
        assembledOptionSvg(opt, q.targetPolygon, `q${qIdx}o${i}`) +
        `</div>`
      );
    })
    .join('');

  return (
    `<div class="question">` +
    `<div class="q-header">` +
    `<div class="q-label"><span class="q-num">Q${qIdx + 1}</span><span class="q-meta">${q.pieceCount} PCS</span></div>` +
    `<div class="pieces-wrap">${piecePanelSvg(q.questionPieces)}</div>` +
    `</div>` +
    `<div class="options-grid">${optionCells}</div>` +
    `</div>`
  );
}

function renderAnswerKey(questions: JigsawPuzzle[]): string {
  const cells = questions
    .map((q, i) => {
      const letter = LETTERS[q.correctIndex] ?? '?';
      return (
        `<div class="ak-cell">` +
        `<span class="ak-qnum">Q${i + 1}</span>` +
        `<span class="ak-letter">${letter}</span>` +
        `</div>`
      );
    })
    .join('');
  return (
    `<div class="answer-key">` +
    `<div class="ak-title">ANSWER KEY</div>` +
    `<div class="ak-grid">${cells}</div>` +
    `</div>`
  );
}

export function exportJigsawPdf(questions: JigsawPuzzle[]): void {
  const questionBlocks = questions.map((q, i) => renderQuestion(q, i)).join('');
  const answerKey = renderAnswerKey(questions);

  const html =
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">` +
    `<title>Jigsaw Puzzle — Practice Sheet</title><style>` +
    `*{margin:0;padding:0;box-sizing:border-box;}` +
    `body{font-family:'JetBrains Mono','Courier New',monospace;background:${C.pageBg};color:${C.text};padding:20px 24px;}` +
    `.page-header{display:flex;align-items:baseline;gap:12px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid ${C.border};}` +
    `.page-title{font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;}` +
    `.page-meta{font-size:10px;color:${C.textDim};}` +
    `.question{margin-bottom:14px;padding:10px 12px;border:1.5px solid ${C.border};border-radius:10px;background:${C.cardBg};page-break-inside:avoid;}` +
    `.q-header{display:flex;align-items:center;gap:8px;margin-bottom:8px;height:80px;}` +
    `.q-label{display:flex;flex-direction:column;gap:2px;min-width:28px;}` +
    `.q-num{font-size:11px;font-weight:700;color:${C.textDim};}` +
    `.q-meta{font-size:9px;color:${C.textDim};opacity:0.7;}` +
    `.pieces-wrap{flex:1;height:100%;}` +
    `.options-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;}` +
    `.option{border:1.5px solid ${C.border};border-radius:7px;padding:4px;position:relative;aspect-ratio:1;background:${C.cardBg};}` +
    `.opt-letter{position:absolute;top:3px;left:5px;font-size:9px;color:${C.textDim};font-family:monospace;}` +
    `.answer-key{margin-top:24px;padding:14px 16px;border:2px solid ${C.border};border-radius:10px;background:${C.cardBg};page-break-inside:avoid;}` +
    `.ak-title{font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.textDim};margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid ${C.border};}` +
    `.ak-grid{display:flex;flex-wrap:wrap;gap:8px;}` +
    `.ak-cell{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:32px;}` +
    `.ak-qnum{font-size:9px;color:${C.textDim};}` +
    `.ak-letter{font-size:14px;font-weight:700;color:${C.correct};}` +
    `@media print{body{padding:10px 14px;}.question{margin-bottom:8px;}.answer-key{margin-top:16px;}}` +
    `</style></head><body>` +
    `<div class="page-header">` +
    `<span class="page-title">Jigsaw Puzzle — Practice Sheet</span>` +
    `<span class="page-meta">${questions.length} question${questions.length !== 1 ? 's' : ''}</span>` +
    `</div>` +
    questionBlocks +
    answerKey +
    `<script>window.onload=function(){window.print();};</script>` +
    `</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
