import type { JigsawPiece } from '../types';
import type { Rng } from '../../rotation-puzzle/generate/rng';

export function layoutPieces(pieces: JigsawPiece[], rng: Rng): void {
  const maxRadius = pieces.reduce((max, p) => {
    const r = Math.max(...p.polygon.map(pt => Math.sqrt(pt.x * pt.x + pt.y * pt.y)));
    return Math.max(max, r);
  }, 0);
  const spacing = maxRadius * 2.2;
  const N = pieces.length;
  for (let k = 0; k < N; k++) {
    pieces[k]!.displayCenter = { x: (k - (N - 1) / 2) * spacing, y: 0 };
    pieces[k]!.displayRotation = rng.range(0, 360);
    pieces[k]!.displayScale = 1;
  }
}
