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
  | 'padovan';

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

export type SeriesSettings = {
  count: number;
  difficulty: Difficulty | 'mixed';
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
