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
  const start = rng.int(1, 20);
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
const multiples: PatternGenerator = (rng, length) => {
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
const counting: PatternGenerator = (rng, length) => {
  const start = rng.int(1, 50);
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
  const a = rng.int(1, 30);
  let b = rng.int(1, 30);
  if (a === b) b = (b + 3) % 31 || 1;
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
];
