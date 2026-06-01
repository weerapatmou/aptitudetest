import type { PatternGenerator } from './easy';
import { roundDec } from './easy';

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
export const lucas: PatternGenerator = (_rng, length) => {
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

// H26: half-step growing multiplier (×0.5, ×1.5, ×2.5, ×3.5, …)
const halfStepMultiplier: PatternGenerator = (rng, length) => {
  const start = rng.int(20, 80) * 2;
  let v = start;
  const terms: number[] = [v];
  let mul = 0.5;
  for (let i = 1; i < length; i++) {
    v = v * mul;
    terms.push(roundDec(v, 4));
    mul += 1;
  }
  return {
    kind: 'half-step-multiplier',
    difficulty: 'hard',
    formula: 'aₙ₊₁ = aₙ × (n − 0.5)',
    explanation: 'Each step multiplies by a half-step factor that grows by 1 each time: ×0.5, ×1.5, ×2.5, ×3.5, ×4.5, …',
    terms,
  };
};

// H27: gaps are (n³ − 1) — +7, +26, +63, +124, +215, …
const addCubeMinus1: PatternGenerator = (rng, length) => {
  const start = rng.int(3, 15);
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) {
    const n = i + 1;
    terms.push(terms[i - 1]! + (n * n * n - 1));
  }
  return {
    kind: 'add-cube-minus-1',
    difficulty: 'hard',
    formula: 'aₙ₊₁ = aₙ + (n³ − 1)',
    explanation: 'Each gap is one less than a perfect cube: +(2³−1)=+7, +(3³−1)=+26, +(4³−1)=+63, +(5³−1)=+124, +(6³−1)=+215, …',
    terms,
  };
};

// H28: aₙ₊₁ = aₙ × n − n (multiply by position, subtract position)
const mulByNSubN: PatternGenerator = (rng, length) => {
  const start = rng.int(10, 25);
  const maxLen = Math.min(length, 7);
  let v = start;
  const terms: number[] = [v];
  for (let i = 1; i < maxLen; i++) {
    v = v * i - i;
    terms.push(v);
  }
  while (terms.length < length) {
    const i = terms.length;
    terms.push(terms[i - 1]! * i - i);
  }
  return {
    kind: 'mul-by-n-sub-n',
    difficulty: 'hard',
    formula: 'aₙ₊₁ = aₙ·n − n',
    explanation: 'Multiply by the position, then subtract that same position: ×1−1, ×2−2, ×3−3, …',
    terms,
  };
};

// H29: descending multiplier then −1 (×k, ×(k−1), ×(k−2), … each step then subtract 1)
const mulDescSub1: PatternGenerator = (rng, length) => {
  const startMul = Math.max(length + 1, 7);
  const start = rng.int(5, 15);
  let v = start;
  const terms: number[] = [v];
  for (let i = 1; i < length; i++) {
    const mul = startMul - (i - 1);
    if (mul < 2) {
      terms.push(terms[i - 1]! * 2 - 1);
    } else {
      v = v * mul - 1;
      terms.push(v);
    }
  }
  return {
    kind: 'mul-desc-sub-1',
    difficulty: 'hard',
    formula: `aₙ₊₁ = aₙ × (descending) − 1`,
    explanation: `Multiply by a descending integer (start ×${startMul}, then ×${startMul - 1}, ×${startMul - 2}, …), then subtract 1 each step.`,
    terms,
  };
};

// H30: alternate ×2+1 and ×1+2 (two operations swapping each step)
const altMulOp: PatternGenerator = (rng, length) => {
  const start = rng.int(5, 30);
  let v = start;
  const terms: number[] = [v];
  for (let i = 1; i < length; i++) {
    if (i % 2 === 1) v = v * 2 + 1;
    else v = v * 1 + 2;
    terms.push(v);
  }
  return {
    kind: 'alt-mul-op',
    difficulty: 'hard',
    formula: 'alternate ×2+1 and ×1+2',
    explanation: 'Operations alternate each step: first ×2+1, then +2 (i.e., ×1+2), then ×2+1 again, repeating.',
    terms,
  };
};

// H31: alternating sign, magnitude shrinks by 4 each step
const altSignShrinking: PatternGenerator = (rng, length) => {
  const startMag = Math.max(2, (length - 1) * 4 - 2);
  const start = rng.int(50, 100);
  const terms: number[] = [start];
  let mag = startMag;
  let sign = -1;
  for (let i = 1; i < length; i++) {
    terms.push(terms[i - 1]! + sign * mag);
    sign = -sign;
    mag -= 4;
  }
  return {
    kind: 'alt-sign-shrinking',
    difficulty: 'hard',
    formula: 'alternating ±, magnitude decreases by 4',
    explanation: `Each step alternates sign and the magnitude decreases by 4: −${startMag}, +${startMag - 4}, −${startMag - 8}, +${startMag - 12}, …`,
    terms,
  };
};

// H32: gaps are n² + n³
const gapsAreSquarePlusCube: PatternGenerator = (rng, length) => {
  const start = rng.int(2, 8);
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) {
    const n = i;
    terms.push(terms[i - 1]! + n * n + n * n * n);
  }
  return {
    kind: 'gaps-are-square-plus-cube',
    difficulty: 'hard',
    formula: 'gaps are n² + n³',
    explanation: 'Each gap equals n² + n³ with n growing: +(1+1)=+2, +(4+8)=+12, +(9+27)=+36, +(16+64)=+80, +(25+125)=+150, …',
    terms,
  };
};

// H33: aₙ₊₁ = aₙ × n + n² (multiplier and squared addend grow together)
const mulByNAddNSquared: PatternGenerator = (rng, length) => {
  const start = rng.int(3, 12);
  let v = start;
  const terms: number[] = [v];
  for (let i = 1; i < length; i++) {
    const n = i;
    v = v * n + n * n;
    terms.push(v);
  }
  return {
    kind: 'mul-by-n-add-n-squared',
    difficulty: 'hard',
    formula: 'aₙ₊₁ = aₙ·n + n²',
    explanation: 'Each step: multiply by position, then add position squared (×1+1², ×2+2², ×3+3², ×4+4², …).',
    terms,
  };
};

// H34: descending dual (multiplier descends by 2 AND subtractor descends by 2)
const descendingDualMulSub: PatternGenerator = (rng, length) => {
  const startMul = 2 * (length - 1) + 1;
  const startSub = 2 * (length - 1) + 2;
  const start = rng.int(3, 8);
  let v = start;
  const terms: number[] = [v];
  let mul = startMul;
  let sub = startSub;
  for (let i = 1; i < length; i++) {
    v = v * mul - sub;
    terms.push(v);
    mul -= 2;
    sub -= 2;
  }
  return {
    kind: 'descending-dual-mul-sub',
    difficulty: 'hard',
    formula: 'aₙ₊₁ = aₙ·(descending) − (descending)',
    explanation: `Both the multiplier (${startMul}, ${startMul - 2}, ${startMul - 4}, …) and the subtractor (${startSub}, ${startSub - 2}, ${startSub - 4}, …) descend by 2 each step.`,
    terms,
  };
};

// H35: second-difference is arithmetic, descending (Δ² decreases by 2 each step)
const secondDiffArithDesc: PatternGenerator = (rng, length) => {
  const start = rng.int(400, 700);
  const startGap = rng.int(1, 3);
  let gap = startGap;
  let secondGap = -2;
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) {
    terms.push(terms[i - 1]! + gap);
    gap += secondGap;
    secondGap -= 2;
  }
  return {
    kind: 'second-diff-arith-desc',
    difficulty: 'hard',
    formula: 'Δ² descends by 2',
    explanation: 'The gaps between consecutive terms change by an amount that itself decreases by 2 each step (second-difference is arithmetic with negative step).',
    terms,
  };
};

// H36: aₙ₊₁ = 2·aₙ + (decreasing constant starting at +1)
const mul2AddDecreasing: PatternGenerator = (rng, length) => {
  const start = rng.int(1, 6);
  let v = start;
  const terms: number[] = [v];
  let add = 1;
  for (let i = 1; i < length; i++) {
    v = v * 2 + add;
    terms.push(v);
    add -= 1;
  }
  return {
    kind: 'mul2-add-decreasing',
    difficulty: 'hard',
    formula: 'aₙ₊₁ = 2aₙ + (decreasing constant)',
    explanation: 'Each step: double the previous term, then add a constant that decreases by 1 (+1, 0, −1, −2, −3, …).',
    terms,
  };
};

// H37: gaps are descending (n² − 1)
const gapsDescN2Minus1: PatternGenerator = (rng, length) => {
  const startN = Math.max(length + 1, 7);
  const start = rng.int(3, 15);
  const terms: number[] = [start];
  let n = startN;
  for (let i = 1; i < length; i++) {
    if (n < 2) {
      terms.push(terms[i - 1]! + 1);
    } else {
      terms.push(terms[i - 1]! + (n * n - 1));
      n -= 1;
    }
  }
  return {
    kind: 'gaps-desc-n2-minus-1',
    difficulty: 'hard',
    formula: 'gaps are descending (n²−1)',
    explanation: `The gaps between terms are (n²−1) with n descending: +(${startN}²−1)=+${startN * startN - 1}, +(${startN - 1}²−1)=+${(startN - 1) * (startN - 1) - 1}, +(${startN - 2}²−1)=+${(startN - 2) * (startN - 2) - 1}, …`,
    terms,
  };
};

// H38: squares of consecutive primes. Kept to small primes so the terms stay
// recognizable backwards in the head (19² = 361 is the largest); larger prime
// squares like 23² = 529 are too hard to spot from the number alone.
const SMALL_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19];
const primeSquares: PatternGenerator = (rng, length) => {
  const maxOffset = Math.max(0, SMALL_PRIMES.length - length);
  const offset = rng.int(0, maxOffset + 1);
  const used = SMALL_PRIMES.slice(offset, offset + length);
  const terms = used.map((p) => p * p);
  return {
    kind: 'prime-squares',
    difficulty: 'hard',
    formula: 'aₙ = p² (p prime)',
    explanation: `Squares of consecutive primes (starting at ${used[0]}²): ${used.slice(0, 4).map((p) => `${p}²`).join(', ')}, …`,
    terms,
  };
};

// H39: chained ÷K then subtract a decreasing constant
const divThenSubDecreasing: PatternGenerator = (rng, length) => {
  const divisor = 5;
  const lastTerm = rng.int(8, 25);
  const reverseTerms: number[] = [lastTerm];
  let k = 2;
  for (let i = 1; i < length; i++) {
    const prev = (reverseTerms[i - 1]! + k) * divisor;
    reverseTerms.push(prev);
    k += 1;
  }
  const terms = reverseTerms.reverse();
  return {
    kind: 'div-then-sub-decreasing',
    difficulty: 'hard',
    formula: `aₙ₊₁ = aₙ/${divisor} − (decreasing k)`,
    explanation: `Each step: divide by ${divisor}, then subtract a constant that decreases by 1 each step (−${length}, −${length - 1}, −${length - 2}, …).`,
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
  halfStepMultiplier,
  addCubeMinus1,
  mulByNSubN,
  mulDescSub1,
  altMulOp,
  altSignShrinking,
  gapsAreSquarePlusCube,
  mulByNAddNSquared,
  descendingDualMulSub,
  secondDiffArithDesc,
  mul2AddDecreasing,
  gapsDescN2Minus1,
  primeSquares,
  divThenSubDecreasing,
];
