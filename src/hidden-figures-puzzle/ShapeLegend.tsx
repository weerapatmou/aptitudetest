import type { SimpleShape } from './types';

type Props = {
  shapes: SimpleShape[];
};

function shapeToPath(points: [number, number][]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M ${first![0]} ${first![1]} ` + rest.map(([x, y]) => `L ${x} ${y}`).join(' ') + ' Z';
}

function computeViewBox(points: [number, number][], pad = 12): string {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
}

export function ShapeLegend({ shapes }: Props) {
  return (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      {shapes.map((shape) => (
        <div key={shape.label} className="flex flex-col items-center gap-1">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg border border-border bg-bg-card flex items-center justify-center">
            <svg
              viewBox={computeViewBox(shape.def.points)}
              className="w-12 h-12 md:w-14 md:h-14"
              aria-label={`Shape ${shape.label}`}
            >
              <path
                d={shapeToPath(shape.def.points)}
                stroke="currentColor"
                strokeWidth={4}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
                className="text-text"
              />
            </svg>
          </div>
          <span className="font-mono text-xs font-bold text-accent tracking-wider">
            ({shape.label})
          </span>
        </div>
      ))}
    </div>
  );
}
