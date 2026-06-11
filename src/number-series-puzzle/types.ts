export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type PatternKind =
  // Easy
  | 'arith-add'
  | 'arith-sub'
  | 'arith-add-round'
  | 'geo-mul'
  | 'geo-div'
  | 'multiples'
  | 'counting'
  | 'alternating-pair'
  | 'powers-small'
  | 'count-down'
  | 'geo-fractional'
  | 'const-plus-pow2'
  | 'add-sub-alt'
  | 'double-add-1'
  | 'skip-count-offset'
  | 'ones-place-cycle'
  | 'add-then-double'
  | 'add-pair-repeat'
  | 'sub-then-add'
  | 'tens-plus-ones'
  // Medium
  | 'arith-gap-grows'
  | 'geo-factor-grows'
  | 'odd-step-add'
  | 'second-diff-const'
  | 'squares'
  | 'cubes'
  | 'squares-offset'
  | 'fibonacci'
  | 'triangular'
  | 'linear-recurrence'
  | 'alternating-ops'
  | 'interleaved-2'
  | 'primes'
  | 'gap-doubles'
  | 'pair-skip'
  | 'factorial-by-position'
  | 'squares-alt-sign'
  | 'add-halving'
  | 'gaps-are-squares'
  | 'gaps-are-desc-squares'
  | 'gaps-are-multiples-of-k'
  | 'mul-by-n-add-n'
  | 'mul-by-n-sub-k'
  | 'n-cubed-plus-n'
  | 'n2-minus-prev-pos'
  | 'add-primes'
  | 'mul-growing-fraction'
  | 'add-k-times-odd'
  // Hard
  | 'second-diff-arith'
  | 'n-squared-minus-k'
  | 'n-cubed-minus-k'
  | 'quadratic-n2-plus-n'
  | 'quadratic-general'
  | 'lucas'
  | 'pell'
  | 'recurrence-with-position'
  | 'pow2-minus-n'
  | 'pow2-plus-n'
  | 'alt-sign-squares'
  | 'digit-sum-add'
  | 'triangular-offset'
  | 'deceptive-start'
  | 'chained-two-op'
  | 'factorial'
  | 'half-step-multiplier'
  | 'add-cube-minus-1'
  | 'mul-by-n-sub-n'
  | 'mul-desc-sub-1'
  | 'alt-mul-op'
  | 'alt-sign-shrinking'
  | 'gaps-are-square-plus-cube'
  | 'mul-by-n-add-n-squared'
  | 'descending-dual-mul-sub'
  | 'second-diff-arith-desc'
  | 'mul2-add-decreasing'
  | 'gaps-desc-n2-minus-1'
  | 'prime-squares'
  | 'div-then-sub-decreasing'
  // Expert
  | 'n4-minus-k'
  | 'factorial-offset'
  | 'catalan'
  | 'cubic-general'
  | 'mul-by-position-plus-1'
  | 'interleaved-3'
  | 'pow-of-square'
  | 'sum-quad-exp'
  | 'alt-sign-factorial'
  | 'n-to-n'
  | 'fib-times-n'
  | 'padovan'
  | 'third-diff-pattern'
  | 'div2-add-pow2-growing'
  | 'half-step-both'
  | 'mul-by-n-add-n-x-n-plus-1'
  | 'mul-growing-alt-add'
  | 'add-dec-mul-inc'
  | 'mul-n-add-next-square'
  | 'mul-by-2n-sub-2n'
  | 'sum-of-all-previous'
  | 'mul3-sub-growing';

export type DistractorKind =
  | 'shifted'             // applied the rule at the wrong index (off-by-one in n)
  | 'first-layer-only'    // caught outer rule, missed second-order layer
  | 'wrong-base'          // used the wrong constant (e.g. ×3 instead of ×2)
  | 'plausible-ap'        // completed as a linear arithmetic progression
  | 'plausible-gp'        // completed as a geometric progression
  | 'sign-flip'           // magnitude correct, sign wrong
  | 'off-by-one-step'     // one step short or long
  | 'wrong-formula'       // applied a related but incorrect formula
  | 'close-miss';         // numerically near, but logically wrong

export type SeriesOption = {
  value: number;
  isCorrect: boolean;
  distractorKind?: DistractorKind;
  rationale: string;
};

export type SeriesPattern = {
  kind: PatternKind;
  difficulty: Difficulty;
  formula: string;       // e.g. "aₙ = n² + n"
  explanation: string;   // natural-language rule
  terms: number[];       // materialized terms (1-indexed math, 0-indexed array)
};

export type SeriesQuestion = {
  id: string;
  difficulty: Difficulty;
  visibleTerms: (number | null)[]; // null marks the blank
  missingIndex: number;            // 0-based position of the blank
  options: SeriesOption[];         // shuffled, length 4
  correctValue: number;
  pattern: SeriesPattern;
};

export type PracticeMode = 'sequential' | 'sheet';

export type SeriesSettings = {
  count: number;
  difficulty: Difficulty | 'mixed';
  mode?: PracticeMode; // optional: stored settings predating this field default to 'sequential'
};

export type SessionResult = {
  question: SeriesQuestion;
  pickedIndex: number;
  correct: boolean;
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};
