import type { SeriesPattern } from '../../types';
import type { Rng } from '../rng';

export type PatternGenerator = (rng: Rng, length: number) => SeriesPattern;

const sub = (n: number): string => n.toString();

export function roundDec(n: number, places = 4): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

// E1: constant addition, small step
export const arithAddSmall: PatternGenerator = (rng, length) => {
  const k = rng.int(1, 6); // 1..5
  const start = rng.int(1, 40);
  const terms = Array.from({ length }, (_, i) => start + k * i);
  return {
    kind: 'arith-add',
    difficulty: 'easy',
    formula: `aₙ = a₁ + ${k}·(n−1)`,
    explanation: `Each term increases by ${k}.`,
    terms,
  };
};

// E2: constant addition, round step
const arithAddRound: PatternGenerator = (rng, length) => {
  const k = rng.pick([10, 25, 50, 100] as const);
  const start = rng.int(1, 6) * k;
  const terms = Array.from({ length }, (_, i) => start + k * i);
  return {
    kind: 'arith-add-round',
    difficulty: 'easy',
    formula: `aₙ = a₁ + ${k}·(n−1)`,
    explanation: `Each term increases by ${k}.`,
    terms,
  };
};

// E3: constant subtraction
const arithSub: PatternGenerator = (rng, length) => {
  const k = rng.int(2, 8);
  const start = rng.int(40, 100);
  const terms = Array.from({ length }, (_, i) => start - k * i);
  return {
    kind: 'arith-sub',
    difficulty: 'easy',
    formula: `aₙ = a₁ − ${k}·(n−1)`,
    explanation: `Each term decreases by ${k}.`,
    terms,
  };
};

// E4: multiply by small constant
const geoMul: PatternGenerator = (rng, length) => {
  const k = rng.pick([2, 3, 5] as const);
  const start = rng.int(1, 5);
  const terms: number[] = [];
  let v = start;
  for (let i = 0; i < length; i++) {
    terms.push(v);
    v *= k;
  }
  return {
    kind: 'geo-mul',
    difficulty: 'easy',
    formula: `aₙ = a₁ · ${k}^(n−1)`,
    explanation: `Each term is multiplied by ${k}.`,
    terms,
  };
};

// E5: divide by constant
const geoDiv: PatternGenerator = (rng, length) => {
  const k = rng.pick([2, 3] as const);
  // Build backwards from final small term so the sequence is clean integers.
  const tail = rng.int(1, 5);
  const reversed: number[] = [tail];
  for (let i = 1; i < length; i++) reversed.push(reversed[i - 1]! * k);
  const terms = reversed.reverse();
  return {
    kind: 'geo-div',
    difficulty: 'easy',
    formula: `aₙ₊₁ = aₙ ÷ ${k}`,
    explanation: `Each term is divided by ${k}.`,
    terms,
  };
};

// E6: multiples of k
export const multiples: PatternGenerator = (rng, length) => {
  const k = rng.int(2, 13);
  const startIdx = rng.int(1, 4);
  const terms = Array.from({ length }, (_, i) => k * (startIdx + i));
  return {
    kind: 'multiples',
    difficulty: 'easy',
    formula: `aₙ = ${k}·n`,
    explanation: `Multiples of ${k}: ${k}, ${2 * k}, ${3 * k}, …`,
    terms,
  };
};

// E7: counting up by 1
export const counting: PatternGenerator = (rng, length) => {
  const start = rng.int(1, 80);
  const terms = Array.from({ length }, (_, i) => start + i);
  return {
    kind: 'counting',
    difficulty: 'easy',
    formula: `aₙ = ${sub(start)} + (n−1)`,
    explanation: `Counting up by 1 from ${start}.`,
    terms,
  };
};

// E8: alternating pair (a, b, a, b, ...)
const alternatingPair: PatternGenerator = (rng, length) => {
  const a = rng.int(1, 50);
  let b = rng.int(1, 50);
  if (a === b) b = (b + 3) % 51 || 1;
  const terms = Array.from({ length }, (_, i) => (i % 2 === 0 ? a : b));
  return {
    kind: 'alternating-pair',
    difficulty: 'easy',
    formula: `aₙ = ${a} if n odd, ${b} if n even`,
    explanation: `The sequence alternates between ${a} and ${b}.`,
    terms,
  };
};

// E9: powers of a small base
const powersSmall: PatternGenerator = (rng, length) => {
  const base = rng.pick([2, 3, 4, 10] as const);
  const maxLen = base === 10 ? Math.min(length, 5) : base === 4 ? Math.min(length, 5) : length;
  const terms: number[] = [];
  let v = 1;
  for (let i = 0; i < maxLen; i++) {
    terms.push(v);
    v *= base;
  }
  // Pad if needed (rarely triggered)
  while (terms.length < length) terms.push(terms[terms.length - 1]! * base);
  return {
    kind: 'powers-small',
    difficulty: 'easy',
    formula: `aₙ = ${base}^(n−1)`,
    explanation: `Powers of ${base}: 1, ${base}, ${base * base}, ${base ** 3}, …`,
    terms,
  };
};

// E10: count down by 1 or 2
const countDown: PatternGenerator = (rng, length) => {
  const step = rng.pick([1, 2] as const);
  const start = rng.int(length * step + 5, 80);
  const terms = Array.from({ length }, (_, i) => start - step * i);
  return {
    kind: 'count-down',
    difficulty: 'easy',
    formula: `aₙ = ${start} − ${step}·(n−1)`,
    explanation: `Counting down by ${step} from ${start}.`,
    terms,
  };
};

// E11: geometric multiplication by a fractional ratio (×0.5, ×0.75, ×1.5)
const geoFractional: PatternGenerator = (rng, length) => {
  const choice = rng.pick([
    { p: 1, q: 2, label: '0.5' },
    { p: 3, q: 4, label: '0.75' },
    { p: 3, q: 2, label: '1.5' },
  ] as const);
  const k = rng.int(1, 6);
  let v = k * Math.pow(choice.q, length - 1);
  const terms: number[] = [];
  for (let i = 0; i < length; i++) {
    terms.push(roundDec(v, 4));
    v = (v * choice.p) / choice.q;
  }
  return {
    kind: 'geo-fractional',
    difficulty: 'easy',
    formula: `aₙ₊₁ = aₙ × ${choice.label}`,
    explanation: `Each term is multiplied by ${choice.label}.`,
    terms,
  };
};

// E12: constant plus a power of 2 (aₙ = c + 2^(n−1))
const constPlusPow2: PatternGenerator = (rng, length) => {
  const c = rng.int(1, 12);
  const terms = Array.from({ length }, (_, i) => c + Math.pow(2, i));
  return {
    kind: 'const-plus-pow2',
    difficulty: 'easy',
    formula: `aₙ = ${c} + 2^(n−1)`,
    explanation: `Each term equals ${c} plus a power of 2: ${c}+1, ${c}+2, ${c}+4, ${c}+8, ${c}+16, …`,
    terms,
  };
};

// E13: alternating add / subtract with small steps (+a, −b, +a, −b, …).
// Net drift stays positive (a > b) so the run climbs gently; every adjacent
// step is a small add the solver does in their head.
const addSubAlt: PatternGenerator = (rng, length) => {
  const a = rng.int(4, 10); // 4..9 (add step)
  const b = rng.int(1, a - 1); // 1..a-1 (subtract step), smaller so the run rises
  const start = rng.int(5, 30);
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) {
    terms.push(terms[i - 1]! + (i % 2 === 1 ? a : -b));
  }
  return {
    kind: 'add-sub-alt',
    difficulty: 'easy',
    formula: `+${a}, −${b}, +${a}, −${b}, …`,
    explanation: `Alternately add ${a}, then subtract ${b}.`,
    terms,
  };
};

// E14: double then add 1 (aₙ₊₁ = 2·aₙ + 1).
const doubleAdd1: PatternGenerator = (rng, length) => {
  const start = rng.int(1, 5);
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) terms.push(terms[i - 1]! * 2 + 1);
  return {
    kind: 'double-add-1',
    difficulty: 'easy',
    formula: 'aₙ₊₁ = 2·aₙ + 1',
    explanation: 'Each term is the previous one doubled, plus 1.',
    terms,
  };
};

// E15: skip-count (multiples of k) starting from a non-zero offset.
const skipCountOffset: PatternGenerator = (rng, length) => {
  const k = rng.int(3, 10); // 3..9
  const offset = rng.int(1, k - 1); // 1..k-1 — a constant tacked onto each multiple
  const startIdx = rng.int(1, 5);
  const terms = Array.from({ length }, (_, i) => k * (startIdx + i) + offset);
  return {
    kind: 'skip-count-offset',
    difficulty: 'easy',
    formula: `aₙ = ${k}·n + ${offset}`,
    explanation: `Count up by ${k}, each term offset by ${offset}.`,
    terms,
  };
};

// E16: ones-place cycle — add a fixed step whose ones digit cycles (e.g. +7 →
// 3, 10, 17, 24, …, the ones digit walks 3,0,7,4,1,…). Still a constant add, so
// it reads as simple arithmetic with an eye-catching repeating last digit.
const onesPlaceCycle: PatternGenerator = (rng, length) => {
  const k = rng.pick([3, 7, 9, 11, 13] as const);
  const start = rng.int(1, 9);
  const terms = Array.from({ length }, (_, i) => start + k * i);
  return {
    kind: 'ones-place-cycle',
    difficulty: 'easy',
    formula: `aₙ = ${start} + ${k}·(n−1)`,
    explanation: `Add ${k} each time — watch the ones digit cycle.`,
    terms,
  };
};

// E17: add a small constant, then double — alternating (+k, ×2, +k, ×2, …).
const addThenDouble: PatternGenerator = (rng, length) => {
  const k = rng.int(1, 5); // 1..4
  const start = rng.int(1, 4);
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) {
    terms.push(i % 2 === 1 ? terms[i - 1]! + k : terms[i - 1]! * 2);
  }
  return {
    kind: 'add-then-double',
    difficulty: 'easy',
    formula: `+${k}, ×2, +${k}, ×2, …`,
    explanation: `Alternately add ${k}, then double.`,
    terms,
  };
};

// E18: two alternating add-steps that repeat (+a, +b, +a, +b, …).
const addPairRepeat: PatternGenerator = (rng, length) => {
  const a = rng.int(2, 9); // 2..8
  let b = rng.int(2, 9);
  if (b === a) b = (b % 8) + 2; // keep the two steps distinct
  const start = rng.int(1, 20);
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) {
    terms.push(terms[i - 1]! + (i % 2 === 1 ? a : b));
  }
  return {
    kind: 'add-pair-repeat',
    difficulty: 'easy',
    formula: `+${a}, +${b}, +${a}, +${b}, …`,
    explanation: `The gap alternates between +${a} and +${b}.`,
    terms,
  };
};

// E19: subtract then add — descending overall (−a, +b, …) with a > b so the
// run drifts down. Started high enough to stay positive across the window.
const subThenAdd: PatternGenerator = (rng, length) => {
  const a = rng.int(4, 11); // 4..10 (subtract step)
  const b = rng.int(1, a - 1); // 1..a-1 (add step), smaller so the run falls
  const start = rng.int(60, 100);
  const terms: number[] = [start];
  for (let i = 1; i < length; i++) {
    terms.push(terms[i - 1]! + (i % 2 === 1 ? -a : b));
  }
  return {
    kind: 'sub-then-add',
    difficulty: 'easy',
    formula: `−${a}, +${b}, −${a}, +${b}, …`,
    explanation: `Alternately subtract ${a}, then add ${b}.`,
    terms,
  };
};

// E20: add a two-digit constant whose tens and ones both step (e.g. +11, +12,
// +21, +22). A plain constant add, but the digits make the rule pop visually.
const tensPlusOnes: PatternGenerator = (rng, length) => {
  const k = rng.pick([11, 12, 21, 22, 33] as const);
  const start = rng.int(1, 20);
  const terms = Array.from({ length }, (_, i) => start + k * i);
  return {
    kind: 'tens-plus-ones',
    difficulty: 'easy',
    formula: `aₙ = ${start} + ${k}·(n−1)`,
    explanation: `Add ${k} each step.`,
    terms,
  };
};

export const EASY_GENERATORS: PatternGenerator[] = [
  arithAddSmall,
  arithAddRound,
  arithSub,
  geoMul,
  geoDiv,
  multiples,
  counting,
  alternatingPair,
  powersSmall,
  countDown,
  geoFractional,
  constPlusPow2,
  addSubAlt,
  doubleAdd1,
  skipCountOffset,
  onesPlaceCycle,
  addThenDouble,
  addPairRepeat,
  subThenAdd,
  tensPlusOnes,
];
