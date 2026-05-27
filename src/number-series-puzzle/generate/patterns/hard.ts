import type { PatternGenerator } from './easy';

const signWord = (k: number): string => (k >= 0 ? '+' : '−');

// H1: second differences form an arithmetic sequence (Δ² grows by 1)
const secondDiffArith: PatternGenerator = (rng, length) => {
  const start = rng.int(1, 6);
  const startGap = rng.int(2, 4);
  const startSecondGap = rng.int(2, 4);
  const terms: number[] = [start];
  let gap = startGap;
  let secondGap = startSecondGap;
  for (let i = 1; i < length; i++) {
    terms.push(terms[i - 1]! + gap);
    gap += secondGap;
    secondGap += 1;
  }
  return {
    kind: 'second-diff-arith',
    difficulty: 'hard',
    formula: `Δ² itself grows by 1`,
    explanation: `The differences are +${startGap}, +${startGap + startSecondGap}, +${startGap + startSecondGap + startSecondGap + 1}, … — and the gaps between *those* gaps themselves grow by 1 each step.`,
    terms,
  };
};

// H2: aₙ = n² − k
const n2MinusK: PatternGenerator = (rng, length) => {
  const k = rng.int(2, 7);
  const startN = rng.int(1, 4);
  const terms = Array.from({ length }, (_, i) => (startN + i) ** 2 - k);
  return {
    kind: 'n-squared-minus-k',
    difficulty: 'hard',
    formula: `aₙ = n² − ${k}`,
    explanation: `Each term is n squared minus ${k} (starting at n = ${startN}).`,
    terms,
  };
};

// H3: aₙ = n³ − k
const n3MinusK: PatternGenerator = (rng, length) => {
  const k = rng.int(2, 6);
  const startN = rng.int(1, 3);
  const maxLen = Math.min(length, 6);
  const terms = Array.from({ length: maxLen }, (_, i) => (startN + i) ** 3 - k);
  while (terms.length < length) terms.push((startN + terms.length) ** 3 - k);
  return {
    kind: 'n-cubed-minus-k',
    difficulty: 'hard',
    formula: `aₙ = n³ − ${k}`,
    explanation: `Each term is n cubed minus ${k} (starting at n = ${startN}).`,
    terms,
  };
};

// H5: aₙ = n² + n
const quadN2PlusN: PatternGenerator = (rng, length) => {
  const startN = rng.int(1, 3);
  const terms = Array.from({ length }, (_, i) => {
    const n = startN + i;
    return n * n + n;
  });
  return {
    kind: 'quadratic-n2-plus-n',
    difficulty: 'hard',
    formula: `aₙ = n² + n`,
    explanation: `Each term is n squared plus n: n·(n + 1) (starting at n = ${startN}).`,
    terms,
  };
};

// H6: general quadratic aₙ = a·n² + b·n + c
const quadraticGeneral: PatternGenerator = (rng, length) => {
  const a = rng.pick([1, 2] as const);
  const b = rng.int(-3, 4);
  const c = rng.int(-3, 4);
  const startN = 1;
  const terms = Array.from({ length }, (_, i) => {
    const n = startN + i;
    return a * n * n + b * n + c;
  });
  return {
    kind: 'quadratic-general',
    difficulty: 'hard',
    formula: `aₙ = ${a}n² ${signWord(b)} ${Math.abs(b)}n ${signWord(c)} ${Math.abs(c)}`,
    explanation: `Quadratic in position: each term equals ${a}n² ${signWord(b)} ${Math.abs(b)}n ${signWord(c)} ${Math.abs(c)}.`,
    terms,
  };
};

// H9: Lucas numbers
const lucas: PatternGenerator = (_rng, length) => {
  const terms: number[] = [2, 1];
  for (let i = 2; i < length; i++) terms.push(terms[i - 1]! + terms[i - 2]!);
  return {
    kind: 'lucas',
    difficulty: 'hard',
    formula: `aₙ = aₙ₋₁ + aₙ₋₂; seeds 2, 1`,
    explanation: `Lucas numbers — like Fibonacci but seeded with 2 and 1.`,
    terms,
  };
};

// H10: Pell numbers aₙ = 2aₙ₋₁ + aₙ₋₂, seeds 0, 1
const pell: PatternGenerator = (_rng, length) => {
  const terms: number[] = [0, 1];
  for (let i = 2; i < length; i++) terms.push(2 * terms[i - 1]! + terms[i - 2]!);
  return {
    kind: 'pell',
    difficulty: 'hard',
    formula: `aₙ = 2·aₙ₋₁ + aₙ₋₂`,
    explanation: `Pell numbers: each term is twice the previous plus the one before.`,
    terms,
  };
};

// H12: aₙ₊₁ = 2·aₙ + n
const recurrenceWithPosition: PatternGenerator = (rng, length) => {
  const start = rng.int(1, 3);
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) terms.push(2 * terms[i - 1]! + (i - 1));
  return {
    kind: 'recurrence-with-position',
    difficulty: 'hard',
    formula: `aₙ₊₁ = 2·aₙ + n`,
    explanation: `Double the previous term, then add the position index (0, 1, 2, …).`,
    terms,
  };
};

// H13: aₙ = 2ⁿ − n
const pow2MinusN: PatternGenerator = (_rng, length) => {
  const maxLen = Math.min(length, 12);
  const terms: number[] = [];
  for (let i = 1; i <= maxLen; i++) terms.push(2 ** i - i);
  while (terms.length < length) {
    const n = terms.length + 1;
    terms.push(2 ** n - n);
  }
  return {
    kind: 'pow2-minus-n',
    difficulty: 'hard',
    formula: `aₙ = 2ⁿ − n`,
    explanation: `Each term is 2 to the power n, minus n.`,
    terms,
  };
};

// H14: aₙ = 2ⁿ + n
const pow2PlusN: PatternGenerator = (_rng, length) => {
  const maxLen = Math.min(length, 12);
  const terms: number[] = [];
  for (let i = 1; i <= maxLen; i++) terms.push(2 ** i + i);
  while (terms.length < length) {
    const n = terms.length + 1;
    terms.push(2 ** n + n);
  }
  return {
    kind: 'pow2-plus-n',
    difficulty: 'hard',
    formula: `aₙ = 2ⁿ + n`,
    explanation: `Each term is 2 to the power n, plus n.`,
    terms,
  };
};

// H16: alternating sign × squares
const altSignSquares: PatternGenerator = (_rng, length) => {
  const terms = Array.from({ length }, (_, i) => {
    const n = i + 1;
    return (n % 2 === 1 ? -1 : 1) * n * n;
  });
  return {
    kind: 'alt-sign-squares',
    difficulty: 'hard',
    formula: `aₙ = (−1)ⁿ · n²`,
    explanation: `Signs alternate (− for odd n, + for even n), magnitudes are perfect squares.`,
    terms,
  };
};

const digitSum = (x: number): number => {
  let s = 0;
  let v = Math.abs(x);
  while (v > 0) {
    s += v % 10;
    v = Math.floor(v / 10);
  }
  return s;
};

// H17: aₙ₊₁ = aₙ + digit-sum(aₙ)
const digitSumAdd: PatternGenerator = (rng, length) => {
  const start = rng.int(3, 12);
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) {
    const prev = terms[i - 1]!;
    terms.push(prev + digitSum(prev));
  }
  return {
    kind: 'digit-sum-add',
    difficulty: 'hard',
    formula: `aₙ₊₁ = aₙ + digitSum(aₙ)`,
    explanation: `Each term is the previous term plus the sum of its digits.`,
    terms,
  };
};

// H19: triangular numbers + offset
const triangularOffset: PatternGenerator = (rng, length) => {
  const c = rng.int(1, 5) * (rng.bool() ? 1 : -1);
  const startN = rng.int(1, 3);
  const terms = Array.from({ length }, (_, i) => {
    const n = startN + i;
    return (n * (n + 1)) / 2 + c;
  });
  return {
    kind: 'triangular-offset',
    difficulty: 'hard',
    formula: `aₙ = n(n+1)/2 ${c >= 0 ? '+' : '−'} ${Math.abs(c)}`,
    explanation: `Triangular numbers shifted by ${c >= 0 ? '+' : '−'}${Math.abs(c)} (starting at n = ${startN}).`,
    terms,
  };
};

// H20: deceptive start — looks arithmetic but turns into Fibonacci-like after term 3
const deceptiveStart: PatternGenerator = (rng, length) => {
  const a = rng.int(2, 4);
  const b = rng.int(a + 2, a + 6);
  const c = rng.int(b + 1, b + 4);
  const terms: number[] = [a, b, c];
  for (let i = 3; i < length; i++) terms.push(terms[i - 1]! + terms[i - 2]!);
  return {
    kind: 'deceptive-start',
    difficulty: 'hard',
    formula: `aₙ = aₙ₋₁ + aₙ₋₂ for n ≥ 4`,
    explanation: `The first three terms look like a near-arithmetic run; from the 4th term onward each term is the sum of the previous two.`,
    terms,
  };
};

// H24: aₙ₊₁ = (aₙ + k) × m
const chainedTwoOp: PatternGenerator = (rng, length) => {
  const k = rng.int(1, 5);
  const m = rng.pick([2, 3] as const);
  const start = rng.int(1, 4);
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) terms.push((terms[i - 1]! + k) * m);
  return {
    kind: 'chained-two-op',
    difficulty: 'hard',
    formula: `aₙ₊₁ = (aₙ + ${k}) · ${m}`,
    explanation: `Each step: add ${k}, then multiply by ${m}.`,
    terms,
  };
};

// H25: factorials (n!), but tier hard because growth is sharp
const factorial: PatternGenerator = (_rng, length) => {
  const maxLen = Math.min(length, 8);
  const terms: number[] = [];
  let v = 1;
  for (let i = 1; i <= maxLen; i++) {
    v *= i;
    terms.push(v);
  }
  while (terms.length < length) {
    const n = terms.length + 1;
    terms.push(terms[terms.length - 1]! * n);
  }
  return {
    kind: 'factorial',
    difficulty: 'hard',
    formula: `aₙ = n!`,
    explanation: `Each term is the factorial of its position: 1!, 2!, 3!, 4!, …`,
    terms,
  };
};

export const HARD_GENERATORS: PatternGenerator[] = [
  secondDiffArith,
  n2MinusK,
  n3MinusK,
  quadN2PlusN,
  quadraticGeneral,
  lucas,
  pell,
  recurrenceWithPosition,
  pow2MinusN,
  pow2PlusN,
  altSignSquares,
  digitSumAdd,
  triangularOffset,
  deceptiveStart,
  chainedTwoOp,
  factorial,
];
