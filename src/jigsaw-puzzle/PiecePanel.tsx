import { useMemo } from 'react';
import clsx from 'clsx';
import type { JigsawPiece, Polygon, Pt } from './types';
import { polygonBounds, rotatePolygon } from '../rotation-puzzle/generate/geometry';
import { pathFromPolygon } from '../polygon-assembly-puzzle/svgHelpers';

type Props = {
  pieces: JigsawPiece[];
  pieceCount: number;
  targetPolygon: Polygon;
  compact?: boolean;
};

// Option cards are ~230px wide at max-w-7xl md+ layout: (1184 - 32) / 5 ≈ 230
const OPTION_CARD_PX = 230;

export function PiecePanel({ pieces, pieceCount, targetPolygon, compact = false }: Props) {
  const { viewBox, panelHeight } = useMemo(() => {
    const allPts: Pt[] = [];
    for (const p of pieces) {
      const rotated = rotatePolygon(p.polygon, p.displayRotation);
      for (const pt of rotated)
        allPts.push({ x: pt.x * p.displayScale + p.displayCenter.x,
                      y: pt.y * p.displayScale + p.displayCenter.y } as Pt);
    }
    if (allPts.length === 0) return { viewBox: '-60 -60 120 120', panelHeight: 220 };
    const b = polygonBounds(allPts);
    // Rectangular viewBox — NOT squared. viewBoxFromBounds squares to max(w,h) which wastes
    // vertical space for a wide scatter and shrinks pieces to ~28% of assembled-option scale.
    const pad = 0.15;
    const w = (b.maxX - b.minX) * (1 + pad);
    const h = (b.maxY - b.minY) * (1 + pad);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    const vb = `${(cx - w / 2).toFixed(2)} ${(cy - h / 2).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`;
    // Dynamic height: match the px/unit scale of assembled option cards exactly.
    // option scale = OPTION_CARD_PX / optionSqVbSide; setting piece scale equal:
    // panelHeight / scatterVh = OPTION_CARD_PX / optionSqVbSide
    const tb = polygonBounds(targetPolygon);
    const optionSqVbSide = Math.max(tb.maxX - tb.minX, tb.maxY - tb.minY) * 1.14;
    const scatterVh = (b.maxY - b.minY) * 1.15;
    const ph = Math.round(OPTION_CARD_PX * scatterVh / optionSqVbSide);
    return { viewBox: vb, panelHeight: Math.max(80, ph) };
  }, [pieces, targetPolygon]);

  return (
    <div className={clsx(
      'relative rounded-xl border-2 border-accent/40 bg-bg-card shadow-[0_0_40px_-12px_var(--accent)]',
      compact ? 'p-2 pt-6' : 'p-4',
    )}>
      <div className={clsx(
        'absolute top-2 left-2 z-10 font-mono uppercase text-accent tracking-[0.14em]',
        compact ? 'text-[9px]' : 'text-[10px] tracking-[0.18em]',
      )}>
        ชิ้นส่วน
      </div>
      <div className={clsx(
        'absolute top-2 right-2 z-10 font-mono uppercase text-text-dim tracking-[0.14em]',
        compact ? 'text-[9px]' : 'text-[10px] tracking-[0.18em]',
      )}>
        {pieceCount} ชิ้น
      </div>
      <div
        className="flex items-center justify-center text-text"
        style={compact
          ? { width: '100%', height: panelHeight }
          : { width: 'var(--svg-slot)', height: 'var(--svg-slot)', marginTop: '1.5rem' }
        }
      >
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full overflow-visible"
          aria-label={`${pieceCount} pieces to assemble`}
        >
          {pieces.map((piece, i) => (
            <PieceShape key={i} piece={piece} />
          ))}
        </svg>
      </div>
    </div>
  );
}

function PieceShape({ piece }: { piece: JigsawPiece }) {
  const d = pathFromPolygon(piece.polygon as Polygon);
  return (
    <g
      transform={`translate(${piece.displayCenter.x.toFixed(2)},${piece.displayCenter.y.toFixed(2)}) rotate(${piece.displayRotation.toFixed(2)}) scale(${piece.displayScale.toFixed(4)})`}
    >
      <path
        d={d}
        fill="var(--accent)"
        fillOpacity={0.18}
        stroke="var(--accent)"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </g>
  );
}
