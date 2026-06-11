import type { SeriesPattern } from '../../types';
import type { PatternGenerator } from './easy';
import { roundDec } from './easy';

// M1: Δ increases by 1 each step (a(n+1) = a(n) + n)
const arithGapGrows: PatternGenerator = (rng, length) => {
  const start = rng.int(1, 15);
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
export const oddStepAdd: PatternGenerator = (rng, length) => {
  const start = rng.int(1, 20);
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
export const fibonacci: PatternGenerator = (rng, length) => {
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
export const triangular: PatternGenerator = (rng, length) => {
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

// M17: n² with alternating ±k sign offset (n²+1, n²−1, n²+1, …)
const squaresAltSign: PatternGenerator = (rng, length) => {
  const k = rng.int(1, 4);
  const startN = rng.int(3, 6);
  const startSign = rng.bool() ? 1 : -1;
  const terms = Array.from({ length }, (_, i) => {
    const n = startN + i;
    const sign = i % 2 === 0 ? startSign : -startSign;
    return n * n + sign * k;
  });
  const firstWord = startSign > 0 ? '+' : '−';
  const secondWord = startSign > 0 ? '−' : '+';
  return {
    kind: 'squares-alt-sign',
    difficulty: 'medium',
    formula: `aₙ = n² ± ${k}`,
    explanation: `Square numbers with alternating offset: n² ${firstWord} ${k}, n² ${secondWord} ${k}, repeating (starting at n = ${startN}).`,
    terms,
  };
};

// M18: add a value that halves each step
const addHalving: PatternGenerator = (rng, length) => {
  const factor = Math.pow(2, length - 2);
  const baseGap = rng.int(8, 30);
  const startGap = baseGap * factor;
  const start = rng.int(10, 40);
  let gap = startGap;
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) {
    terms.push(terms[i - 1]! + gap);
    gap = gap / 2;
  }
  return {
    kind: 'add-halving',
    difficulty: 'medium',
    formula: 'gap halves each step',
    explanation: `Add a value that halves each step: +${startGap}, +${startGap / 2}, +${startGap / 4}, +${startGap / 8}, …`,
    terms,
  };
};

// M19: gaps are perfect squares (+1², +2², +3², +4², …)
const gapsAreSquares: PatternGenerator = (rng, length) => {
  const start = rng.int(3, 12);
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) {
    terms.push(terms[i - 1]! + i * i);
  }
  return {
    kind: 'gaps-are-squares',
    difficulty: 'medium',
    formula: 'gaps are 1², 2², 3², …',
    explanation: 'The differences between consecutive terms are perfect squares: +1, +4, +9, +16, +25, +36, …',
    terms,
  };
};

// M20: gaps are descending squares (+k², +(k−1)², +(k−2)², …)
const gapsAreDescSquares: PatternGenerator = (rng, length) => {
  const startGapN = Math.max(length + 2, rng.int(8, 12));
  const start = rng.int(10, 30);
  let gapN = startGapN;
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) {
    terms.push(terms[i - 1]! + gapN * gapN);
    gapN -= 1;
  }
  return {
    kind: 'gaps-are-desc-squares',
    difficulty: 'medium',
    formula: 'gaps are k², (k−1)², (k−2)², …',
    explanation: `The gaps between terms are descending squares: +${startGapN}², +${startGapN - 1}², +${startGapN - 2}², +${startGapN - 3}², …`,
    terms,
  };
};

// M22: gaps are clean multiples of a constant K (+K, +2K, +3K, +4K, …)
const gapsAreMultiplesOfK: PatternGenerator = (rng, length) => {
  const K = rng.pick([7, 11, 13, 17, 19, 23, 50, 100, 250, 713] as const);
  const start = rng.int(50, 800);
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) {
    terms.push(terms[i - 1]! + K * i);
  }
  return {
    kind: 'gaps-are-multiples-of-k',
    difficulty: 'medium',
    formula: `gaps are ${K}·1, ${K}·2, ${K}·3, …`,
    explanation: `Each gap is a clean multiple of ${K}: +${K}, +${2 * K}, +${3 * K}, +${4 * K}, +${5 * K}, …`,
    terms,
  };
};

// M23: aₙ₊₁ = aₙ · (n+1) + (n+1) — multiply by position, then add position
const mulByNAddN: PatternGenerator = (rng, length) => {
  const start = rng.int(5, 20);
  let v = start;
  const terms: number[] = [v];
  for (let i = 1; i < length; i++) {
    const n = i + 1;
    v = v * n + n;
    terms.push(v);
  }
  return {
    kind: 'mul-by-n-add-n',
    difficulty: 'medium',
    formula: 'aₙ₊₁ = aₙ·(n+1) + (n+1)',
    explanation: 'Each step: multiply the previous term by the next position number, then add that same position number.',
    terms,
  };
};

// M24: aₙ₊₁ = aₙ · n − k (multiplier grows, fixed subtractor)
const mulByNSubK: PatternGenerator = (rng, length) => {
  const k = rng.int(2, 8);
  const start = rng.int(8, 25);
  let v = start;
  const terms: number[] = [v];
  for (let i = 1; i < length; i++) {
    v = v * i - k;
    terms.push(v);
  }
  return {
    kind: 'mul-by-n-sub-k',
    difficulty: 'medium',
    formula: `aₙ₊₁ = aₙ·n − ${k}`,
    explanation: `Each step: multiply by the next position number, then subtract ${k}.`,
    terms,
  };
};

// M25: aₙ = n³ + n
const nCubedPlusN: PatternGenerator = (rng, length) => {
  const startN = rng.int(1, 3);
  const maxLen = Math.min(length, 7);
  const terms: number[] = [];
  for (let i = 0; i < maxLen; i++) {
    const n = startN + i;
    terms.push(n * n * n + n);
  }
  while (terms.length < length) {
    const n = startN + terms.length;
    terms.push(n * n * n + n);
  }
  return {
    kind: 'n-cubed-plus-n',
    difficulty: 'medium',
    formula: 'aₙ = n³ + n',
    explanation: `Each term is n cubed plus n (starting at n = ${startN}).`,
    terms,
  };
};

// M26: aₙ = n² − (n − 1) — quadratic minus previous-position offset
const n2MinusPrevPos: PatternGenerator = (rng, length) => {
  const startN = rng.int(1, 4);
  const terms = Array.from({ length }, (_, i) => {
    const n = startN + i;
    return n * n - (n - 1);
  });
  return {
    kind: 'n2-minus-prev-pos',
    difficulty: 'medium',
    formula: 'aₙ = n² − (n−1)',
    explanation: `Each term is n² minus (n−1), where n is the position (starting at ${startN}).`,
    terms,
  };
};

// M27: add consecutive primes as the running gap
const PRIMES_GAP = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31];
const addPrimes: PatternGenerator = (rng, length) => {
  const start = rng.int(1, 10);
  const offset = rng.int(0, Math.max(1, PRIMES_GAP.length - length));
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) {
    const p = PRIMES_GAP[offset + i - 1] ?? PRIMES_GAP[PRIMES_GAP.length - 1]!;
    terms.push(terms[i - 1]! + p);
  }
  const head = PRIMES_GAP.slice(offset, offset + Math.min(5, length - 1)).map((p) => `+${p}`).join(', ');
  return {
    kind: 'add-primes',
    difficulty: 'medium',
    formula: 'aₙ₊₁ = aₙ + p(n)',
    explanation: `Each step adds the next consecutive prime number (${head}, …).`,
    terms,
  };
};

// M28: multiply by a growing fraction n/k (×1/k, ×2/k, ×3/k, …)
const mulGrowingFraction: PatternGenerator = (rng, length) => {
  const k = rng.pick([3, 4, 5] as const);
  const start = Math.pow(k, 2) * rng.int(8, 25);
  let v = start;
  const terms: number[] = [v];
  for (let i = 1; i < length; i++) {
    v = (v * i) / k;
    terms.push(roundDec(v, 6));
  }
  return {
    kind: 'mul-growing-fraction',
    difficulty: 'medium',
    formula: `aₙ₊₁ = aₙ × (n/${k})`,
    explanation: `Multiply by a growing fraction with denominator ${k}: ×1/${k}, ×2/${k}, ×3/${k}, ×4/${k}, …`,
    terms,
  };
};

// M29: add (constant K × consecutive odd numbers) — +K×1, +K×3, +K×5, …
const addKTimesOdd: PatternGenerator = (rng, length) => {
  const K = rng.pick([3, 5, 7, 9, 11] as const);
  const start = rng.int(10, 50);
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) {
    const odd = 2 * i - 1;
    terms.push(terms[i - 1]! + K * odd);
  }
  return {
    kind: 'add-k-times-odd',
    difficulty: 'medium',
    formula: `aₙ₊₁ = aₙ + ${K}·(2n−1)`,
    explanation: `Each step adds ${K} times the next odd number: +${K}·1, +${K}·3, +${K}·5, +${K}·7, +${K}·9, …`,
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
  squaresAltSign,
  addHalving,
  gapsAreSquares,
  gapsAreDescSquares,
  gapsAreMultiplesOfK,
  mulByNAddN,
  mulByNSubK,
  nCubedPlusN,
  n2MinusPrevPos,
  addPrimes,
  mulGrowingFraction,
  addKTimesOdd,
];

// Re-export the SeriesPattern type for downstream tests
export type { SeriesPattern };
