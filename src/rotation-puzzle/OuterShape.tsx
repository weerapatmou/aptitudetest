import type { OuterShape } from './types';

type Props = { shape: OuterShape };

const STROKE = 3.0;

const polyProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: STROKE,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
  vectorEffect: 'non-scaling-stroke' as const,
};

function polyPoints(verts: { x: number; y: number }[]): string {
  return verts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

export function OuterShape({ shape }: Props) {
  if (shape.kind === 'asymmetricEllipse') {
    const { rx, ry, flatSide } = shape;
    if (!flatSide) return <ellipse cx={0} cy={0} rx={rx} ry={ry} {...polyProps} />;
    // Build the same arc+chord path as samplePolygon's sampleEllipseBoundary.
    const omitCenter = flatSide === 'top' ? -Math.PI / 2 : Math.PI;
    const omitHalf = Math.PI / 3;
    const arcStart = omitCenter + omitHalf;
    const arcEnd = omitCenter - omitHalf + Math.PI * 2;
    const start = { x: rx * Math.cos(arcStart), y: ry * Math.sin(arcStart) };
    const end = { x: rx * Math.cos(arcEnd), y: ry * Math.sin(arcEnd) };
    // Arc length is (arcEnd - arcStart) > π so large-arc flag = 1.
    const largeArc = (arcEnd - arcStart) > Math.PI ? 1 : 0;
    const d = `M ${start.x} ${start.y} A ${rx} ${ry} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
    return <path d={d} {...polyProps} />;
  }
  return <polygon points={polyPoints(shape.vertices)} {...polyProps} />;
}
