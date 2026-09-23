import type { QCategory, Settings } from '../types';
import { RECALL_WORDS, SPELL_WORDS } from './wordlists';

export type Lang = 'th' | 'en';
export type SpeechPart = { text: string; lang: Lang };

export type Question = {
  category: QCategory;
  label: string;
  answerSec: number;
  /** Spoken question — parts are queued, each with its own voice. */
  prompt: SpeechPart[];
  /** Spoken answer. */
  answer: SpeechPart[];
  /** Compact answer for the on-screen reveal (never the question). */
  answerText: string;
};

export const CATEGORY_LABELS: Record<QCategory, string> = {
  addsub: 'บวกลบเลข 2 หลัก',
  multiply: 'คูณเลข 2 หลัก',
  time: 'บวกลบเวลา',
  wordrecall: 'ทวนชุดคำอังกฤษ',
  spellback: 'สะกดคำย้อนหลัง',
};

export const ALL_CATEGORIES: QCategory[] = ['addsub', 'multiply', 'time', 'wordrecall', 'spellback'];

// ── small random helpers (live drill → plain Math.random) ──────────────────────
const randInt = (min: number, maxIncl: number) => min + Math.floor(Math.random() * (maxIncl - min + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
const coin = () => Math.random() < 0.5;
function sampleDistinct<T>(arr: readonly T[], k: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i]!, a[j]!] = [a[j]!, a[i]!];
  }
  return a.slice(0, k);
}

// ── generators ─────────────────────────────────────────────────────────────────

function genAddSub(lang: Lang): Pick<Question, 'prompt' | 'answer' | 'answerText'> {
  let a = randInt(10, 99);
  let b = randInt(10, 99);
  const plus = coin();
  if (!plus && a < b) [a, b] = [b, a]; // keep subtraction non-negative
  const result = plus ? a + b : a - b;
  const text =
    lang === 'th'
      ? `${a} ${plus ? 'บวก' : 'ลบ'} ${b} เท่ากับเท่าไหร่`
      : `${a} ${plus ? 'plus' : 'minus'} ${b}`;
  return { prompt: [{ text, lang }], answer: [{ text: String(result), lang }], answerText: String(result) };
}

function genMultiply(lang: Lang): Pick<Question, 'prompt' | 'answer' | 'answerText'> {
  const a = randInt(10, 99);
  const b = randInt(10, 99);
  const result = a * b;
  const text = lang === 'th' ? `${a} คูณ ${b} เท่ากับเท่าไหร่` : `${a} times ${b}`;
  return { prompt: [{ text, lang }], answer: [{ text: String(result), lang }], answerText: String(result) };
}

const pad2 = (n: number) => n.toString().padStart(2, '0');

function durationPhrase(h: number, m: number, lang: Lang): string {
  const parts: string[] = [];
  if (lang === 'th') {
    if (h) parts.push(`${h} ชั่วโมง`);
    if (m) parts.push(`${m} นาที`);
  } else {
    if (h) parts.push(`${h} hour${h > 1 ? 's' : ''}`);
    if (m) parts.push(`${m} minute${m > 1 ? 's' : ''}`);
  }
  return parts.join(' ');
}

function clockPhrase(h: number, m: number, lang: Lang): string {
  return lang === 'th' ? `${h} นาฬิกา ${m} นาที` : `${h} hours ${m} minutes`;
}

function genTime(lang: Lang): Pick<Question, 'prompt' | 'answer' | 'answerText'> {
  const h = randInt(0, 23);
  const m = randInt(0, 11) * 5;
  let dH = randInt(0, 3);
  let dM = randInt(0, 11) * 5;
  if (dH === 0 && dM === 0) dM = 5; // ensure a non-zero delta
  const plus = coin();
  const base = h * 60 + m;
  const delta = dH * 60 + dM;
  const total = ((plus ? base + delta : base - delta) % 1440 + 1440) % 1440;
  const rh = Math.floor(total / 60);
  const rm = total % 60;
  const opWord = lang === 'th' ? (plus ? 'บวก' : 'ลบ') : plus ? 'plus' : 'minus';
  const text =
    lang === 'th'
      ? `${clockPhrase(h, m, 'th')} ${opWord} ${durationPhrase(dH, dM, 'th')} เท่ากับเท่าไหร่`
      : `${clockPhrase(h, m, 'en')} ${opWord} ${durationPhrase(dH, dM, 'en')}`;
  return {
    prompt: [{ text, lang }],
    answer: [{ text: clockPhrase(rh, rm, lang), lang }],
    answerText: `${pad2(rh)}:${pad2(rm)}`,
  };
}

function genWordRecall(instructionLang: Lang, source: string[]): Pick<Question, 'prompt' | 'answer' | 'answerText'> {
  const pool = source.length ? source : RECALL_WORDS;
  const k = pool.length >= 5 ? (coin() ? 4 : 5) : Math.max(1, Math.min(4, pool.length));
  const words = sampleDistinct(pool, k);
  const backward = coin();
  const ordered = backward ? [...words].reverse() : words;
  const instruction =
    instructionLang === 'th'
      ? backward
        ? ' พูดย้อนกลับจากคำหลังมาคำแรก'
        : ' พูดทวนตามลำดับ'
      : backward
        ? ' now say them backward'
        : ' now repeat them in order';
  return {
    prompt: [
      { text: words.join(', '), lang: 'en' },
      { text: instruction, lang: instructionLang },
    ],
    answer: [{ text: ordered.join(', '), lang: 'en' }],
    answerText: ordered.join(' · '),
  };
}

function genSpellBack(instructionLang: Lang, source: string[]): Pick<Question, 'prompt' | 'answer' | 'answerText'> {
  const word = pick(source.length ? source : SPELL_WORDS);
  const reversed = word.toUpperCase().split('').reverse();
  const instruction = instructionLang === 'th' ? ' สะกดย้อนหลัง' : ' spell it backward';
  return {
    prompt: [
      { text: word, lang: 'en' },
      { text: instruction, lang: instructionLang },
    ],
    answer: [{ text: reversed.join(', '), lang: 'en' }],
    answerText: reversed.join(' '),
  };
}

function generate(
  category: QCategory,
  lang: Lang,
  recall: string[],
  spell: string[],
): Pick<Question, 'prompt' | 'answer' | 'answerText'> {
  switch (category) {
    case 'addsub':
      return genAddSub(lang);
    case 'multiply':
      return genMultiply(lang);
    case 'time':
      return genTime(lang);
    case 'wordrecall':
      return genWordRecall(lang, recall);
    case 'spellback':
      return genSpellBack(lang, spell);
  }
}

/** Pick a random enabled category and build a full question, or null if none enabled. */
export function pickQuestion(settings: Settings): Question | null {
  const enabled = ALL_CATEGORIES.filter((c) => settings.questions[c]?.enabled);
  if (enabled.length === 0) return null;
  const category = pick(enabled);
  const body = generate(category, settings.mathLang, settings.recallWords ?? [], settings.spellWords ?? []);
  return {
    category,
    label: CATEGORY_LABELS[category],
    answerSec: settings.questions[category]!.answerSec,
    ...body,
  };
}
