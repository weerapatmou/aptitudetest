import type { ShapeDef } from '../types';

// All shapes normalized to fit inside a ~[-55, 55] bounding box, centered at origin.
// Points are listed clockwise (for consistent winding).

// Helper: regular polygon with n sides, radius r
function regPoly(n: number, r: number, startAngle = -Math.PI / 2): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = startAngle + (2 * Math.PI * i) / n;
    return [Math.round(r * Math.cos(a)), Math.round(r * Math.sin(a))] as [number, number];
  });
}

export const SHAPE_POOL: ShapeDef[] = [
  // ── Triangles ──────────────────────────────────────────────────────────────
  {
    kind: 'equilateral-tri',
    points: [[0, -52], [45, 26], [-45, 26]],
  },
  {
    kind: 'right-tri',
    points: [[-45, -45], [45, -45], [-45, 45]],
  },
  {
    kind: 'isosceles-tri',
    points: [[0, -52], [28, 40], [-28, 40]],
  },
  {
    kind: 'wide-obtuse-tri',
    points: [[-52, 30], [52, 30], [-10, -35]],
  },
  {
    kind: 'thin-acute-tri',
    points: [[0, -52], [18, 52], [-18, 52]],
  },
  {
    kind: 'scalene-tri',
    points: [[-40, -40], [50, -10], [-20, 50]],
  },
  {
    kind: 'right-isosceles-tri',
    points: [[-45, -45], [45, -45], [45, 45]],
  },
  {
    kind: 'very-flat-tri',
    points: [[-55, 20], [55, 20], [0, -15]],
  },
  {
    kind: 'very-tall-tri',
    points: [[0, -55], [12, 55], [-12, 55]],
  },

  // ── Quadrilaterals ──────────────────────────────────────────────────────────
  {
    kind: 'square',
    points: [[-42, -42], [42, -42], [42, 42], [-42, 42]],
  },
  {
    kind: 'rectangle-wide',
    points: [[-55, -30], [55, -30], [55, 30], [-55, 30]],
  },
  {
    kind: 'rectangle-tall',
    points: [[-30, -55], [30, -55], [30, 55], [-30, 55]],
  },
  {
    kind: 'parallelogram-right',
    points: [[-30, -35], [55, -35], [30, 35], [-55, 35]],
  },
  {
    kind: 'parallelogram-left',
    points: [[30, -35], [55, 35], [-30, 35], [-55, -35]],
  },
  {
    kind: 'trapezoid-wide',
    points: [[-25, -35], [25, -35], [50, 35], [-50, 35]],
  },
  {
    kind: 'trapezoid-narrow',
    points: [[-45, -35], [45, -35], [20, 35], [-20, 35]],
  },
  {
    kind: 'rhombus',
    points: [[0, -52], [42, 0], [0, 52], [-42, 0]],
  },
  {
    kind: 'wide-parallelogram',
    points: [[-10, -30], [55, -30], [10, 30], [-55, 30]],
  },
  {
    kind: 'irregular-quad',
    points: [[-40, -45], [50, -20], [35, 45], [-30, 30]],
  },
  {
    kind: 'chevron-quad',
    // Concave dart/arrowhead pointing right
    points: [[55, 0], [0, -40], [-30, 0], [0, 40]],
  },

  // ── Diamond / Kite ──────────────────────────────────────────────────────────
  {
    kind: 'tall-diamond',
    points: [[0, -55], [22, 0], [0, 55], [-22, 0]],
  },
  {
    kind: 'kite',
    points: [[0, -55], [35, 5], [0, 25], [-35, 5]],
  },

  // ── Pentagons ───────────────────────────────────────────────────────────────
  {
    kind: 'regular-pent',
    points: regPoly(5, 52),
  },
  {
    kind: 'arrow-right',
    points: [[-50, -25], [10, -25], [10, -45], [52, 0], [10, 45], [10, 25], [-50, 25]],
  },
  {
    kind: 'arrow-up',
    points: [[-25, 50], [-25, -10], [-45, -10], [0, -52], [45, -10], [25, -10], [25, 50]],
  },
  {
    kind: 'arrow-down',
    points: [[-25, -50], [-25, 10], [-45, 10], [0, 52], [45, 10], [25, 10], [25, -50]],
  },
  {
    kind: 'arrow-left',
    points: [[50, -25], [-10, -25], [-10, -45], [-52, 0], [-10, 45], [-10, 25], [50, 25]],
  },
  {
    kind: 'house',
    points: [[-45, 42], [45, 42], [45, -10], [0, -52], [-45, -10]],
  },
  {
    kind: 'flag-shape',
    // Right-angled pentagon: rectangle with one corner cut diagonally
    points: [[-45, -45], [45, -45], [45, 15], [0, 45], [-45, 45]],
  },
  {
    kind: 'shield-pent',
    points: [[-45, -45], [45, -45], [45, 15], [0, 52], [-45, 15]],
  },
  {
    kind: 'irregular-pent',
    points: [[-10, -52], [45, -20], [40, 45], [-30, 50], [-52, 10]],
  },

  // ── Hexagons ────────────────────────────────────────────────────────────────
  {
    kind: 'regular-hex',
    points: regPoly(6, 50, 0),
  },
  {
    kind: 'elongated-hex',
    // Tall hexagon: wider than tall
    points: [[-20, -50], [20, -50], [50, 0], [20, 50], [-20, 50], [-50, 0]],
  },
  {
    kind: 'flat-hex',
    // Flat hexagon: wider than tall
    points: [[-50, -20], [50, -20], [55, 0], [50, 20], [-50, 20], [-55, 0]],
  },

  // ── Concave / Special ───────────────────────────────────────────────────────
  {
    kind: 'l-shape',
    points: [[-45, -45], [10, -45], [10, 0], [45, 0], [45, 45], [-45, 45]],
  },
  {
    kind: 't-shape',
    points: [[-50, -45], [50, -45], [50, -10], [20, -10], [20, 45], [-20, 45], [-20, -10], [-50, -10]],
  },
  {
    kind: 'cross-shape',
    points: [
      [-20, -55], [20, -55],
      [20, -20], [55, -20],
      [55, 20], [20, 20],
      [20, 55], [-20, 55],
      [-20, 20], [-55, 20],
      [-55, -20], [-20, -20],
    ],
  },
  {
    kind: 'notched-rect',
    // Rectangle with a triangular notch cut from the top-right corner
    points: [[-50, -45], [50, -45], [50, 10], [10, -15], [10, 45], [-50, 45]],
  },
  {
    kind: 'stepped-shape',
    // Staircase: two steps going right-downward
    points: [[-50, -50], [0, -50], [0, 0], [50, 0], [50, 50], [-50, 50]],
  },
  {
    kind: 'zigzag-shape',
    // Z / S shape (3-step zigzag as a parallelogram-like form)
    points: [[-50, -50], [50, -50], [50, -10], [-10, -10], [-10, 10], [50, 10], [50, 50], [-50, 50], [-50, 10], [10, 10], [10, -10], [-50, -10]],
  },
];
