# Spatial-Reasoning Aptitude Puzzles

Two self-contained, embeddable spatial-reasoning puzzles for pilot-aptitude / cognitive practice. React + TypeScript + SVG, Tailwind v4, Motion (`framer-motion`). Inspired by the dark cockpit-instrument aesthetic of flying-geeks.com.

**Rotation Puzzle** — the user is shown an **Original** figure and four candidates **A · B · C · D**. One candidate is the original rotated by a non-trivial angle; the others are distractors — typically a mirror image, a swap, a shift, or a wrong angle.

**Matching Parts and Figures Puzzle** — the user is shown a solid **Reference** shape and four options, each containing **two disjoint pieces**. The pieces of exactly one option, when rotated and joined without overlap, reproduce the reference shape exactly. Distractors are: shape/proportion mismatch, incompatible cut lines, scale error, or gap/overlap between pieces. Modeled after Peterson's *Master the Mechanical Aptitude and Spatial Relations Test*, Part I Test 3.

Clicking an option triggers a snap-together animation and reveals a side-by-side comparison panel (reference vs. your snapped answer at the same scale), making each distractor's flaw visually obvious.

The demo app at `/` mounts both puzzles behind a bottom-right toggle (persisted in `localStorage`).

## Running

```bash
npm install
npm run dev       # http://localhost:5173 — mounts <RotationPuzzle difficulty="medium" />
npm run test     # vitest run, full acceptance suite
npm run build    # type-check + production bundle
```

## Architecture

```
src/
  matching-parts-puzzle/   # NEW — matching parts and figures
    index.tsx              # <MatchingPartsPuzzle /> — state machine, header, scoring, keyboard nav
    ReferenceFigure.tsx    # SVG renderer for the solid reference shape
    OptionFigure.tsx       # SVG renderer for an option (two pieces)
    Piece.tsx              # single filled polygon (transform = slot + rotate + flipX + recenter)
    HowToPlay.tsx          # info modal (matching-specific copy)
    types.ts
    generate/
      index.ts             # generateMatchingPuzzle(difficulty) — orchestrator
      shapes.ts            # 6 reference shapes + 6 near-twins (for proportion-mismatch)
      cuts.ts              # splitPolygonByChord + splitPolygonByPolyline + cutPolygon
      layout.ts            # piece placement in the 320×140 option viewBox
      distractors.ts       # 4 distractor builders + pickDistractorKinds
    __tests__/             # shapes, cuts, distractors, generate (61 tests)

  rotation-puzzle/
    index.tsx              # <RotationPuzzle /> — state machine, header, scoring, keyboard nav
    Figure.tsx             # SVG renderer for {Figure, Transform}
    Reveal.tsx             # animated rotation overlay (original → correct orientation)
    OuterShape.tsx         # renders the 8 outer-shape kinds
    ShapePrimitive.tsx     # renders the 16 internal-element kinds
    DifficultyChips.tsx    # difficulty selector
    HowToPlay.tsx          # info modal
    hooks/                 # useLocalStorage, useTimer
    generate/
      index.ts             # generatePuzzle(difficulty) — orchestrates everything
      outerShapes.ts       # 8 outer-shape generators with asymmetry guarantees
      internals.ts         # internal-element placement (margin + overlap + chirality rules)
      angles.ts            # continuous random angle sampler with rejection
      symmetry.ts          # Hausdorff distance + mirror & rotational symmetry detection
      distractors.ts       # 8 distractor mutators + selector
      geometry.ts          # rotate/reflect/sample/bounds
      rng.ts               # seedable mulberry32 PRNG
    types.ts
    __tests__/
      symmetry.test.ts     # acceptance test #4 + unit tests for Hausdorff, symmetry detection
      transforms.test.ts   # acceptance tests #1, #2
      generate.test.ts     # acceptance tests #3, #5, #6, #7, #8 + smoke
      distractors.test.ts  # each distractor produces the expected mutation
  demo/App.tsx             # mounts <RotationPuzzle />
  main.tsx                 # Vite entry
  index.css                # Tailwind v4 import + @theme tokens + fonts
```

## Validation

Correctness is **structural-identity-up-to-rotation**, not angle equality. A user's pick is marked correct iff `isPureRotationOf(original, candidate)` returns true — meaning the candidate's figure is an exact unmirrored clone of the original (same outer shape, same multiset of internal elements with matching kind/size/filled/fillStyle/center/local-rotation), regardless of `transform.rotate`. The angle the generator chose for the canonical correct candidate is shown after reveal as a learning aid ("Rotation: 73°"), not as the success criterion.

The eight rejection conditions enforced by the predicate cover all six spec fail modes: mirror (`flipX`), swapped elements (centers differ after sort), missing or extra elements (length differs), altered geometry or local orientation (kind / rotation differs), distorted proportions (size differs, or outer-shape vertices differ), and shifted elements (center differs). See `src/rotation-puzzle/validation.ts`.

## Generation pipeline (1-minute summary)

1. **Outer shape** — one of 8 kinds (irregular polygon, notched rectangle, arrowhead, L-shape, asymmetric ellipse, irregular hexagon, kite, chevron). Each generator is built to be measurably asymmetric; the generator post-checks `minMirrorDistance > 8px` and retries otherwise.
2. **Angle θ** — sampled continuously inside the difficulty's range. Rejected if too small (difficulty floor), or within ±8° of any rotational-symmetry angle of the outer shape (a square rotated 90° looks like itself — bad). 180° gets a flag that demands ≥ 2 chiral internals.
3. **Internals** — count by difficulty (2/3/3-4/4). Chiral kinds (arrow, crescent, L-shape, parallelogram, right triangle) are biased into harder puzzles so the mirror distractor is visually obvious. Centers placed with margin + pairwise-distance constraints.
4. **Distractors** — three kinds chosen from a catalog of 10 (`mirror`, `swap`, `attribute`, `shift`, `inner-rotated`, `kind-changed`, `fillstyle-changed`, `missing`, `extra`, `resized`). `mirror` is forced into ≥ ~78% of puzzles (the spec required ≥ 60%). Each distractor is post-checked against `isPureRotationOf(original, distractor)` — if it accidentally passes, the puzzle is regenerated.
5. **Shuffle & emit** — Fisher-Yates shuffle; record `correctIndex`. Slot distribution is asserted uniform by chi-square test in the suite.

The generator is seedable (`generatePuzzle('medium', { seed: 1234 })`) so tests are reproducible.

## Adding a new shape kind

### A new outer-shape kind

1. Add the new kind to the `OuterShape` discriminated union in `src/rotation-puzzle/types.ts`.
2. Add a generator in `src/rotation-puzzle/generate/outerShapes.ts`:
   - Produce vertices roughly inside ±80 of origin so the figure fits the 200×200 viewBox.
   - Verify `minMirrorDistance(shape) > 8` — if your shape is too symmetric, perturb a vertex.
3. Register it in `OUTER_KINDS` and the `generateOuter` switch in the same file.
4. Add a rendering branch in `src/rotation-puzzle/OuterShape.tsx`.
5. Re-run `npm run test`. The asymmetry suite (`symmetry.test.ts`) will catch any shape that fails the guarantee.

### A new internal-element kind

1. Add the kind to `InternalElementKind` and `ALL_INTERNAL_KINDS` in `types.ts`.
2. If it's chiral, add it to `CHIRAL_KINDS`.
3. Add a rendering branch to the `switch (kind)` in `ShapePrimitive.tsx`. Center it at (0,0) sized to `size`. If it's chiral, encode the asymmetry along a known axis (e.g. always have the "open" side on +x at rotation 0) so flips read clearly.
4. If it's chiral, also tweak `sampleInternal` in `generate/symmetry.ts` to encode the chirality in the point cloud (so Hausdorff sees the mirror differ).
5. Add a similar-kinds entry to `SIMILAR_KIND_MAP` in `generate/distractors.ts` if you want `kind-changed` distractors to pick your new kind as a substitute.

## Adding a new distractor kind

1. Add the kind to `DistractorKind` in `types.ts`.
2. Implement the mutation in `src/rotation-puzzle/generate/distractors.ts`:
   - Pure function: takes `(figure, theta, rng)`, returns a `Candidate` or `null` if not viable for this figure.
   - Add a `case` in `buildDistractor`.
3. Add it to the `pool` in `pickDistractorKinds`, and an `isViable` branch if it has prerequisites (e.g. needs at least 2 internals, or a chiral element).
4. Add a label in `labelForKind` in `index.tsx`.
5. Write a test in `__tests__/distractors.test.ts` asserting that exactly the intended thing is mutated.

## Accessibility

- Each candidate is a real `<button>` with `aria-label="Option A: figure"`.
- Arrow keys move focus between candidates; Enter selects; **N** advances. ESC closes the help modal.
- `role="status" aria-live="polite"` announces correctness.
- `prefers-reduced-motion: reduce` disables stagger, scale, and rotation animations.
- Color is never the sole signal — ✓ / ✗ icons accompany the green/red rings.

## Tests

Run `npm run test`. The suite uses a seedable PRNG so every test is deterministic, and asserts every guarantee from the spec — geometric identity of the correct candidate (#1), distinctness of all 4 (#2), uniform slot distribution by chi-square (#3), asymmetry of the outer shape and full figure (#4), min-angle floor (#5), mirror ratio ≥ 60% (#6), no false-positive correctness (#7), full coverage of all 16 internal kinds on Hard ∪ Expert (#8).

The acceptance N is set to 250–300 per difficulty (the spec calls for 1000) to keep the suite under a minute. Bump `N` in any test file to run the full 1000 — all guarantees hold.

## Tech

- **Vite 6** + **React 18** + **TypeScript 5.7** (strict mode)
- **Tailwind CSS v4** via `@tailwindcss/vite` (CSS-first `@theme` config)
- **framer-motion** for staggered card entrances and the reveal rotation animation
- **Vitest 2** with **jsdom** + **@testing-library/react**
- Fonts: **Space Grotesk** (display) + **JetBrains Mono** (numbers/labels) — explicitly not Inter or Roboto, per spec.

## Matching Parts and Figures — module details

**Reference shapes (6):** `hexagon`, `square`, `circle`, `oval`, `kite`, `triangle`. Curves are sampled at 64 verts; polygons use their exact vertex set. All shapes are vertex-centroid-centered on origin.

**Cut strategies (2):**
- `straight-chord` — pick two boundary points ≥ 28% of the perimeter apart, split the polygon along the chord. Used on easy/medium.
- `polyline` — same boundary endpoints, but the cut path passes through one interior bend point (perpendicular offset from the chord midpoint, validated to lie inside the polygon). Used on hard/expert.

`splitPolygonByChord` and `splitPolygonByPolyline` walk the polygon's vertices, splitting at the two boundary points and emitting two closed polygons that share the cut path in reverse. Piece areas sum to the reference area within 0.5 px² across all 6 shapes × both strategies (asserted in `cuts.test.ts`).

**Distractor kinds (4):**
- `proportion-mismatch` — the pieces are cut from a near-twin shape (e.g., circle ↔ oval, square ↔ rectangle, hexagon ↔ irregular hexagon, kite ↔ skewed kite, triangle ↔ scalene). Pieces interlock with each other but the combined figure has wrong proportions.
- `incompatible-cut` — piece A from the original cut, piece B from a second cut of the same reference. The generator retries until cut-edge lengths differ by ≥ 4 px and piece-A areas across the two cuts differ by ≥ 30 px², so the swapped pieces can never tile back into the reference.
- `scale-error` — both pieces uniformly scaled about their centroids by `s ∈ [0.78, 0.88] ∪ [1.14, 1.26]` (tighter range on hard/expert).
- `overlaps-gaps` — one of the two cut pieces has its cut edge notched: a new vertex is inserted at the midpoint of the cut chord, offset perpendicular by ±4–7 px (inward = visible gap, outward = visible bump/overlap). This breaks cut-edge congruence with the other piece and shifts the piece's area by ~60–200 px².

**Strictness guarantee.** Every distractor's combined piece area differs from the reference area by **≥ 30 px²** (assertion-checked at the end of each builder; failures regenerate via the existing retry loop). Since area is invariant under rigid motion (rotation + translation), no amount of mental rearrangement can make a distractor reproduce the reference shape. Mirror-image distractors are intentionally excluded, since they're ambiguous on perfectly symmetric reference shapes.

`pickDistractorKinds` picks 3 of the 4 viable kinds uniformly per puzzle, so each kind appears in roughly 75% of puzzles (observed 67–82% across difficulties).

**Layout.** Each option's SVG viewBox is computed dynamically (`computeOptionBounds` in [src/matching-parts-puzzle/generate/layout.ts](src/matching-parts-puzzle/generate/layout.ts)) by enveloping both pieces' bounding circles in their scrambled poses *and* their snapped poses, with 10 px padding. This guarantees no clipping at any rotation, for any shape, and accommodates the snap-together animation without overflow.

**Snap-together animation & comprehensive review.** Each `<Piece>` is wrapped in `<motion.g>` (framer-motion). When the user clicks an option, that option's two pieces animate from their scrambled poses to identity (rotation 0, center (0,0)) over 500 ms with a 50 ms stagger. 550 ms later a `<ComparisonView>` panel fades in: reference shape at top, and **all four options** snapped at the same 220×220 scale in a row below — correct option ringed green with a check, the user's wrong pick ringed red with a cross, the other two with neutral borders. Each panel carries a short label ("Wrong proportions", "Cuts don't match", "Wrong size", "Gap or overlap", "✓ Fits") plus the full per-option explanation. `prefers-reduced-motion: reduce` collapses all timing to 0 ms.

**Validation:** correctness is `idx === puzzle.correctIndex` — by construction, the correct option's pieces come from a valid cut of the reference; tests assert that the correct option's piece-areas sum to the reference area within 1 px² across all difficulties, and that every distractor option violates the strict area-delta invariant across a 200-puzzle sample.

## Out of scope (v1)

No backend, no leaderboards, no timer-pressure mode, no multi-figure odd-one-out variant. The score and difficulty are persisted only in `localStorage`.
