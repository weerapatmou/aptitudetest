/** Shared PDF-export utilities. Import from this module in each puzzle's exportPdf.ts. */

export const PRINT_C = {
  fill: '#0891b2',
  stroke: '#0e7490',
  correct: '#16a34a',
  wrong: '#dc2626',
  text: '#1e293b',
  textDim: '#64748b',
  border: '#e2e8f0',
  cardBg: '#ffffff',
  pageBg: '#f8fafc',
} as const;

export const PRINT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

/** Replace CSS custom-property references with hardcoded hex values for the print window. */
export function resolveVars(str: string): string {
  return str
    .replace(/var\(--accent[^)]*\)/g, '#0891b2')
    .replace(/var\(--correct[^)]*\)/g, '#16a34a')
    .replace(/var\(--wrong[^)]*\)/g, '#dc2626')
    .replace(/var\(--warm[^)]*\)/g, '#f59e0b')
    .replace(/var\(--text-dim[^)]*\)/g, '#64748b')
    .replace(/var\(--text[^)]*\)/g, '#1e293b')
    .replace(/var\(--bg[^)]*\)/g, '#ffffff')
    .replace(/var\(--[a-z-]+[^)]*\)/g, '#94a3b8');
}

/** Serialize a live SVG DOM element to an HTML string suitable for the print window. */
export function serializeSvg(el: SVGSVGElement): string {
  const str = new XMLSerializer().serializeToString(el);
  return resolveVars(str);
}

/** Return all elements tagged with [data-pdf-q], sorted by numeric index. */
export function collectQuestionContainers(): HTMLElement[] {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-pdf-q]'));
  return els.sort((a, b) => Number(a.dataset.pdfQ ?? 0) - Number(b.dataset.pdfQ ?? 0));
}

/** Open a new browser tab with the given HTML, triggering the print dialog on load. */
export function openPrintWindow(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const PAGE_CSS = (C: typeof PRINT_C): string =>
  [
    '*{margin:0;padding:0;box-sizing:border-box;}',
    `body{font-family:'JetBrains Mono','Courier New',monospace;background:${C.pageBg};color:${C.text};padding:20px 24px;}`,
    `svg{display:block;width:100%;height:100%;}`,
    `.page-header{display:flex;align-items:baseline;gap:12px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid ${C.border};}`,
    `.page-title{font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;}`,
    `.page-meta{font-size:10px;color:${C.textDim};}`,
    `.question{margin-bottom:14px;padding:10px 12px;border:1.5px solid ${C.border};border-radius:10px;background:${C.cardBg};page-break-inside:avoid;}`,
    `.q-label{font-size:11px;font-weight:700;color:${C.textDim};margin-bottom:8px;}`,
    `.svg-box{border:1.5px solid ${C.border};border-radius:7px;padding:4px;position:relative;background:${C.cardBg};display:inline-flex;align-items:center;justify-content:center;overflow:hidden;}`,
    `.opt-letter{position:absolute;top:3px;left:5px;font-size:9px;color:${C.textDim};font-family:monospace;z-index:1;}`,
    `.opts-row{display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start;}`,
    `.answer-key{margin-top:24px;padding:14px 16px;border:2px solid ${C.border};border-radius:10px;background:${C.cardBg};page-break-inside:avoid;}`,
    `.ak-title{font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.textDim};margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid ${C.border};}`,
    `.ak-grid{display:flex;flex-wrap:wrap;gap:8px;}`,
    `.ak-cell{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:32px;}`,
    `.ak-qnum{font-size:9px;color:${C.textDim};}`,
    `.ak-letter{font-size:14px;font-weight:700;color:${C.correct};}`,
    `@media print{body{padding:10px 14px;}.question{margin-bottom:8px;}.answer-key{margin-top:16px;}}`,
  ].join('');

/** Build a complete HTML document for the print window. */
export function buildPageHtml(title: string, count: number, body: string): string {
  const C = PRINT_C;
  return (
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>` +
    `<style>${PAGE_CSS(C)}</style></head><body>` +
    `<div class="page-header">` +
    `<span class="page-title">${title}</span>` +
    `<span class="page-meta">${count} question${count !== 1 ? 's' : ''}</span>` +
    `</div>` +
    body +
    `<script>window.onload=function(){window.print();};</script>` +
    `</body></html>`
  );
}

/** Render the answer-key footer block. */
export function renderAnswerKey(items: { letter: string }[]): string {
  const cells = items
    .map((it, i) =>
      `<div class="ak-cell"><span class="ak-qnum">Q${i + 1}</span><span class="ak-letter">${it.letter}</span></div>`,
    )
    .join('');
  return (
    `<div class="answer-key"><div class="ak-title">ANSWER KEY</div>` +
    `<div class="ak-grid">${cells}</div></div>`
  );
}

/** Wrap an SVG string in a labelled option box. */
export function svgOptionBox(svgStr: string, letter: string, size = 80): string {
  return (
    `<div class="svg-box" style="width:${size}px;height:${size}px;">` +
    `<span class="opt-letter">${letter}</span>` +
    svgStr +
    `</div>`
  );
}

/** Wrap an SVG string in a plain prompt box (no letter label). */
export function svgPromptBox(svgStr: string, size = 80): string {
  return `<div style="width:${size}px;height:${size}px;flex-shrink:0;">${svgStr}</div>`;
}
