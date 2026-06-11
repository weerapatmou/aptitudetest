// Approximate Calculation — estimation word problems.
// The defining trait: numbers are deliberately near round values so the solver
// ROUNDS and computes mentally. Options are an evenly-spaced ladder; the correct
// one is the rung closest to the exact value.

export type ArchetypeKind =
  | 'speed' // distance ÷ time
  | 'unit-price' // qty × price
  | 'rows-times-per-row' // rows × per-row
  | 'division-per-unit' // total ÷ per-unit
  | 'percentage-of' // p% of total
  | 'percentage-complement' // (100 − p)% of total ("84.95% filled → empty")
  | 'area-square' // side²
  | 'area-rectangle' // w × l
  | 'volume-box' // w × l × h
  | 'rate-chain' // rate × hours/day × days
  | 'simple-interest' // P × r × t
  | 'round-trip-time' // distance ÷ speed → minutes
  | 'fuel-range' // tank ÷ consumption × 100
  | 'profit-markup' // cost × r
  | 'how-many-fit' // floor(total ÷ per-item)
  | 'time-to-finish' // total ÷ per-period
  | 'discount-price' // price × (1 − discount%)
  | 'average-of-group' // total ÷ count
  | 'tip-or-tax' // bill × rate%
  | 'currency-conversion' // amount × exchange rate
  | 'map-distance' // map cm × scale (km per cm)
  | 'density-mass' // volume × density
  | 'recipe-scaling' // per-serving × servings
  | 'ratio-split' // total × (share ÷ parts)
  | 'compound-percentage' // base × (1 + r%)² ("two years of growth")
  | 'average-speed-roundtrip'; // total distance ÷ total time

export type DistractorKind =
  | 'order-of-magnitude' // ×10 or ÷10 slip (dropped a zero)
  | 'wrong-operation' // added instead of multiplied, etc.
  | 'partial-step' // stopped one step early in a multi-step chain
  | 'rounded-wrong-way' // rounded the inputs the wrong direction
  | 'forgot-conversion' // skipped a unit conversion (hr→min, %→fraction)
  | 'ladder-neighbor' // an adjacent rung on the option ladder
  | 'close-miss'; // numerically near, logically off

// Structurally identical to number-series' SeriesOption so the reveal UI matches.
export type ApproxOption = {
  value: number;
  isCorrect: boolean;
  distractorKind?: DistractorKind;
  rationale: string;
};

export type ApproxProblem = {
  kind: ArchetypeKind;
  /** Fully rendered prompt with the "messy" numbers embedded. */
  prompt: string;
  /** Short label / unit for the answer, e.g. "km/hr", "$", "m²", "min". */
  unit: string;
  /** EXACT result of the messy inputs (not rounded). */
  exactValue: number;
  /** The clean rounded value the solver mentally lands on; centres the ladder. */
  estimateValue: number;
  /** One-line "quick mental logic" — the rounding story. */
  mentalLogic: string;
  /** Formula skeleton shown in the Rule box, e.g. "speed = distance ÷ time". */
  formula: string;
  /** Decimal places for displaying option values (0 for counts). */
  precision: number;
};

export type ApproxQuestion = {
  id: string;
  problem: ApproxProblem;
  options: ApproxOption[]; // sorted ascending, length 5
  correctValue: number; // the ladder rung chosen as correct (rounded to precision)
};

export type PracticeMode = 'sequential' | 'sheet';

export type ApproxSettings = {
  count: number;
  mode?: PracticeMode; // settings predating this field default to 'sequential'
};

export type SessionResult = {
  question: ApproxQuestion;
  pickedIndex: number;
  correct: boolean;
};
