// Tiny Web Audio helper for the metronome beep + miss warning. No dependencies,
// no audio assets. Degrades to a silent no-op when Web Audio is unavailable.

type Ctor = typeof AudioContext;

function getAudioContextCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: Ctor;
    webkitAudioContext?: Ctor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export type AudioEngine = {
  /** Must be called from a user gesture (Start tap) to unlock audio on iOS. */
  resume: () => void;
  /** Short metronome tick marking a new step. */
  beep: () => void;
  /** Lower buzz on a wrong / timed-out tap. */
  warn: () => void;
  /** Release the AudioContext. */
  close: () => void;
};

export function createAudioEngine(isMuted: () => boolean): AudioEngine {
  const Ctor = getAudioContextCtor();
  let ctx: AudioContext | null = null;

  const ensureCtx = (): AudioContext | null => {
    if (!Ctor) return null;
    if (!ctx) {
      try {
        ctx = new Ctor();
      } catch {
        ctx = null;
      }
    }
    return ctx;
  };

  const tone = (freq: number, durationMs: number, type: OscillatorType, peak: number) => {
    if (isMuted()) return;
    const c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended') void c.resume();
    const now = c.currentTime;
    const dur = durationMs / 1000;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    // Quick attack + exponential release so ticks feel crisp, not clicky.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  };

  return {
    resume: () => {
      const c = ensureCtx();
      if (c && c.state === 'suspended') void c.resume();
    },
    beep: () => tone(880, 70, 'sine', 0.3),
    warn: () => tone(200, 220, 'square', 0.22),
    close: () => {
      if (ctx) {
        try {
          void ctx.close();
        } catch {
          /* already closed */
        }
        ctx = null;
      }
    },
  };
}
