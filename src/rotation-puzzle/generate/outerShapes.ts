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
  'pinwheel',
  'combBar',
  'unevenStar',
  'pennant',
  // Arrow family
  'arrowFat',
  'arrowThin',
  'arrowBent',
  'arrowDouble',
  'notchedArrow',
  // Star family
  'starFour',
  'starSix',
  'starSeven',
  'starEight',
  // Letter / symbol shapes
  'tShape',
  'zShape',
  'fShape',
  'crossShape',
  'boltShape',
  'lShapeWide',
  // Organic / natural shapes
  'leafShape',
  'crescentShape',
  'cloudShape',
  'dropletLong',
  'dropletFat',
  'blobAsym',
  // Geometric variants
  'trapezoidRight',
  'trapezoidSkew',
  'parallelogramAsym',
  'shieldShape',
  'homeShape',
  'diamondAsym',
  'rectangleWave',
  'rectangleStep',
  // Gear / mechanical
  'gearFew',
  'gearMany',
  'sawblade',
  'ratchet',
  // Extended polygon variants
  'irregularOctagon',
  'concavePolygon',
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
    case 'pinwheel':           return generatePinwheel(rng);
    case 'combBar':            return generateCombBar(rng);
    case 'unevenStar':         return generateUnevenStar(rng);
    case 'pennant':            return generatePennant(rng);
    // Arrow family
    case 'arrowFat':           return generateArrowFat(rng);
    case 'arrowThin':          return generateArrowThin(rng);
    case 'arrowBent':          return generateArrowBent(rng);
    case 'arrowDouble':        return generateArrowDouble(rng);
    case 'notchedArrow':       return generateNotchedArrow(rng);
    // Star family
    case 'starFour':           return generateStarN('starFour', 4, rng);
    case 'starSix':            return generateStarN('starSix', 6, rng);
    case 'starSeven':          return generateStarN('starSeven', 7, rng);
    case 'starEight':          return generateStarN('starEight', 8, rng);
    // Letter / symbol shapes
    case 'tShape':             return generateTShape(rng);
    case 'zShape':             return generateZShape(rng);
    case 'fShape':             return generateFShape(rng);
    case 'crossShape':         return generateCrossShape(rng);
    case 'boltShape':          return generateBoltShape(rng);
    case 'lShapeWide':         return generateLShapeWide(rng);
    // Organic / natural shapes
    case 'leafShape':          return generateLeafShape(rng);
    case 'crescentShape':      return generateCrescentShape(rng);
    case 'cloudShape':         return generateCloudShape(rng);
    case 'dropletLong':        return generateDropletLong(rng);
    case 'dropletFat':         return generateDropletFat(rng);
    case 'blobAsym':           return generateBlobAsym(rng);
    // Geometric variants
    case 'trapezoidRight':     return generateTrapezoidRight(rng);
    case 'trapezoidSkew':      return generateTrapezoidSkew(rng);
    case 'parallelogramAsym':  return generateParallelogramAsym(rng);
    case 'shieldShape':        return generateShieldShape(rng);
    case 'homeShape':          return generateHomeShape(rng);
    case 'diamondAsym':        return generateDiamondAsym(rng);
    case 'rectangleWave':      return generateRectangleWave(rng);
    case 'rectangleStep':      return generateRectangleStep(rng);
    // Gear / mechanical
    case 'gearFew':            return generateGearFew(rng);
    case 'gearMany':           return generateGearMany(rng);
    case 'sawblade':           return generateSawblade(rng);
    case 'ratchet':            return generateRatchet(rng);
    // Extended polygon variants
    case 'irregularOctagon':   return generateIrregularOctagon(rng);
    case 'concavePolygon':     return generateConcavePolygon(rng);
  }
}

function generateIrregularPolygon(rng: Rng): OuterShape {
  const n = 5 + rng.int(0, 6); // 5..10 vertices
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
  const teeth = rng.pick([7, 9, 11, 13]);
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

function generatePinwheel(rng: Rng): OuterShape {
  // A set of blades swept consistently one way around the hub. The single-
  // handed sweep (every blade leans the same direction) is what makes a pinwheel
  // chiral: its mirror image spins the other way, so no clean reflection axis.
  const blades = rng.pick([3, 4, 5, 6, 7, 8]);
  const hub = 40 + rng.range(-3, 3);
  const tip = 72 + rng.range(-4, 4);
  const per = (Math.PI * 2) / blades;
  // Sweep: how far the blade tip leads its valley, as a fraction of a slot.
  // Every blade leans the SAME way (single handedness) — that is what makes a
  // pinwheel chiral: its mirror image spins the other direction. We keep the
  // tip angularly inside its own slot so the outline never self-intersects.
  const dir = rng.bool() ? 1 : -1;
  const sweep = dir * (0.30 + rng.range(0, 0.12)); // |sweep| in [0.30, 0.42)
  const pts: Pt[] = [];
  for (let i = 0; i < blades; i++) {
    const root = i * per;
    // Inner valley between blades.
    pts.push({ x: hub * Math.cos(root), y: hub * Math.sin(root) });
    // Blade tip, leading by the sweep so all blades lean the same way.
    const tipAng = root + per * (0.5 + sweep);
    pts.push({ x: tip * Math.cos(tipAng), y: tip * Math.sin(tipAng) });
  }
  // Lengthen one blade so any residual rotational symmetry is also broken.
  const big = rng.int(0, blades) * 2 + 1; // a tip index
  pts[big] = { x: pts[big]!.x * 1.1, y: pts[big]!.y * 1.1 };
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'pinwheel', vertices };
}

function generateCombBar(rng: Rng): OuterShape {
  // A horizontal bar whose top edge is a sawtooth of uneven teeth while the
  // bottom edge stays flat. Unequal tooth heights + a flat opposite edge leave
  // no mirror axis, and a random rotation varies the orientation.
  const halfW = 78 + rng.range(-4, 4);
  const baseY = 30 + rng.range(-3, 3);  // flat bottom edge
  const topY = -10 + rng.range(-3, 3);  // valley line of the teeth
  const teeth = rng.pick([4, 5, 6]);
  const pts: Pt[] = [];
  // Bottom-left then bottom-right (flat base).
  pts.push({ x: -halfW, y: baseY });
  pts.push({ x: halfW, y: baseY });
  // Walk the toothed top edge right -> left.
  const span = halfW * 2;
  for (let i = 0; i < teeth; i++) {
    const x0 = halfW - (span * i) / teeth;
    const x1 = halfW - (span * (i + 1)) / teeth;
    const xm = (x0 + x1) / 2;
    // Uneven tooth height per tooth — strongly varied so the profile is irregular.
    const toothH = 22 + rng.range(0, 34);
    pts.push({ x: x0, y: topY });          // valley at right of tooth
    pts.push({ x: xm, y: topY - toothH });  // peak
    pts.push({ x: x1, y: topY });          // valley at left of tooth
  }
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'combBar', vertices };
}

function generateUnevenStar(rng: Rng): OuterShape {
  // A 5-point star whose points have unequal lengths and whose spokes are
  // angularly jittered, so it has neither a mirror axis nor 72° symmetry.
  const points = 5;
  const inner = 30 + rng.range(-3, 3);
  const per = (Math.PI * 2) / points;
  const pts: Pt[] = [];
  for (let i = 0; i < points; i++) {
    // Per-point outer radius varies a lot -> unequal arm lengths.
    const outer = 60 + rng.range(0, 30);
    const tipAng = i * per + rng.range(-0.14, 0.14);
    pts.push({ x: outer * Math.cos(tipAng), y: outer * Math.sin(tipAng) });
    // Valley between this point and the next, also jittered.
    const valAng = i * per + per / 2 + rng.range(-0.12, 0.12);
    const valR = inner * rng.range(0.85, 1.15);
    pts.push({ x: valR * Math.cos(valAng), y: valR * Math.sin(valAng) });
  }
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'unevenStar', vertices };
}

function generatePennant(rng: Rng): OuterShape {
  // An asymmetric banner: a tall hoist edge tapering to a single fly point, with
  // a swallow-tail notch cut into the fly. The notch sits off-center and the top
  // and bottom edges have different slopes, so the flag is chiral.
  const hoistX = -70 + rng.range(-4, 4);  // left mast edge
  const flyX = 76 + rng.range(-4, 4);     // right fly point
  const topY = -44 + rng.range(-4, 4);
  const botY = 40 + rng.range(-4, 4);
  // Off-center swallow-tail notch on the fly side.
  const notchX = flyX - (34 + rng.range(0, 10));
  const notchY = (topY + botY) / 2 + rng.range(-12, 12);  // asymmetric vertical position
  const pts: Pt[] = [
    { x: hoistX, y: topY },                 // top of mast
    { x: flyX, y: topY + rng.range(8, 22) },// upper fly point (slanted)
    { x: notchX, y: notchY },               // swallow-tail notch (cut inward)
    { x: flyX - rng.range(2, 10), y: botY - rng.range(2, 16) }, // lower fly point
    { x: hoistX + rng.range(0, 10), y: botY },// bottom of mast (slanted base)
  ];
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'pennant', vertices };
}

// ─── Arrow family ────────────────────────────────────────────────────────────

function generateArrowFat(rng: Rng): OuterShape {
  const halfLen = 75 + rng.range(-5, 5);
  const shaftHTop = 20 + rng.range(-2, 4);
  const shaftHBot = 26 + rng.range(-2, 4);
  const headH = 44 + rng.range(-4, 4);
  const neckX = -halfLen + halfLen * (1.3 + rng.range(-0.05, 0.05));
  const asym = rng.range(4, 10);
  const pts: Pt[] = [
    { x: -halfLen, y: -shaftHTop },
    { x: neckX,    y: -shaftHTop },
    { x: neckX,    y: -headH },
    { x: halfLen,  y: asym },
    { x: neckX,    y: headH * 0.85 },
    { x: neckX,    y: shaftHBot },
    { x: -halfLen, y: shaftHBot },
  ];
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'arrowFat', vertices };
}

function generateArrowThin(rng: Rng): OuterShape {
  const halfLen = 78 + rng.range(-5, 5);
  const shaftHTop = 10 + rng.range(-1, 3);
  const shaftHBot = 14 + rng.range(-1, 3);
  const headH = 40 + rng.range(-4, 4);
  const neckX = -halfLen + halfLen * (1.28 + rng.range(-0.05, 0.05));
  const asym = rng.range(3, 8);
  const pts: Pt[] = [
    { x: -halfLen, y: -shaftHTop },
    { x: neckX,    y: -shaftHTop },
    { x: neckX,    y: -headH },
    { x: halfLen,  y: asym },
    { x: neckX,    y: headH * 0.88 },
    { x: neckX,    y: shaftHBot },
    { x: -halfLen, y: shaftHBot },
  ];
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'arrowThin', vertices };
}

function generateArrowBent(rng: Rng): OuterShape {
  // L-shaped arrow: horizontal shaft, then turns up with arrowhead pointing up.
  const sw = 18 + rng.range(-2, 3);
  const horizLen = 55 + rng.range(-5, 5);
  const vertLen  = 50 + rng.range(-5, 5);
  const headW = 35 + rng.range(-3, 4);
  const headH = 28 + rng.range(-3, 4);
  const asym = rng.range(4, 9);
  const pts: Pt[] = [
    { x: -horizLen, y: sw + asym },
    { x: -horizLen, y: -sw },
    { x: -sw,       y: -sw },
    { x: -sw,       y: -(vertLen) },
    { x: -headW,    y: -(vertLen) },
    { x: 0,         y: -(vertLen + headH) },
    { x: headW * 0.9, y: -(vertLen) },
    { x: sw,        y: -(vertLen) },
    { x: sw,        y: 0 },
  ];
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'arrowBent', vertices };
}

function generateArrowDouble(rng: Rng): OuterShape {
  // Two-headed arrow: one head larger than the other.
  const halfLen = 75 + rng.range(-5, 5);
  const shaftH = 14 + rng.range(-2, 3);
  const headHBig   = 40 + rng.range(-3, 4);
  const headHSmall = 27 + rng.range(-3, 3);
  const neckBig   = halfLen * 0.48;
  const neckSmall = halfLen * 0.46;
  const asym = rng.range(3, 7);
  const pts: Pt[] = [
    { x: halfLen,   y: asym },
    { x: neckBig,   y: headHBig },
    { x: neckBig,   y: shaftH },
    { x: -neckSmall, y: shaftH },
    { x: -neckSmall, y: headHSmall * 0.9 },
    { x: -halfLen,  y: -asym },
    { x: -neckSmall, y: -headHSmall },
    { x: -neckSmall, y: -shaftH },
    { x: neckBig,   y: -shaftH },
    { x: neckBig,   y: -headHBig * 0.9 },
  ];
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'arrowDouble', vertices };
}

function generateNotchedArrow(rng: Rng): OuterShape {
  // Arrow with V-notch cut into the back (broad-head style).
  const len = 78 + rng.range(-5, 5);
  const halfH = 40 + rng.range(-4, 4);
  const shaftH = 16 + rng.range(-2, 2);
  const neckX = rng.range(-8, 8);
  const notchD = 22 + rng.range(-3, 5);
  const asym = rng.range(5, 12);
  const pts: Pt[] = [
    { x: len,            y: 0 },
    { x: neckX,          y: halfH },
    { x: neckX,          y: shaftH },
    { x: -len * 0.3,     y: notchD * 0.6 },
    { x: -len * 0.6,     y: 0 },
    { x: -len * 0.3,     y: -(notchD + asym) },
    { x: neckX,          y: -shaftH },
  ];
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'notchedArrow', vertices };
}

// ─── Star family ─────────────────────────────────────────────────────────────

function generateStarN(
  kind: 'starFour' | 'starSix' | 'starSeven' | 'starEight',
  points: number,
  rng: Rng,
): OuterShape {
  const inner = 22 + rng.range(-3, 4);
  const per = (Math.PI * 2) / points;
  const pts: Pt[] = [];
  for (let i = 0; i < points; i++) {
    const tipAng = i * per + rng.range(-0.12, 0.12);
    const tipR = 60 + rng.range(-18, 18);
    pts.push({ x: tipR * Math.cos(tipAng), y: tipR * Math.sin(tipAng) });
    const valAng = i * per + per / 2 + rng.range(-0.1, 0.1);
    const valR = inner * rng.range(0.8, 1.2);
    pts.push({ x: valR * Math.cos(valAng), y: valR * Math.sin(valAng) });
  }
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind, vertices };
}

// ─── Letter / symbol shapes ───────────────────────────────────────────────────

function generateTShape(rng: Rng): OuterShape {
  const barHalfH = 15 + rng.range(-2, 3);
  const leftArm  = 52 + rng.range(-5, 5);
  const rightArm = 34 + rng.range(-5, 5);
  const stemHalfW = 15 + rng.range(-2, 2);
  const stemH    = 48 + rng.range(-5, 5);
  const off = rng.range(2, 7);   // stem offset from bar center
  const pts: Pt[] = [
    { x: -leftArm,          y: -barHalfH },
    { x: rightArm,          y: -barHalfH },
    { x: rightArm,          y: barHalfH },
    { x: stemHalfW + off,   y: barHalfH },
    { x: stemHalfW + off,   y: barHalfH + stemH },
    { x: -stemHalfW + off,  y: barHalfH + stemH },
    { x: -stemHalfW + off,  y: barHalfH },
    { x: -leftArm,          y: barHalfH },
  ];
  const cx = (rightArm - leftArm) / 2;
  const cy = barHalfH + stemH / 2;
  const centered = pts.map((p) => ({ x: p.x - cx, y: p.y - cy }));
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = centered.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'tShape', vertices };
}

function generateZShape(rng: Rng): OuterShape {
  const topW    = 65 + rng.range(-5, 5);
  const botW    = 50 + rng.range(-5, 5);
  const h       = 50 + rng.range(-4, 4);
  const thickT  = 18 + rng.range(-2, 4);
  const thickB  = 22 + rng.range(-2, 4);
  const pts: Pt[] = [
    { x: -topW,  y: -h },
    { x:  topW,  y: -h },
    { x:  topW,  y: -h + thickT },
    { x:  botW,  y:  h - thickB },
    { x:  botW,  y:  h },
    { x: -botW,  y:  h },
    { x: -botW,  y:  h - thickB },
    { x: -topW,  y: -h + thickT },
  ];
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'zShape', vertices };
}

function generateFShape(rng: Rng): OuterShape {
  // F shape: vertical bar + two horizontal arms, top arm longer.
  const height   = 85 + rng.range(-5, 5);
  const barThick = 18 + rng.range(-2, 3);
  const topW     = 60 + rng.range(-5, 5);
  const midW     = 40 + rng.range(-5, 5);
  const midY     = -8 + rng.range(-5, 5);
  const pts: Pt[] = [
    { x: 0,           y: -height / 2 },
    { x: topW,        y: -height / 2 },
    { x: topW,        y: -height / 2 + barThick },
    { x: barThick,    y: -height / 2 + barThick },
    { x: barThick,    y: midY },
    { x: midW,        y: midY },
    { x: midW,        y: midY + barThick },
    { x: barThick,    y: midY + barThick },
    { x: barThick,    y: height / 2 },
    { x: 0,           y: height / 2 },
  ];
  const cx = barThick / 2;
  const centered = pts.map((p) => ({ x: p.x - cx, y: p.y }));
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = centered.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'fShape', vertices };
}

function generateCrossShape(rng: Rng): OuterShape {
  // Plus sign with unequal arm lengths.
  const arm  = 16 + rng.range(-2, 3);
  const top  = 55 + rng.range(-5, 5);
  const rgt  = 45 + rng.range(-5, 5);
  const bot  = 62 + rng.range(-5, 5);
  const lft  = 38 + rng.range(-5, 5);
  const pts: Pt[] = [
    { x: -arm, y: -top },
    { x:  arm, y: -top },
    { x:  arm, y: -arm },
    { x:  rgt, y: -arm },
    { x:  rgt, y:  arm },
    { x:  arm, y:  arm },
    { x:  arm, y:  bot },
    { x: -arm, y:  bot },
    { x: -arm, y:  arm },
    { x: -lft, y:  arm },
    { x: -lft, y: -arm },
    { x: -arm, y: -arm },
  ];
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'crossShape', vertices };
}

function generateBoltShape(rng: Rng): OuterShape {
  // Lightning bolt zigzag.
  const w     = 55 + rng.range(-5, 5);
  const h     = 78 + rng.range(-5, 5);
  const thick = 20 + rng.range(-2, 4);
  const midX  = rng.range(-5, 10);
  const midY  = rng.range(-5, 5);
  const pts: Pt[] = [
    { x:  w / 2,                y: -h / 2 },
    { x:  midX,                 y: midY - thick / 2 },
    { x:  w / 2 - thick,        y: midY - thick / 2 },
    { x: -w / 2 + thick * 0.8,  y:  h / 2 },
    { x: -w / 2,                y:  h / 2 },
    { x:  midX - thick * 0.3,   y: midY + thick / 2 },
    { x: -(w / 2 - thick * 1.2), y: midY + thick / 2 },
  ];
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'boltShape', vertices };
}

function generateLShapeWide(rng: Rng): OuterShape {
  // L-shape variant: wider horizontal foot than the existing lShape.
  const vertH  = 70 + rng.range(-5, 5);
  const horizW = 65 + rng.range(-5, 5);
  const thick  = 22 + rng.range(-2, 4);
  const asym   = rng.range(4, 10);
  const pts: Pt[] = [
    { x: 0,           y: 0 },
    { x: horizW + asym, y: 0 },
    { x: horizW + asym, y: thick },
    { x: thick,       y: thick },
    { x: thick,       y: vertH },
    { x: 0,           y: vertH },
  ];
  const cx = (horizW + asym) / 2;
  const cy = vertH / 2;
  let centered = pts.map((p) => ({ x: p.x - cx, y: p.y - cy }));
  if (rng.bool()) centered = centered.map((p) => ({ x: -p.x, y: p.y }));
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = centered.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'lShapeWide', vertices };
}

// ─── Organic / natural shapes ─────────────────────────────────────────────────

function generateLeafShape(rng: Rng): OuterShape {
  const n    = rng.pick([8, 10, 12]);
  const half = n / 2;
  const len  = 75 + rng.range(-6, 6);
  const maxW = 36 + rng.range(-4, 5);
  const peakT      = 0.30 + rng.range(-0.06, 0.06);
  const asymTop    = 1.15 + rng.range(0, 0.15);
  const pts: Pt[] = [];
  // Tip first (rightmost), then top arc to base, then bottom arc back.
  pts.push({ x: len, y: 0 });
  for (let i = 1; i < half; i++) {
    const t = i / half;
    const x = len - t * len * 1.75;
    const w = maxW * Math.pow(Math.max(0, Math.sin((t / Math.max(peakT, 0.01)) * Math.PI * 0.5)), 0.6);
    pts.push({ x, y: -w * asymTop });
  }
  pts.push({ x: -len * 0.75, y: rng.range(-4, 4) });
  for (let i = half - 1; i >= 1; i--) {
    const t = i / half;
    const x = len - t * len * 1.75;
    const w = maxW * Math.pow(Math.max(0, Math.sin((t / Math.max(peakT, 0.01)) * Math.PI * 0.5)), 0.6);
    pts.push({ x, y: w });
  }
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'leafShape', vertices };
}

function generateCrescentShape(rng: Rng): OuterShape {
  // steps = 7 → 16 pts, 9 → 20 pts, 11 → 24 pts
  const steps = rng.pick([7, 9, 11]);
  const outerR  = 68 + rng.range(-4, 4);
  const innerR  = 46 + rng.range(-3, 5);
  const innerOff = 16 + rng.range(-2, 5);
  const span    = Math.PI * (1.35 + rng.range(-0.1, 0.1));
  const startA  = -span / 2;
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = startA + t * span;
    pts.push({ x: outerR * Math.cos(a), y: outerR * Math.sin(a) });
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const a = startA + t * span;
    pts.push({ x: innerOff + innerR * Math.cos(a), y: innerR * Math.sin(a) });
  }
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'crescentShape', vertices };
}

function generateCloudShape(rng: Rng): OuterShape {
  // nBumps=6 → 14 pts, 8 → 18 pts, 10 → 22 pts (2 corners + 2 per bump)
  const nBumps = rng.pick([6, 8, 10]);
  const baseW  = 72 + rng.range(-5, 5);
  const baseY  = 30 + rng.range(-3, 3);
  const valleyY = 5 + rng.range(-3, 3);
  const pts: Pt[] = [];
  pts.push({ x: baseW, y: baseY });
  const span = baseW * 2;
  for (let i = 0; i < nBumps; i++) {
    const xVal = baseW - (span * i) / nBumps;
    const xPeak = baseW - (span * (i + 0.5)) / nBumps;
    const peakH = 15 + rng.range(0, 26);
    pts.push({ x: xVal, y: valleyY });
    pts.push({ x: xPeak, y: valleyY - peakH });
  }
  pts.push({ x: -baseW, y: baseY });
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'cloudShape', vertices };
}

function generateDropletLong(rng: Rng): OuterShape {
  // Tall narrow teardrop: tip at top, round base. steps=9→10, 11→12, 13→14 vertices
  const steps = rng.pick([9, 11, 13]);
  const tipY  = -(72 + rng.range(-5, 5));
  const bulgeR = 38 + rng.range(-3, 4);
  const cx    = 24 + rng.range(-3, 3);
  const topScale = 1.0 + rng.range(0.14, 0.30);
  const botScale = 1.0 - rng.range(0.08, 0.20);
  const pts: Pt[] = [{ x: 0, y: tipY }];
  const startA = 0.45 * Math.PI;
  const endA   = 1.55 * Math.PI;
  for (let i = 0; i <= steps; i++) {
    const t = startA + ((endA - startA) * i) / steps;
    const sc = Math.sin(t) >= 0 ? topScale : botScale;
    pts.push({ x: bulgeR * sc * Math.cos(t), y: cx + bulgeR * Math.sin(t) });
  }
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'dropletLong', vertices };
}

function generateDropletFat(rng: Rng): OuterShape {
  // Wide squat teardrop. steps=9→10, 11→12 vertices
  const steps = rng.pick([9, 11]);
  const tipX  = 74 + rng.range(-5, 5);
  const bulgeR = 52 + rng.range(-4, 5);
  const cx    = -18 + rng.range(-3, 3);
  const topScale = 1.0 + rng.range(0.20, 0.38);
  const botScale = 1.0 - rng.range(0.10, 0.22);
  const pts: Pt[] = [{ x: tipX, y: 0 }];
  const startA = 0.40 * Math.PI;
  const endA   = 1.60 * Math.PI;
  for (let i = 0; i <= steps; i++) {
    const t = startA + ((endA - startA) * i) / steps;
    const sc = Math.sin(t) >= 0 ? topScale : botScale;
    pts.push({ x: cx + bulgeR * Math.cos(t), y: bulgeR * sc * Math.sin(t) });
  }
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'dropletFat', vertices };
}

function generateBlobAsym(rng: Rng): OuterShape {
  // Random-radius polygon with strong asymmetry enforced by stretching one quadrant.
  const n = rng.pick([6, 7, 8, 9]);
  const pts: Pt[] = [];
  let prev = 0;
  const offsets: number[] = [];
  for (let i = 0; i < n; i++) offsets.push(rng.range(0.4, 1.8));
  const sum = offsets.reduce((a, b) => a + b, 0);
  for (let i = 0; i < n; i++) {
    prev += (offsets[i]! / sum) * Math.PI * 2;
    const radius = R * rng.range(0.55, 1.0);
    pts.push({ x: radius * Math.cos(prev), y: radius * Math.sin(prev) });
  }
  // Stretch two non-adjacent vertices to guarantee strong chirality.
  const i1 = rng.int(0, n);
  const i2 = (i1 + Math.floor(n / 2) + 1) % n;
  pts[i1] = { x: pts[i1]!.x * 1.35, y: pts[i1]!.y * 1.20 };
  pts[i2] = { x: pts[i2]!.x * 0.60, y: pts[i2]!.y * 0.60 };
  return { kind: 'blobAsym', vertices: pts };
}

// ─── Geometric variants ───────────────────────────────────────────────────────

function generateTrapezoidRight(rng: Rng): OuterShape {
  // Trapezoid with one vertical left side (right angle at bottom-left and top-left).
  const w    = 80 + rng.range(-6, 6);
  const h    = 58 + rng.range(-5, 5);
  const lean = 28 + rng.range(-5, 8);   // how far right side leans
  const asym = rng.range(8, 18);         // top vs bottom width difference
  const pts: Pt[] = [
    { x: 0,         y: -h / 2 },
    { x: w - asym,  y: -h / 2 },
    { x: w + lean,  y:  h / 2 },
    { x: 0,         y:  h / 2 },
  ];
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'trapezoidRight', vertices };
}

function generateTrapezoidSkew(rng: Rng): OuterShape {
  // Heavily skewed trapezoid: both sides angled, but differently.
  const topW  = 45 + rng.range(-5, 5);
  const botW  = 75 + rng.range(-5, 5);
  const h     = 58 + rng.range(-5, 5);
  const shiftL = rng.range(10, 22);     // top-left vs bottom-left x difference
  const shiftR = rng.range(5, 15);      // asymmetric shift on right
  const pts: Pt[] = [
    { x: -topW / 2 + shiftL, y: -h / 2 },
    { x:  topW / 2 + shiftL + shiftR, y: -h / 2 },
    { x:  botW / 2,           y:  h / 2 },
    { x: -botW / 2,           y:  h / 2 },
  ];
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'trapezoidSkew', vertices };
}

function generateParallelogramAsym(rng: Rng): OuterShape {
  // Parallelogram with a slight taper so it is not a true parallelogram.
  const w     = 80 + rng.range(-6, 6);
  const h     = 50 + rng.range(-4, 4);
  const shear = 22 + rng.range(-4, 6);
  const taper = rng.range(6, 14);        // top slightly narrower than bottom
  const pts: Pt[] = [
    { x: -w / 2 + shear + taper, y: -h / 2 },
    { x:  w / 2 + shear,         y: -h / 2 },
    { x:  w / 2 - shear,         y:  h / 2 },
    { x: -w / 2 - shear,         y:  h / 2 },
  ];
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'parallelogramAsym', vertices };
}

function generateShieldShape(rng: Rng): OuterShape {
  // Shield / badge: flat top, sides taper to a point at the bottom.
  const n = rng.pick([5, 6]);
  const w = 60 + rng.range(-5, 5);
  const h = 75 + rng.range(-5, 5);
  const topH = 30 + rng.range(-3, 4);   // height of the flat-top rectangular portion
  const asym = rng.range(8, 18);         // bottom point offset
  let pts: Pt[];
  if (n === 5) {
    pts = [
      { x: -w,      y: -h / 2 },
      { x:  w,      y: -h / 2 },
      { x:  w,      y: -h / 2 + topH },
      { x:  asym,   y:  h / 2 },
      { x: -w,      y: -h / 2 + topH + rng.range(5, 15) },
    ];
  } else {
    pts = [
      { x: -w,      y: -h / 2 },
      { x:  w,      y: -h / 2 },
      { x:  w,      y: -h / 2 + topH },
      { x:  w * 0.4, y:  h / 2 },
      { x:  asym - w * 0.2, y:  h / 2 },
      { x: -w,      y: -h / 2 + topH + rng.range(5, 15) },
    ];
  }
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'shieldShape', vertices };
}

function generateHomeShape(rng: Rng): OuterShape {
  // House / home shape: rectangle with pointed roof. Off-center peak = asymmetry.
  const n = rng.pick([5, 6]);
  const w  = 60 + rng.range(-5, 5);
  const wallH = 40 + rng.range(-4, 4);
  const roofH = 40 + rng.range(-3, 5);
  const peakOff = rng.range(-12, 12);   // peak off-center
  const wallAsym = rng.range(6, 14);    // left wall shorter than right
  let pts: Pt[];
  if (n === 5) {
    pts = [
      { x: -w,           y:  wallH },
      { x: -w,           y: -wallH + wallAsym },
      { x:  peakOff,     y: -wallH - roofH },
      { x:  w,           y: -wallH },
      { x:  w,           y:  wallH },
    ];
  } else {
    pts = [
      { x: -w,           y:  wallH },
      { x: -w,           y: -wallH + wallAsym },
      { x:  peakOff - 5, y: -wallH - roofH },
      { x:  peakOff + rng.range(3, 8), y: -wallH - roofH + rng.range(3, 8) },
      { x:  w,           y: -wallH },
      { x:  w,           y:  wallH },
    ];
  }
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'homeShape', vertices };
}

function generateDiamondAsym(rng: Rng): OuterShape {
  // Asymmetric diamond/rhombus: vertices pulled off the axes.
  const n = rng.pick([4, 5]);
  const top    = { x: rng.range(-14, 14), y: -(68 + rng.range(-4, 4)) };
  const right  = { x:  58 + rng.range(-4, 6), y: rng.range(-10, 14) };
  const bottom = { x: rng.range(-16, 20),  y:  72 + rng.range(-4, 4) };
  const left   = { x: -(55 + rng.range(-4, 5)), y: rng.range(-12, 10) };
  let pts: Pt[];
  if (n === 4) {
    pts = [top, right, bottom, left];
  } else {
    // Extra point on one side for a 5-vertex asymmetric diamond
    const extra = {
      x: (right.x + bottom.x) / 2 + rng.range(-8, 8),
      y: (right.y + bottom.y) / 2 + rng.range(-8, 8),
    };
    pts = [top, right, extra, bottom, left];
  }
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'diamondAsym', vertices };
}

function generateRectangleWave(rng: Rng): OuterShape {
  // Rectangle with wavy/bumpy top edge. nWave=4→8, 6→10, 8→12 pts
  const nWave = rng.pick([4, 6, 8]);
  const w     = 75 + rng.range(-5, 5);
  const h     = 50 + rng.range(-4, 4);
  const pts: Pt[] = [];
  pts.push({ x: -w, y:  h });   // bottom-left
  pts.push({ x:  w, y:  h });   // bottom-right
  pts.push({ x:  w, y: -h });   // top-right corner
  const span = 2 * w;
  for (let i = 0; i < nWave; i++) {
    const x = w - (span * (i + 0.5)) / nWave;
    const peakH = 14 + rng.range(0, 22);
    pts.push({ x, y: -h - peakH });
  }
  pts.push({ x: -w, y: -h });   // top-left corner
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'rectangleWave', vertices };
}

function generateRectangleStep(rng: Rng): OuterShape {
  // Rectangle with one corner replaced by a step. n=6 or 8.
  const n  = rng.pick([6, 8]);
  const w  = 75 + rng.range(-5, 5);
  const h  = 52 + rng.range(-4, 4);
  const sw = 20 + rng.range(-3, 5);   // step width
  const sh = 18 + rng.range(-3, 5);   // step height
  let pts: Pt[];
  if (n === 6) {
    // Replace top-right corner with 2-point step.
    pts = [
      { x: -w,      y: -h },
      { x:  w - sw, y: -h },
      { x:  w - sw, y: -h + sh },
      { x:  w,      y: -h + sh },
      { x:  w,      y:  h },
      { x: -w,      y:  h },
    ];
  } else {
    // Replace two corners with steps (top-right and bottom-left).
    pts = [
      { x: -w,      y: -h },
      { x:  w - sw, y: -h },
      { x:  w - sw, y: -h + sh },
      { x:  w,      y: -h + sh },
      { x:  w,      y:  h },
      { x: -w + sw + rng.range(0, 5), y:  h },
      { x: -w + sw + rng.range(0, 5), y:  h - sh - rng.range(0, 5) },
      { x: -w,      y:  h - sh - rng.range(0, 5) },
    ];
  }
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'rectangleStep', vertices };
}

// ─── Gear / mechanical ────────────────────────────────────────────────────────

function generateGearBase(
  kind: 'gearFew' | 'gearMany',
  teeth: number,
  innerR: number,
  outerR: number,
  rng: Rng,
): OuterShape {
  const skipTooth = rng.int(0, teeth);
  const bigTooth  = (skipTooth + rng.int(2, teeth - 1)) % teeth;
  const pts: Pt[] = [];
  const per = (Math.PI * 2) / teeth;
  const gap = per * (0.42 + rng.range(-0.05, 0.05));
  for (let i = 0; i < teeth; i++) {
    const base = i * per;
    const tipR = i === bigTooth ? outerR + 14 : outerR;
    if (i === skipTooth) {
      pts.push({ x: innerR * Math.cos(base - gap / 2), y: innerR * Math.sin(base - gap / 2) });
      pts.push({ x: innerR * Math.cos(base + per - gap / 2), y: innerR * Math.sin(base + per - gap / 2) });
      continue;
    }
    pts.push({ x: innerR * Math.cos(base - gap / 2), y: innerR * Math.sin(base - gap / 2) });
    pts.push({ x: tipR * Math.cos(base - gap / 4),   y: tipR * Math.sin(base - gap / 4) });
    pts.push({ x: tipR * Math.cos(base + gap / 4),   y: tipR * Math.sin(base + gap / 4) });
    pts.push({ x: innerR * Math.cos(base + gap / 2), y: innerR * Math.sin(base + gap / 2) });
  }
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind, vertices };
}

function generateGearFew(rng: Rng): OuterShape {
  const teeth = rng.pick([5, 6]);
  return generateGearBase('gearFew', teeth, 36 + rng.range(-3, 3), 62 + rng.range(-3, 3), rng);
}

function generateGearMany(rng: Rng): OuterShape {
  const teeth = rng.pick([13, 15]);
  return generateGearBase('gearMany', teeth, 44 + rng.range(-3, 3), 70 + rng.range(-3, 3), rng);
}

function generateSawblade(rng: Rng): OuterShape {
  // Sawtooth disc: gradual rise, sharp drop per tooth. 7 or 9 teeth → 14 or 18 pts.
  const teeth = rng.pick([7, 9]);
  const innerR = 38 + rng.range(-3, 3);
  const outerR = 68 + rng.range(-3, 3);
  const per    = (Math.PI * 2) / teeth;
  const pts: Pt[] = [];
  for (let i = 0; i < teeth; i++) {
    const base = i * per;
    pts.push({ x: innerR * Math.cos(base),       y: innerR * Math.sin(base) });
    pts.push({ x: outerR * Math.cos(base + per * 0.85), y: outerR * Math.sin(base + per * 0.85) });
  }
  // One tooth slightly taller to break rotational symmetry.
  const big = rng.int(0, teeth) * 2 + 1;
  pts[big] = { x: pts[big]!.x * 1.12, y: pts[big]!.y * 1.12 };
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'sawblade', vertices };
}

function generateRatchet(rng: Rng): OuterShape {
  // Ratchet wheel: triangular angled teeth all leaning same direction (chiral).
  const teeth = rng.pick([6, 8]);
  const innerR = 38 + rng.range(-3, 3);
  const outerR = 68 + rng.range(-3, 3);
  const per    = (Math.PI * 2) / teeth;
  const lean   = per * (0.28 + rng.range(0, 0.06));  // how much teeth lean
  const pts: Pt[] = [];
  for (let i = 0; i < teeth; i++) {
    const base = i * per;
    pts.push({ x: innerR * Math.cos(base),         y: innerR * Math.sin(base) });
    pts.push({ x: outerR * Math.cos(base + lean),   y: outerR * Math.sin(base + lean) });
    pts.push({ x: innerR * Math.cos(base + per * 0.95), y: innerR * Math.sin(base + per * 0.95) });
  }
  // One tooth taller to break rotational symmetry.
  const big = rng.int(0, teeth) * 3 + 1;
  pts[big] = { x: pts[big]!.x * 1.12, y: pts[big]!.y * 1.12 };
  const ang = rng.range(0, Math.PI * 2);
  const c = Math.cos(ang), s = Math.sin(ang);
  const vertices = pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  return { kind: 'ratchet', vertices };
}

// ─── Extended polygon variants ────────────────────────────────────────────────

function generateIrregularOctagon(rng: Rng): OuterShape {
  // 8 or 9 vertex irregular polygon with stronger radius variation than irregularPolygon.
  const n = rng.pick([8, 9]);
  const pts: Pt[] = [];
  let prev = 0;
  const offsets: number[] = [];
  for (let i = 0; i < n; i++) offsets.push(rng.range(0.5, 1.5));
  const sum = offsets.reduce((a, b) => a + b, 0);
  for (let i = 0; i < n; i++) {
    prev += (offsets[i]! / sum) * Math.PI * 2;
    const radius = R * rng.range(0.60, 1.0);
    pts.push({ x: radius * Math.cos(prev), y: radius * Math.sin(prev) });
  }
  const i1 = rng.int(0, n);
  const i2 = (i1 + 3) % n;
  pts[i1] = { x: pts[i1]!.x * 1.30, y: pts[i1]!.y * 1.15 };
  pts[i2] = { x: pts[i2]!.x * 0.65, y: pts[i2]!.y * 0.65 };
  return { kind: 'irregularOctagon', vertices: pts };
}

function generateConcavePolygon(rng: Rng): OuterShape {
  // Polygon with one vertex pushed inward past the centroid, creating a concave corner.
  const n = rng.pick([6, 7, 8]);
  const pts: Pt[] = [];
  let prev = 0;
  const offsets: number[] = [];
  for (let i = 0; i < n; i++) offsets.push(rng.range(0.6, 1.4));
  const sum = offsets.reduce((a, b) => a + b, 0);
  for (let i = 0; i < n; i++) {
    prev += (offsets[i]! / sum) * Math.PI * 2;
    const radius = R * rng.range(0.70, 1.0);
    pts.push({ x: radius * Math.cos(prev), y: radius * Math.sin(prev) });
  }
  // Push one vertex strongly inward to create a concave notch.
  const k = rng.int(0, n);
  pts[k] = { x: pts[k]!.x * 0.25, y: pts[k]!.y * 0.25 };
  // Stretch the opposite vertex to compensate and ensure chirality.
  const opp = (k + Math.floor(n / 2)) % n;
  pts[opp] = { x: pts[opp]!.x * 1.25, y: pts[opp]!.y * 1.25 };
  return { kind: 'concavePolygon', vertices: pts };
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
