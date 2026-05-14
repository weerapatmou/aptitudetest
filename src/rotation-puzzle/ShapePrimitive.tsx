import type { FillStyle, InternalElement, InternalElementKind } from './types';

type Props = {
  kind: InternalElementKind;
  size: number;
  filled: boolean;
  fillStyle?: FillStyle;
};

const STROKE = 2.75;

function fillFor(filled: boolean, fillStyle?: FillStyle): string {
  if (!filled) return 'none';
  if (!fillStyle || fillStyle === 'solid') return 'currentColor';
  if (fillStyle === 'hatched') return 'url(#hatch-pattern)';
  if (fillStyle === 'dotted') return 'url(#dot-pattern)';
  return 'none';
}

export function ShapePrimitive({ kind, size, filled, fillStyle }: Props) {
  const r = size / 2;
  const fill = fillFor(filled, fillStyle);
  const common = {
    fill,
    stroke: 'currentColor',
    strokeWidth: STROKE,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  };

  switch (kind) {
    case 'circle':
      return <circle cx={0} cy={0} r={r} {...common} />;

    case 'square':
      return <rect x={-r} y={-r} width={size} height={size} {...common} />;

    case 'triangle': {
      // Equilateral triangle, point up
      const points = [
        [0, -r],
        [r * 0.866, r * 0.5],
        [-r * 0.866, r * 0.5],
      ];
      return <polygon points={points.map(p => p.join(',')).join(' ')} {...common} />;
    }

    case 'rightTriangle': {
      // Right angle at bottom-left, asymmetric
      const points = [
        [-r, -r],
        [r, r],
        [-r, r],
      ];
      return <polygon points={points.map(p => p.join(',')).join(' ')} {...common} />;
    }

    case 'pentagon': {
      const pts: string[] = [];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        pts.push(`${r * Math.cos(a)},${r * Math.sin(a)}`);
      }
      return <polygon points={pts.join(' ')} {...common} />;
    }

    case 'hexagon': {
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        pts.push(`${r * Math.cos(a)},${r * Math.sin(a)}`);
      }
      return <polygon points={pts.join(' ')} {...common} />;
    }

    case 'star5': {
      const pts: string[] = [];
      const inner = r * 0.45;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rad = i % 2 === 0 ? r : inner;
        pts.push(`${rad * Math.cos(a)},${rad * Math.sin(a)}`);
      }
      return <polygon points={pts.join(' ')} {...common} />;
    }

    case 'diamond': {
      const points = [
        [0, -r],
        [r * 0.8, 0],
        [0, r],
        [-r * 0.8, 0],
      ];
      return <polygon points={points.map(p => p.join(',')).join(' ')} {...common} />;
    }

    case 'arrow': {
      // Chiral: head on +x side
      const points = [
        [r, 0],
        [r * 0.2, -r * 0.7],
        [r * 0.2, -r * 0.3],
        [-r, -r * 0.3],
        [-r, r * 0.3],
        [r * 0.2, r * 0.3],
        [r * 0.2, r * 0.7],
      ];
      return <polygon points={points.map(p => p.join(',')).join(' ')} {...common} />;
    }

    case 'crescent': {
      // Chiral: opening on +x. Two arc path.
      const d = `
        M 0 ${-r}
        A ${r} ${r} 0 1 0 0 ${r}
        A ${r * 0.7} ${r} 0 1 1 0 ${-r}
        Z
      `;
      return <path d={d} {...common} />;
    }

    case 'lShape': {
      // Chiral L (corner at bottom-left, arms +x and +y, but centered)
      const a = r;
      const t = r * 0.6;
      const points = [
        [-a, -a],
        [-a + t * 1.2, -a],
        [-a + t * 1.2, a - t],
        [a, a - t],
        [a, a],
        [-a, a],
      ];
      return <polygon points={points.map(p => p.join(',')).join(' ')} {...common} />;
    }

    case 'trapezoid': {
      const top = r * 0.55;
      const bottom = r;
      const points = [
        [-top, -r * 0.6],
        [top, -r * 0.6],
        [bottom, r * 0.6],
        [-bottom, r * 0.6],
      ];
      return <polygon points={points.map(p => p.join(',')).join(' ')} {...common} />;
    }

    case 'parallelogram': {
      // Chiral: slants right
      const skew = r * 0.4;
      const points = [
        [-r + skew, -r * 0.6],
        [r + skew, -r * 0.6],
        [r - skew, r * 0.6],
        [-r - skew, r * 0.6],
      ];
      return <polygon points={points.map(p => p.join(',')).join(' ')} {...common} />;
    }

    case 'plus': {
      const t = r * 0.4;
      const points = [
        [-t, -r],
        [t, -r],
        [t, -t],
        [r, -t],
        [r, t],
        [t, t],
        [t, r],
        [-t, r],
        [-t, t],
        [-r, t],
        [-r, -t],
        [-t, -t],
      ];
      return <polygon points={points.map(p => p.join(',')).join(' ')} {...common} />;
    }

    case 'teardrop': {
      // Point at top, round bottom
      const d = `
        M 0 ${-r}
        Q ${r} ${-r * 0.2} ${r * 0.85} ${r * 0.2}
        A ${r * 0.85} ${r * 0.85} 0 1 1 ${-r * 0.85} ${r * 0.2}
        Q ${-r} ${-r * 0.2} 0 ${-r}
        Z
      `;
      return <path d={d} {...common} />;
    }

    case 'semicircle': {
      // Flat side at top, dome below
      const d = `
        M ${-r} 0
        A ${r} ${r} 0 0 0 ${r} 0
        Z
      `;
      return <path d={d} {...common} />;
    }
  }
}

export type ShapePrimitiveProps = Props;
export type { InternalElement };
