// Types for the "Dot Walking" (เดินจุด) dual-hand multitask reaction test.

export type Side = 'right' | 'left';

export type IntervalMode = 'fixed' | 'random' | 'mixed';

/** Examiner question categories asked aloud while walking the dots. */
export type QCategory = 'addsub' | 'multiply' | 'time' | 'wordrecall' | 'spellback';

/** Per-category config: whether it's asked, and seconds to answer before the reveal. */
export type QuestionConfig = { enabled: boolean; answerSec: number };

export type Settings = {
  /** Circles per side, per page. */
  circlesPerSide: number;
  /** How the knock rhythm (interval between beats) is chosen. */
  intervalMode: IntervalMode;
  /** Fixed knock interval (ms) — used by 'fixed' and as the base for 'mixed'. */
  intervalMs: number;
  /** Lower bound (ms) for 'random' mode. */
  intervalMinMs: number;
  /** Upper bound (ms) for 'random' mode. */
  intervalMaxMs: number;
  /** Max random jitter (ms) added on top of intervalMs for 'mixed' mode. */
  jitterMs: number;
  /** Time allowed to tap after a knock before it turns red (ms). */
  responseMs: number;
  /** On each new page, randomly swap which hand leads (crossed practice). */
  swapSides: boolean;
  /** Mute the metronome / warning tones. */
  muted: boolean;

  // ── Examiner questions (spoken multitask overlay) ──
  /** Master switch for the spoken-question layer. */
  questionsEnabled: boolean;
  /** Language for math/time questions (word categories are always English). */
  mathLang: 'th' | 'en';
  /** TTS speaking rate for the examiner voice (≈0.5 slow … 1.5 fast). */
  speechRate: number;
  /** Silence (seconds) after the answer is spoken before the next question. */
  questionGapSec: number;
  /** Per-category enable + answer time. */
  questions: Record<QCategory, QuestionConfig>;
  /** Editable word pool for the "word recall" category. */
  recallWords: string[];
  /** Editable word pool for the "spell backward" category. */
  spellWords: string[];
};

export type Circle = {
  id: number;
  /** Center X in viewBox units (0..VB_W). */
  x: number;
  /** Center Y in viewBox units (0..VB_H); order 0 sits near the bottom. */
  y: number;
  /** 0-based position along the trail (0 = first / bottom, ascends upward). */
  order: number;
};

export type Page = {
  right: Circle[];
  left: Circle[];
};

export type CircleStatus = 'upcoming' | 'active' | 'correct' | 'wrong';

/** Per-step resolution recorded on a side's circle. */
export type StepResult = 'correct' | 'wrong' | null;
