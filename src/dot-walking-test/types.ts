// Types for the "Dot Walking" (เดินจุด) dual-hand multitask reaction test.

export type Side = 'right' | 'left';

export type IntervalMode = 'fixed' | 'random' | 'mixed';

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
