import type { SeriesPattern } from '../../types';
import type { PatternGenerator } from './easy';

// M1: Δ increases by 1 each step (a(n+1) = a(n) + n)
const arithGapGrows: PatternGenerator = (rng, length) => {
  const start = rng.int(1, 8);
  const startGap = rng.int(1, 4);
  const terms: number[] = [start];
  let gap = startGap;
  for (let i = 1; i < length; i++) {
    terms.push(terms[i - 1]! + gap);
    gap += 1;
  }
  return {
    kind: 'arith-gap-grows',
    difficulty: 'medium',
    formula: `gap grows by 1 each step (starting at +${startGap})`,
    explanation: `The gap between consecutive terms grows by 1 each step: +${startGap}, +${startGap + 1}, +${startGap + 2}, …`,
    terms,
  };
};

// M3: ratio grows by 1 (×2, ×3, ×4, …) — produces factorial-like
const geoFactorGrows: PatternGenerator = (_rng, length) => {
  const terms: number[] = [1];
  let f = 2;
  for (let i = 1; i < length; i++) {
    terms.push(terms[i - 1]! * f);
    f += 1;
  }
  return {
    kind: 'geo-factor-grows',
    difficulty: 'medium',
    formula: `aₙ₊₁ = aₙ · n`,
    explanation: `Each factor grows by 1: ×2, ×3, ×4, ×5, … (these are factorials).`,
    terms,
  };
};

// M4: add successive odd numbers (1, 3, 5, 7, 9, …)
const oddStepAdd: PatternGenerator = (rng, length) => {
  const start = rng.int(1, 10);
  const terms: number[] = [start];
  let odd = 1;
  for (let i = 1; i < length; i++) {
    terms.push(terms[i - 1]! + odd);
    odd += 2;
  }
  return {
    kind: 'odd-step-add',
    difficulty: 'medium',
    formula: `aₙ₊₁ = aₙ + (2n − 1)`,
    explanation: `Add successive odd numbers: +1, +3, +5, +7, +9, …`,
    terms,
  };
};

// M5: second difference is a constant (quadratic with step 2k)
const secondDiffConst: PatternGenerator = (rng, length) => {
  const start = rng.int(1, 8);
  const startGap = rng.int(2, 5);
  const secondDiff = rng.pick([2, 3, 4] as const);
  const terms: number[] = [start];
  let gap = startGap;
  for (let i = 1; i < length; i++) {
    terms.push(terms[i - 1]! + gap);
    gap += secondDiff;
  }
  return {
    kind: 'second-diff-const',
    difficulty: 'medium',
    formula: `Δ² = ${secondDiff}`,
    explanation: `The differences between terms themselves grow by ${secondDiff} each step.`,
    terms,
  };
};

// M6: squares
const squares: PatternGenerator = (rng, length) => {
  const startN = rng.int(1, 4);
  const terms = Array.from({ length }, (_, i) => (startN + i) ** 2);
  return {
    kind: 'squares',
    difficulty: 'medium',
    formula: `aₙ = (n + ${startN - 1})²`,
    explanation: `Square numbers starting from ${startN}²: ${terms.slice(0, 3).join(', ')}, …`,
    terms,
  };
};

// M7: cubes
const cubes: PatternGenerator = (rng, length) => {
  const startN = rng.int(1, 3);
  const maxLen = Math.min(length, 6);
  const terms = Array.from({ length: maxLen }, (_, i) => (startN + i) ** 3);
  while (terms.length < length) terms.push((startN + terms.length) ** 3);
  return {
    kind: 'cubes',
    difficulty: 'medium',
    formula: `aₙ = n³`,
    explanation: `Cube numbers starting from ${startN}³: ${terms.slice(0, 3).join(', ')}, …`,
    terms,
  };
};

// M8: squares ± constant offset
const squaresOffset: PatternGenerator = (rng, length) => {
  const c = rng.int(1, 5) * (rng.bool() ? 1 : -1);
  const startN = rng.int(1, 4);
  const terms = Array.from({ length }, (_, i) => (startN + i) ** 2 + c);
  return {
    kind: 'squares-offset',
    difficulty: 'medium',
    formula: `aₙ = n² ${c >= 0 ? '+' : '−'} ${Math.abs(c)}`,
    explanation: `Each term is n squared ${c >= 0 ? 'plus' : 'minus'} ${Math.abs(c)} (starting at n = ${startN}).`,
    terms,
  };
};

// M9: Fibonacci-like
const fibonacci: PatternGenerator = (rng, length) => {
  const a = rng.int(1, 4);
  const b = rng.int(1, 5);
  const terms: number[] = [a, b];
  for (let i = 2; i < length; i++) terms.push(terms[i - 1]! + terms[i - 2]!);
  return {
    kind: 'fibonacci',
    difficulty: 'medium',
    formula: `aₙ = aₙ₋₁ + aₙ₋₂`,
    explanation: `Each term is the sum of the previous two (Fibonacci-style, seeded with ${a} and ${b}).`,
    terms,
  };
};

// M10: triangular numbers
const triangular: PatternGenerator = (rng, length) => {
  const startN = rng.int(1, 4);
  const terms = Array.from({ length }, (_, i) => {
    const n = startN + i;
    return (n * (n + 1)) / 2;
  });
  return {
    kind: 'triangular',
    difficulty: 'medium',
    formula: `aₙ = n(n+1)/2`,
    explanation: `Triangular numbers: 1, 1+2, 1+2+3, 1+2+3+4, … (starting at n = ${startN}).`,
    terms,
  };
};

// M11: aₙ₊₁ = c·aₙ + d
const linearRecurrence: PatternGenerator = (rng, length) => {
  const c = rng.pick([2, 3] as const);
  const d = rng.int(1, 4);
  const a0 = rng.int(1, 3);
  const terms: number[] = [a0];
  for (let i = 1; i < length; i++) terms.push(c * terms[i - 1]! + d);
  return {
    kind: 'linear-recurrence',
    difficulty: 'medium',
    formula: `aₙ₊₁ = ${c}·aₙ + ${d}`,
    explanation: `Each term is ${c === 2 ? 'double' : 'triple'} the previous term plus ${d}.`,
    terms,
  };
};

// M12: alternating two operations (+k, ×m, +k, ×m, …)
const alternatingOps: PatternGenerator = (rng, length) => {
  const k = rng.int(2, 6);
  const m = rng.pick([2, 3] as const);
  const start = rng.int(1, 5);
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) {
    if (i % 2 === 1) terms.push(terms[i - 1]! + k);
    else terms.push(terms[i - 1]! * m);
  }
  return {
    kind: 'alternating-ops',
    difficulty: 'medium',
    formula: `alternate: +${k}, ×${m}, +${k}, ×${m}, …`,
    explanation: `The operation alternates: add ${k}, then multiply by ${m}, then add ${k}, then multiply by ${m}…`,
    terms,
  };
};

// M13: two interleaved sequences (odd positions one rule, even positions another)
const interleaved2: PatternGenerator = (rng, length) => {
  const a0 = rng.int(1, 6);
  const aStep = rng.int(2, 5);
  const b0 = rng.int(5, 15);
  const bStep = rng.int(3, 8);
  const terms: number[] = [];
  let aVal = a0;
  let bVal = b0;
  for (let i = 0; i < length; i++) {
    if (i % 2 === 0) {
      terms.push(aVal);
      aVal += aStep;
    } else {
      terms.push(bVal);
      bVal += bStep;
    }
  }
  return {
    kind: 'interleaved-2',
    difficulty: 'medium',
    formula: `two interleaved arithmetic sequences`,
    explanation: `Two sequences interleaved: odd positions are ${a0}, ${a0 + aStep}, ${a0 + 2 * aStep}, … (step +${aStep}); even positions are ${b0}, ${b0 + bStep}, ${b0 + 2 * bStep}, … (step +${bStep}).`,
    terms,
  };
};

// M14: prime numbers (first n primes from some offset)
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71];
const primes: PatternGenerator = (rng, length) => {
  const maxOffset = Math.max(0, PRIMES.length - length);
  const offset = rng.int(0, maxOffset + 1);
  const terms = PRIMES.slice(offset, offset + length);
  return {
    kind: 'primes',
    difficulty: 'medium',
    formula: `consecutive prime numbers`,
    explanation: `Consecutive prime numbers starting from ${terms[0]}.`,
    terms,
  };
};

// M15: gap doubles each step
const gapDoubles: PatternGenerator = (rng, length) => {
  const start = rng.int(1, 6);
  const startGap = rng.pick([1, 2] as const);
  const terms: number[] = [start];
  let gap = startGap;
  for (let i = 1; i < length; i++) {
    terms.push(terms[i - 1]! + gap);
    gap *= 2;
  }
  return {
    kind: 'gap-doubles',
    difficulty: 'medium',
    formula: `gap doubles each step`,
    explanation: `The gap between consecutive terms doubles each step: +${startGap}, +${startGap * 2}, +${startGap * 4}, +${startGap * 8}, …`,
    terms,
  };
};

// M16: pair-skip — pairs of (k, 2k) at each position
const pairSkip: PatternGenerator = (rng, length) => {
  const start = rng.int(1, 5);
  const factor = rng.pick([2, 3] as const);
  const terms: number[] = [];
  for (let i = 0; i < length; i++) {
    const pairIdx = Math.floor(i / 2);
    const k = start + pairIdx;
    terms.push(i % 2 === 0 ? k : k * factor);
  }
  return {
    kind: 'pair-skip',
    difficulty: 'medium',
    formula: `pairs (k, ${factor}k) with k incrementing`,
    explanation: `The sequence is in pairs: each pair is (k, ${factor}·k), with k incrementing by 1 each pair.`,
    terms,
  };
};

// M-factorial-by-position: same as M2 — n!, but viewed as aₙ₊₁ = aₙ · (n+1)
const factorialByPosition: PatternGenerator = (_rng, length) => {
  const maxLen = Math.min(length, 7);
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
    kind: 'factorial-by-position',
    difficulty: 'medium',
    formula: `aₙ = n!`,
    explanation: `Each term is the factorial of its position: 1!, 2!, 3!, 4!, …`,
    terms,
  };
};

export const MEDIUM_GENERATORS: PatternGenerator[] = [
  arithGapGrows,
  geoFactorGrows,
  oddStepAdd,
  secondDiffConst,
  squares,
  cubes,
  squaresOffset,
  fibonacci,
  triangular,
  linearRecurrence,
  alternatingOps,
  interleaved2,
  primes,
  gapDoubles,
  pairSkip,
  factorialByPosition,
];

// Re-export the SeriesPattern type for downstream tests
export type { SeriesPattern };
