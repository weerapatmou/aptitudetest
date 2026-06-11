import type { OuterShape, Pt } from '../types';
import type { Rng } from './rng';
import { minMirrorDistance } from './symmetry';

const OUTER_KINDS = [
  'irregularPolygon',
  'notchedRectangle',
  'arrowhead',
  'lShape',
  'asymmetricEllipse',
  'irregularHexagon',
  'kite',
  'chevron',
  'teardrop',
  'gear',
] as const;

export type OuterKind = (typeof OUTER_KINDS)[number];

const R = 70; // base outer radius

/**
 * Generator dispatch. Each generator MUST produce a shape whose minMirrorDistance > 8px.
 * We retry per-kind a few times; if a particular kind keeps failing we fall back to another.
 */
export function pickOuterShape(rng: Rng): OuterShape {
  const order = rng.shuffle([...OUTER_KINDS]);
  for (const kind of order) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const shape = generateOuter(kind, rng);
      if (minMirrorDistance(shape) > 8.5) return shape;
    }
  }
  // Hand-curated fallback: an asymmetric arrow-like quadrilateral.
  return fallbackShape();
}

export function generateOuter(kind: OuterKind, rng: Rng): OuterShape {
  switch (kind) {
    case 'irregularPolygon':   return generateIrregularPolygon(rng);
    case 'notchedRectangle':   return generateNotchedRectangle(rng);
    case 'arrowhead':          return generateArrowhead(rng);
    case 'lShape':             return generateLShapeOuter(rng);
    case 'asymmetricEllipse':  return generateAsymmetricEllipse(rng);
    case 'irregularHexagon':   return generateIrregularHexagon(rng);
    case 'kite':               return generateKite(rng);
    case 'chevron':            return generateChevron(rng);
    case 'teardrop':           return generateTeardrop(rng);
    case 'gear':               return generateGear(rng);
  }
}

function generateIrregularPolygon(rng: Rng): OuterShape {
  const n = 5 + rng.int(0, 3); // 5..7 vertices
  const vertices: Pt[] = [];
  let prev = 0;
  // Generate increasing angles with random spacing to ensure CCW polygon.
  const offsets: number[] = [];
  for (let i = 0; i < n; i++) offsets.push(rng.range(0.5, 1.5));
  const sum = offsets.reduce((a, b) => a + b, 0);
  for (let i = 0; i < n; i++) {
    prev += (offsets[i]! / sum) * Math.PI * 2;
    const radius = R * rng.range(0.65, 1.0);
    vertices.push({ x: radius * Math.cos(prev), y: radius * Math.sin(prev) });
  }
  // Force asymmetry: stretch one vertex outward, push one inward.
  const i1 = rng.int(0, n);
  const i2 = (i1 + 2) % n;
  vertices[i1] = { x: vertices[i1]!.x * 1.25, y: vertices[i1]!.y * 1.25 };
  vertices[i2] = { x: vertices[i2]!.x * 0.7, y: vertices[i2]!.y * 0.7 };
  return { kind: 'irregularPolygon', vertices };
}

function generateNotchedRectangle(rng: Rng): OuterShape {
  const w = 70 + rng.range(-8, 8);
  const h = 55 + rng.range(-6, 6);
  // Rectangle with a notch cut into one side.
  // Choose a side (top/right/bottom/left) and a non-central position along it.
  const side = rng.pick(['top', 'right', 'bottom', 'left'] as const);
  const notchDepth = 12 + rng.range(0, 8);
  const notchWidth = 18 + rng.range(0, 6);
  // Asymmetric position along the side (0.25..0.40 or 0.6..0.75)
  const t = rng.bool() ? rng.range(0.25, 0.40) : rng.range(0.60, 0.75);

  const tl = { x: -w, y: -h };
  const tr = { x: w, y: -h };
  const br = { x: w, y: h };
  const bl = { x: -w, y: h };
  const vertices: Pt[] = [];
  // Walk corners; inject notch when on chosen side.
  const sides: Array<{ from: Pt; to: Pt; name: 'top' | 'right' | 'bottom' | 'left' }> = [
    { from: tl, to: tr, name: 'top' },
    { from: tr, to: br, name: 'right' },
    { from: br, to: bl, name: 'bottom' },
    { from: bl, to: tl, name: 'left' },
  ];
  for (const s of sides) {
    vertices.push(s.from);
    if (s.name === side) {
      const dx = s.to.x - s.from.x;
      const dy = s.to.y - s.from.y;
      const startX = s.from.x + dx * t;
      const startY = s.from.y + dy * t;
      const sw = notchWidth;
      const len = Math.sqrt(dx * dx + dy * dy);
      const ux = dx / len, uy = dy / len;
      // perpendicular inward
      const nx = uy, ny = -ux;
      const a = { x: startX, y: startY };
      const b = { x: startX + ux * sw, y: startY + uy * sw };
      const aIn = { x: a.x + nx * notchDepth, y: a.y + ny * notchDepth };
      const bIn = { x: b.x + nx * notchDepth, y: b.y + ny * notchDepth };
      vertices.push(a, aIn, bIn, b);
    }
  }
  return { kind: 'notchedRectangle', vertices };
}

function generateArrowhead(rng: Rng): OuterShape {
  // Pentagonal arrow pointing in a random direction.
  const len = 80 + rng.range(-6, 6);
  const halfWidth = 38 + rng.range(-4, 4);
  const tailWidth = 22 + rng.range(-2, 4);
  const headLen = len * 0.55;
  // Base shape pointing +x
  const pts: Pt[] = [
    { x: len, y: 0 },              // tip
    { x: len - headLen, y: halfWidth },
    { x: len - headLen, y: tailWidth },
    { x: -len * 0.7, y: tailWidth },
    { x: -len * 0.7, y: -tailWidth * 1.25 },  // asymmetric tail
    { x: len - headLen, y: -halfWidth * 0.85 }, // asymmetric head
  ];
  // Rotate by random angle so puzzle doesn't always point right at θ=0.
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'arrowhead', vertices };
}

function generateLShapeOuter(rng: Rng): OuterShape {
  // Asymmetric L-shape (chiral).
  const armLong = 90 + rng.range(-6, 6);
  const armShort = 55 + rng.range(-4, 4);
  const thick = 32 + rng.range(-3, 3);
  // Base L (pointing +x and +y).
  const pts: Pt[] = [
    { x: 0, y: 0 },
    { x: armLong, y: 0 },
    { x: armLong, y: thick },
    { x: thick, y: thick },
    { x: thick, y: armShort },
    { x: 0, y: armShort },
  ];
  // Center it
  const cx = (armLong) / 2, cy = (armShort) / 2;
  let centered = pts.map((p) => ({ x: p.x - cx, y: p.y - cy }));
  // Random rotation to vary orientation across puzzles.
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  centered = centered.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  // Random flip half the time to ensure we cover both chiralities.
  if (rng.bool()) centered = centered.map((p) => ({ x: -p.x, y: p.y }));
  return { kind: 'lShape', vertices: centered };
}

function generateAsymmetricEllipse(rng: Rng): OuterShape {
  const rx = 70 + rng.range(-5, 8);
  const ry = 45 + rng.range(-5, 8);
  const flatSide = rng.bool() ? 'top' as const : 'left' as const;
  return { kind: 'asymmetricEllipse', rx, ry, flatSide };
}

function generateIrregularHexagon(rng: Rng): OuterShape {
  const vertices: Pt[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + rng.range(-0.18, 0.18);
    const r = R * rng.range(0.65, 1.0);
    vertices.push({ x: r * Math.cos(ang), y: r * Math.sin(ang) });
  }
  // Pull one vertex strongly to break mirror symmetry.
  const k = rng.int(0, 6);
  vertices[k] = { x: vertices[k]!.x * 1.35, y: vertices[k]!.y * 1.1 };
  return { kind: 'irregularHexagon', vertices };
}

function generateKite(rng: Rng): OuterShape {
  // An asymmetric kite (not a symmetric kite — drag one vertex sideways).
  const top = { x: rng.range(-15, 15), y: -65 };
  const right = { x: 55 + rng.range(-4, 6), y: rng.range(-5, 15) };
  const bottom = { x: rng.range(-20, 25), y: 75 };
  const left = { x: -60 + rng.range(-4, 4), y: rng.range(-15, 15) };
  return { kind: 'kite', vertices: [top, right, bottom, left] };
}

function generateChevron(rng: Rng): OuterShape {
  // ">" shape, but with one arm longer/thicker than the other for asymmetry.
  const reach = 75 + rng.range(-5, 5);
  const innerInset = 28 + rng.range(-3, 3);
  const halfHeight = 50 + rng.range(-4, 4);
  // Asymmetry: upper arm thicker, lower arm thinner.
  const upperThickness = 24 + rng.range(0, 6);
  const lowerThickness = 14 + rng.range(0, 4);
  const tipY = rng.range(-6, 6);
  const pts: Pt[] = [
    { x: reach, y: tipY },                                  // tip
    { x: -reach * 0.4, y: halfHeight },                     // upper-back outer
    { x: -reach * 0.4 + upperThickness, y: halfHeight },    // upper-back inner offset (asym)
    { x: reach - innerInset, y: tipY },                     // notch
    { x: -reach * 0.4 + lowerThickness, y: -halfHeight },   // lower-back inner offset
    { x: -reach * 0.4, y: -halfHeight },                    // lower-back outer
  ];
  // Random rotation
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'chevron', vertices };
}

function generateTeardrop(rng: Rng): OuterShape {
  // A rounded blob tapering to a point — a teardrop. We skew the bulge to one
  // side so it is chiral (not mirror-symmetric about its own axis), then rotate.
  const tip = { x: 82 + rng.range(-6, 6), y: 0 };
  const bulgeR = 50 + rng.range(-4, 6);
  // Center of the round body, offset back from the tip.
  const cx = -22 + rng.range(-4, 4);
  // Skew factors: top and bottom halves of the bulge get different radii so the
  // teardrop leans, guaranteeing asymmetry across every mirror axis.
  const topScale = 1.0 + rng.range(0.18, 0.38);
  const botScale = 1.0 - rng.range(0.12, 0.28);
  const pts: Pt[] = [tip];
  // Walk the round body around the back of the bulge, from the lower side near
  // the tip, around through -x, back up to the upper side near the tip.
  const steps = 14;
  const startA = 0.45 * Math.PI;  // lower-front of the body
  const endA = 1.55 * Math.PI;    // upper-front of the body (sweeping through π)
  for (let i = 0; i <= steps; i++) {
    const t = startA + ((endA - startA) * i) / steps;
    const scale = Math.sin(t) >= 0 ? topScale : botScale;
    pts.push({
      x: cx + bulgeR * Math.cos(t),
      y: bulgeR * scale * Math.sin(t),
    });
  }
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'teardrop', vertices };
}

function generateGear(rng: Rng): OuterShape {
  // A toothed wheel. A perfectly regular gear is rotationally symmetric, so we
  // deliberately break it: a prime-ish tooth count plus one enlarged tooth and
  // one missing tooth make it chiral and free of clean mirror axes.
  const teeth = rng.pick([7, 9, 11]);
  const inner = 42 + rng.range(-4, 4);
  const outer = 70 + rng.range(-4, 4);
  const skipTooth = rng.int(0, teeth);     // this tooth is dropped (flat gap)
  const bigTooth = (skipTooth + rng.int(2, teeth - 1)) % teeth; // this one juts out
  const pts: Pt[] = [];
  const per = (Math.PI * 2) / teeth;
  // Small phase jitter on tooth width to remove residual reflection symmetry.
  const gap = per * (0.42 + rng.range(-0.05, 0.05));
  for (let i = 0; i < teeth; i++) {
    const base = i * per;
    const tipR = i === bigTooth ? outer + 16 : outer;
    if (i === skipTooth) {
      // Flat gap: stay on the inner circle across this slot.
      pts.push({ x: inner * Math.cos(base - gap / 2), y: inner * Math.sin(base - gap / 2) });
      pts.push({ x: inner * Math.cos(base + per - gap / 2), y: inner * Math.sin(base + per - gap / 2) });
      continue;
    }
    // valley -> rising edge -> tooth top (two corners) -> falling edge -> valley
    pts.push({ x: inner * Math.cos(base - gap / 2), y: inner * Math.sin(base - gap / 2) });
    pts.push({ x: tipR * Math.cos(base - gap / 4), y: tipR * Math.sin(base - gap / 4) });
    pts.push({ x: tipR * Math.cos(base + gap / 4), y: tipR * Math.sin(base + gap / 4) });
    pts.push({ x: inner * Math.cos(base + gap / 2), y: inner * Math.sin(base + gap / 2) });
  }
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'gear', vertices };
}

function fallbackShape(): OuterShape {
  // Hand-curated asymmetric quadrilateral.
  return {
    kind: 'kite',
    vertices: [
      { x: -12, y: -70 },
      { x: 60, y: -8 },
      { x: 18, y: 70 },
      { x: -55, y: 4 },
    ],
  };
}
