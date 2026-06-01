import type { PatternGenerator } from './easy';
import { roundDec } from './easy';

// X1: aₙ = n⁴ − k
const n4MinusK: PatternGenerator = (rng, length) => {
  const k = rng.int(2, 6);
  const startN = rng.int(1, 2);
  const maxLen = Math.min(length, 5);
  const terms = Array.from({ length: maxLen }, (_, i) => (startN + i) ** 4 - k);
  while (terms.length < length) terms.push((startN + terms.length) ** 4 - k);
  return {
    kind: 'n4-minus-k',
    difficulty: 'expert',
    formula: `aₙ = n⁴ − ${k}`,
    explanation: `Each term is n to the fourth power, minus ${k} (starting at n = ${startN}).`,
    terms,
  };
};

const fact = (n: number): number => {
  let v = 1;
  for (let i = 2; i <= n; i++) v *= i;
  return v;
};

// X2: aₙ = n! − k
const factorialOffset: PatternGenerator = (rng, length) => {
  const k = rng.int(1, 4);
  const maxLen = Math.min(length, 7);
  const terms = Array.from({ length: maxLen }, (_, i) => fact(i + 1) - k);
  while (terms.length < length) terms.push(fact(terms.length + 1) - k);
  return {
    kind: 'factorial-offset',
    difficulty: 'expert',
    formula: `aₙ = n! − ${k}`,
    explanation: `Each term is n factorial minus ${k}.`,
    terms,
  };
};

// X3: Catalan numbers Cₙ = (2n)! / (n!·(n+1)!)
const CATALAN = [1, 1, 2, 5, 14, 42, 132, 429, 1430, 4862, 16796];
const catalan: PatternGenerator = (_rng, length) => {
  const maxLen = Math.min(length, CATALAN.length);
  const terms = CATALAN.slice(0, maxLen);
  while (terms.length < length) {
    // Extend via the standard recurrence Cₙ₊₁ = Σ Cᵢ·Cₙ₋ᵢ — but a simpler form:
    // Cₙ₊₁ = Cₙ · 2(2n+1) / (n+2)
    const n = terms.length;
    const prev = terms[n - 1]!;
    terms.push((prev * 2 * (2 * n - 1)) / (n + 1));
  }
  return {
    kind: 'catalan',
    difficulty: 'expert',
    formula: `Cₙ = (2n)! / (n!·(n+1)!)`,
    explanation: `Catalan numbers — Cₙ = (2n)! / (n!·(n+1)!), arising in counting balanced parenthesizations, binary trees, etc.`,
    terms,
  };
};

// X4: general cubic aₙ = a·n³ + b·n + c
const cubicGeneral: PatternGenerator = (rng, length) => {
  const a = 1;
  const b = rng.int(-3, 4);
  const c = rng.int(-3, 4);
  const startN = 1;
  const maxLen = Math.min(length, 6);
  const terms = Array.from({ length: maxLen }, (_, i) => {
    const n = startN + i;
    return a * n * n * n + b * n + c;
  });
  while (terms.length < length) {
    const n = startN + terms.length;
    terms.push(a * n * n * n + b * n + c);
  }
  const bSign = b >= 0 ? '+' : '−';
  const cSign = c >= 0 ? '+' : '−';
  return {
    kind: 'cubic-general',
    difficulty: 'expert',
    formula: `aₙ = n³ ${bSign} ${Math.abs(b)}n ${cSign} ${Math.abs(c)}`,
    explanation: `Cubic in position: each term equals n³ ${bSign} ${Math.abs(b)}n ${cSign} ${Math.abs(c)}.`,
    terms,
  };
};

// X5: aₙ₊₁ = aₙ · n + 1
const mulByPositionPlus1: PatternGenerator = (_rng, length) => {
  const terms: number[] = [1];
  for (let i = 1; i < length; i++) terms.push(terms[i - 1]! * (i + 1) + 1);
  return {
    kind: 'mul-by-position-plus-1',
    difficulty: 'expert',
    formula: `aₙ₊₁ = aₙ · n + 1`,
    explanation: `Each step: multiply the previous term by its position, then add 1.`,
    terms,
  };
};

// X6: three interleaved sequences (positions n mod 3)
const interleaved3: PatternGenerator = (rng, length) => {
  // Three rules: position 0 mod 3 → counting; 1 mod 3 → squares; 2 mod 3 → multiples of 10
  const startA = rng.int(1, 4);
  const startB = rng.int(2, 4);
  const stepC = rng.int(2, 4);
  let a = startA;
  let bIdx = startB;
  let c = stepC * 5;
  const terms: number[] = [];
  for (let i = 0; i < length; i++) {
    const which = i % 3;
    if (which === 0) {
      terms.push(a);
      a += 1;
    } else if (which === 1) {
      terms.push(bIdx * bIdx);
      bIdx += 1;
    } else {
      terms.push(c);
      c += stepC * 5;
    }
  }
  return {
    kind: 'interleaved-3',
    difficulty: 'expert',
    formula: `three rules interleaved at n mod 3`,
    explanation: `Three sequences interleaved: position 0 mod 3 counts up by 1, position 1 mod 3 produces perfect squares, position 2 mod 3 produces multiples of ${stepC * 5}.`,
    terms,
  };
};

// X7: aₙ = 2^(n²) — escalates fast; use very short sequences
const powOfSquare: PatternGenerator = (_rng, length) => {
  const maxLen = Math.min(length, 4);
  const terms = Array.from({ length: maxLen }, (_, i) => 2 ** ((i + 1) ** 2));
  while (terms.length < length) terms.push(2 ** ((terms.length + 1) ** 2));
  return {
    kind: 'pow-of-square',
    difficulty: 'expert',
    formula: `aₙ = 2^(n²)`,
    explanation: `Each term is 2 raised to the power of n squared — the exponent itself is quadratic.`,
    terms,
  };
};

// X10: aₙ = n² + 2ⁿ
const sumQuadExp: PatternGenerator = (_rng, length) => {
  const maxLen = Math.min(length, 8);
  const terms = Array.from({ length: maxLen }, (_, i) => {
    const n = i + 1;
    return n * n + 2 ** n;
  });
  while (terms.length < length) {
    const n = terms.length + 1;
    terms.push(n * n + 2 ** n);
  }
  return {
    kind: 'sum-quad-exp',
    difficulty: 'expert',
    formula: `aₙ = n² + 2ⁿ`,
    explanation: `Each term is the sum of two formulas: n squared plus 2 to the power n.`,
    terms,
  };
};

// X11: aₙ = (−1)ⁿ · n!
const altSignFactorial: PatternGenerator = (_rng, length) => {
  const maxLen = Math.min(length, 7);
  const terms: number[] = [];
  for (let i = 1; i <= maxLen; i++) {
    const f = fact(i);
    terms.push((i % 2 === 1 ? -1 : 1) * f);
  }
  while (terms.length < length) {
    const n = terms.length + 1;
    terms.push((n % 2 === 1 ? -1 : 1) * fact(n));
  }
  return {
    kind: 'alt-sign-factorial',
    difficulty: 'expert',
    formula: `aₙ = (−1)ⁿ · n!`,
    explanation: `Factorials with alternating signs (− for odd n, + for even n).`,
    terms,
  };
};

// X12: aₙ = nⁿ
const nToN: PatternGenerator = (_rng, length) => {
  const maxLen = Math.min(length, 5);
  const terms = Array.from({ length: maxLen }, (_, i) => (i + 1) ** (i + 1));
  while (terms.length < length) {
    const n = terms.length + 1;
    terms.push(n ** n);
  }
  return {
    kind: 'n-to-n',
    difficulty: 'expert',
    formula: `aₙ = nⁿ`,
    explanation: `Each term is n raised to its own power: 1¹, 2², 3³, 4⁴, …`,
    terms,
  };
};

// X13: aₙ = n · Fₙ (Fibonacci × position)
const fibTimesN: PatternGenerator = (_rng, length) => {
  const F: number[] = [1, 1];
  while (F.length < length + 2) F.push(F[F.length - 1]! + F[F.length - 2]!);
  const terms = Array.from({ length }, (_, i) => (i + 1) * F[i]!);
  return {
    kind: 'fib-times-n',
    difficulty: 'expert',
    formula: `aₙ = n · Fₙ`,
    explanation: `Each term is the Fibonacci number Fₙ multiplied by its position n.`,
    terms,
  };
};

// X14: Padovan — aₙ = aₙ₋₂ + aₙ₋₃, seeds 1, 1, 1
export const padovan: PatternGenerator = (_rng, length) => {
  const terms: number[] = [1, 1, 1];
  for (let i = 3; i < length; i++) terms.push(terms[i - 2]! + terms[i - 3]!);
  return {
    kind: 'padovan',
    difficulty: 'expert',
    formula: `aₙ = aₙ₋₂ + aₙ₋₃`,
    explanation: `Padovan sequence: each term is the sum of the term two-back and the term three-back (seeds 1, 1, 1).`,
    terms,
  };
};

// X16: third-difference pattern (Δ³ decrements by 1 each step)
const thirdDiffPattern: PatternGenerator = (rng, length) => {
  const start = rng.int(10, 25);
  const startGap = rng.int(5, 9);
  const startSecondGap = rng.int(10, 14);
  let gap = startGap;
  let secondGap = startSecondGap;
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) {
    terms.push(terms[i - 1]! + gap);
    gap += secondGap;
    secondGap -= 1;
  }
  return {
    kind: 'third-diff-pattern',
    difficulty: 'expert',
    formula: 'Δ³ = −1 (third-difference is constant)',
    explanation: 'The differences between consecutive terms keep growing, but the gaps between *those* differences themselves SHRINK by 1 each step — a third-order pattern.',
    terms,
  };
};

// X17: chained ÷2 then add a growing power of 2 (+2², +2³, +2⁴, +2⁵, …)
const div2AddPow2Growing: PatternGenerator = (rng, length) => {
  const start = Math.pow(2, length + 4) + rng.int(0, 50) * 2;
  let v = start;
  const terms: number[] = [v];
  for (let i = 1; i < length; i++) {
    const exp = i + 1;
    v = v / 2 + Math.pow(2, exp);
    terms.push(roundDec(v, 4));
  }
  return {
    kind: 'div2-add-pow2-growing',
    difficulty: 'expert',
    formula: 'aₙ₊₁ = aₙ/2 + 2ⁿ⁺¹',
    explanation: 'Each step: divide by 2, then add a growing power of 2 (+2², +2³, +2⁴, +2⁵, …).',
    terms,
  };
};

// X18: both multiplier AND addend grow in half-integer steps
const halfStepBoth: PatternGenerator = (rng, length) => {
  const start = rng.int(6, 12);
  let v = start;
  const terms: number[] = [v];
  let mul = 1.5;
  let add = 0.5;
  for (let i = 1; i < length; i++) {
    v = v * mul + add;
    terms.push(roundDec(v, 4));
    mul += 0.5;
    add += 0.5;
  }
  return {
    kind: 'half-step-both',
    difficulty: 'expert',
    formula: 'aₙ₊₁ = aₙ · (mul) + (add); both grow by 0.5',
    explanation: 'Each step uses ×1.5+0.5, then ×2+1, then ×2.5+1.5, then ×3+2, … — both the multiplier and the addend grow by 0.5 each step.',
    terms,
  };
};

// X19: aₙ₊₁ = aₙ·n + (alternating ±) n(n+1)
const mulByNAddNxNplus1: PatternGenerator = (rng, length) => {
  const start = rng.int(5, 12);
  let v = start;
  const terms: number[] = [v];
  for (let i = 1; i < length; i++) {
    const n = i;
    const sign = i % 2 === 1 ? 1 : -1;
    v = v * n + sign * n * (n + 1);
    terms.push(v);
  }
  return {
    kind: 'mul-by-n-add-n-x-n-plus-1',
    difficulty: 'expert',
    formula: 'aₙ₊₁ = aₙ·n ± n(n+1)',
    explanation: 'Multiply by position n, then add or subtract n·(n+1) with alternating sign (+, −, +, −, …).',
    terms,
  };
};

// X20: multiplier grows by 1 each step; addend alternates between +c and −d
const mulGrowingAltAdd: PatternGenerator = (rng, length) => {
  const start = rng.int(3, 8);
  const addEven = rng.int(3, 5);
  const subOdd = rng.int(2, 4);
  let v = start;
  const terms: number[] = [v];
  for (let i = 1; i < length; i++) {
    const mul = i + 1;
    const add = i % 2 === 1 ? addEven : -subOdd;
    v = v * mul + add;
    terms.push(v);
  }
  return {
    kind: 'mul-growing-alt-add',
    difficulty: 'expert',
    formula: 'aₙ₊₁ = aₙ · (n+1) + alternating const',
    explanation: `Multiply by a growing position (×2, ×3, ×4, ×5, …) and alternately add ${addEven} and subtract ${subOdd}.`,
    terms,
  };
};

// X21: add a decreasing constant, then multiply by an incrementing position
const addDecMulInc: PatternGenerator = (rng, length) => {
  const initialAdd = Math.max(length + 1, rng.int(6, 9));
  const start = rng.int(2, 5);
  let v = start;
  const terms: number[] = [v];
  for (let i = 1; i < length; i++) {
    const add = initialAdd - (i - 1);
    v = (v + add) * i;
    terms.push(v);
  }
  return {
    kind: 'add-dec-mul-inc',
    difficulty: 'expert',
    formula: 'aₙ₊₁ = (aₙ + (decreasing k)) · n',
    explanation: `Each step: add a constant that decreases by 1 (starts at +${initialAdd}), then multiply by an increasing position (×1, ×2, ×3, ×4, …).`,
    terms,
  };
};

// X22: aₙ₊₁ = aₙ·n + (n+1)² — multiplier grows, squared addend grows one ahead
const mulNAddNextSquare: PatternGenerator = (rng, length) => {
  const start = rng.int(20, 50);
  let v = start;
  const terms: number[] = [v];
  for (let i = 1; i < length; i++) {
    const n = i;
    v = v * n + Math.pow(n + 1, 2);
    terms.push(v);
  }
  return {
    kind: 'mul-n-add-next-square',
    difficulty: 'expert',
    formula: 'aₙ₊₁ = aₙ·n + (n+1)²',
    explanation: 'Each step: multiply by position n, then add (n+1) squared (×1+2², ×2+3², ×3+4², ×4+5², …).',
    terms,
  };
};

// X23: aₙ₊₁ = aₙ · (2n) − (2n) — multiplier is the next even number, subtract the same
const mulBy2nSub2n: PatternGenerator = (rng, length) => {
  const start = rng.int(3, 10);
  let v = start;
  const terms: number[] = [v];
  for (let i = 1; i < length; i++) {
    const k = 2 * i;
    v = v * k - k;
    terms.push(v);
  }
  return {
    kind: 'mul-by-2n-sub-2n',
    difficulty: 'expert',
    formula: 'aₙ₊₁ = aₙ · (2n) − (2n)',
    explanation: 'Each step: multiply by the next even number and subtract the same even number (×2−2, ×4−4, ×6−6, ×8−8, ×10−10, …).',
    terms,
  };
};

// X24: each term is the sum of all previous terms (seed twice)
const sumOfAllPrevious: PatternGenerator = (rng, length) => {
  const seed = rng.int(2, 6);
  const terms: number[] = [seed];
  for (let i = 1; i < length; i++) {
    const sum = terms.reduce((a, b) => a + b, 0);
    terms.push(sum);
  }
  return {
    kind: 'sum-of-all-previous',
    difficulty: 'expert',
    formula: 'aₙ = Σ aᵢ (i < n)',
    explanation: `Each term equals the sum of ALL previous terms. After the seed (${seed}), the sequence essentially doubles from one step to the next.`,
    terms,
  };
};

// X25: aₙ₊₁ = 3·aₙ − 6n — multiply by 3 then subtract a growing multiple of 6
const mul3SubGrowing: PatternGenerator = (rng, length) => {
  const start = rng.int(5, 12);
  let v = start;
  const terms: number[] = [v];
  for (let i = 1; i < length; i++) {
    v = v * 3 - 6 * i;
    terms.push(v);
  }
  return {
    kind: 'mul3-sub-growing',
    difficulty: 'expert',
    formula: 'aₙ₊₁ = 3·aₙ − 6n',
    explanation: 'Each step: triple the previous term, then subtract a growing multiple of 6 (×3−6, ×3−12, ×3−18, ×3−24, …).',
    terms,
  };
};

export const EXPERT_GENERATORS: PatternGenerator[] = [
  n4MinusK,
  factorialOffset,
  catalan,
  cubicGeneral,
  mulByPositionPlus1,
  interleaved3,
  powOfSquare,
  sumQuadExp,
  altSignFactorial,
  nToN,
  fibTimesN,
  padovan,
  thirdDiffPattern,
  div2AddPow2Growing,
  halfStepBoth,
  mulByNAddNxNplus1,
  mulGrowingAltAdd,
  addDecMulInc,
  mulNAddNextSquare,
  mulBy2nSub2n,
  sumOfAllPrevious,
  mul3SubGrowing,
];
