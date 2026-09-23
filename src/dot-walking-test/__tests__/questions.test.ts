import { describe, expect, it } from 'vitest';
import type { QCategory, Settings } from '../types';
import { pickQuestion } from '../questions/generate';

const N = 300;

function only(cat: QCategory, mathLang: 'th' | 'en' = 'en'): Settings {
  const q = (enabled: boolean) => ({ enabled, answerSec: 6 });
  return {
    circlesPerSide: 15,
    intervalMode: 'fixed',
    intervalMs: 2000,
    intervalMinMs: 1500,
    intervalMaxMs: 2500,
    jitterMs: 1000,
    responseMs: 1500,
    swapSides: false,
    muted: false,
    questionsEnabled: true,
    mathLang,
    speechRate: 1,
    questionGapSec: 2,
    questions: {
      addsub: q(cat === 'addsub'),
      multiply: q(cat === 'multiply'),
      time: q(cat === 'time'),
      wordrecall: q(cat === 'wordrecall'),
      spellback: q(cat === 'spellback'),
    },
    recallWords: [],
    spellWords: [],
  };
}

describe('pickQuestion — none enabled', () => {
  it('returns null when no category is enabled', () => {
    const s = only('addsub');
    s.questions.addsub.enabled = false;
    expect(pickQuestion(s)).toBeNull();
  });
});

describe('addsub', () => {
  it('is always a correct, non-negative sum/difference of two 2-digit numbers', () => {
    const s = only('addsub', 'en');
    for (let i = 0; i < N; i++) {
      const q = pickQuestion(s)!;
      const m = q.prompt[0]!.text.match(/^(\d+) (plus|minus) (\d+)$/)!;
      const a = +m[1]!;
      const b = +m[3]!;
      expect(a).toBeGreaterThanOrEqual(10);
      expect(b).toBeGreaterThanOrEqual(10);
      const result = m[2] === 'plus' ? a + b : a - b;
      expect(result).toBeGreaterThanOrEqual(0);
      expect(q.answerText).toBe(String(result));
    }
  });
});

describe('multiply', () => {
  it('equals a*b with both operands 2-digit', () => {
    const s = only('multiply', 'en');
    for (let i = 0; i < N; i++) {
      const q = pickQuestion(s)!;
      const m = q.prompt[0]!.text.match(/^(\d+) times (\d+)$/)!;
      const a = +m[1]!;
      const b = +m[2]!;
      expect(a).toBeGreaterThanOrEqual(10);
      expect(a).toBeLessThanOrEqual(99);
      expect(b).toBeLessThanOrEqual(99);
      expect(q.answerText).toBe(String(a * b));
    }
  });
});

describe('time', () => {
  it('wraps mod 24h correctly', () => {
    const s = only('time', 'en');
    for (let i = 0; i < N; i++) {
      const q = pickQuestion(s)!;
      const m = q.prompt[0]!.text.match(/^(\d+) hours (\d+) minutes (plus|minus) (.+)$/)!;
      const base = +m[1]! * 60 + +m[2]!;
      const dur = m[4]!;
      const dh = dur.match(/(\d+) hour/);
      const dm = dur.match(/(\d+) minute/);
      const delta = (dh ? +dh[1]! : 0) * 60 + (dm ? +dm[1]! : 0);
      const total = (((m[3] === 'plus' ? base + delta : base - delta) % 1440) + 1440) % 1440;
      const rh = Math.floor(total / 60);
      const rm = total % 60;
      const expected = `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
      expect(q.answerText).toBe(expected);
    }
  });
});

describe('wordrecall', () => {
  it('gives 4–5 distinct words and the correct forward/backward order', () => {
    const s = only('wordrecall', 'en');
    for (let i = 0; i < N; i++) {
      const q = pickQuestion(s)!;
      const words = q.prompt[0]!.text.split(', ');
      expect(words.length === 4 || words.length === 5).toBe(true);
      expect(new Set(words).size).toBe(words.length);
      const answer = q.answer[0]!.text.split(', ');
      const backward = /backward/.test(q.prompt[1]!.text);
      expect(answer).toEqual(backward ? [...words].reverse() : words);
    }
  });
});

describe('spellback', () => {
  it('answer is the exact reversed spelling of the word', () => {
    const s = only('spellback', 'en');
    for (let i = 0; i < N; i++) {
      const q = pickQuestion(s)!;
      const word = q.prompt[0]!.text;
      const reversed = word.toUpperCase().split('').reverse();
      expect(q.answer[0]!.text).toBe(reversed.join(', '));
      expect(q.answerText).toBe(reversed.join(' '));
    }
  });
});
