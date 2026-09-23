// Thin Web Speech API (speechSynthesis) wrapper for the examiner questions.
// No dependency; degrades to a timed no-op when speech synthesis is unavailable.

import type { SpeechPart } from './questions/generate';

export type SpeechEngine = {
  supported: boolean;
  /** Call from a user gesture (Start) to unlock TTS on iOS and warm the voice list. */
  prime: () => void;
  /** Speak the parts in order; onEnd fires after the last one finishes. */
  speakParts: (parts: SpeechPart[], onEnd: () => void) => void;
  cancel: () => void;
};

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis ?? null;
}

// Rough spoken-duration estimate (ms) for the no-TTS fallback so the loop keeps timing.
function estimateMs(parts: SpeechPart[]): number {
  const chars = parts.reduce((n, p) => n + p.text.length, 0);
  return Math.max(700, chars * 65);
}

export function createSpeech(isMuted: () => boolean, getRate: () => number = () => 1): SpeechEngine {
  const synth = getSynth();
  const supported = !!synth && typeof SpeechSynthesisUtterance !== 'undefined';
  let voices: SpeechSynthesisVoice[] = [];

  const loadVoices = () => {
    if (!synth) return;
    voices = synth.getVoices();
  };
  if (synth) {
    loadVoices();
    // Voices often load asynchronously.
    try {
      synth.addEventListener?.('voiceschanged', loadVoices);
    } catch {
      /* older browsers: onvoiceschanged only */
      synth.onvoiceschanged = loadVoices;
    }
  }

  const pickVoice = (lang: 'th' | 'en'): SpeechSynthesisVoice | undefined => {
    const prefix = lang === 'th' ? 'th' : 'en';
    return (
      voices.find((v) => v.lang?.toLowerCase().startsWith(prefix + '-')) ??
      voices.find((v) => v.lang?.toLowerCase().startsWith(prefix))
    );
  };

  return {
    supported,

    prime: () => {
      if (!synth) return;
      loadVoices();
      // A tiny near-silent utterance unlocks the queue on iOS Safari.
      try {
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        synth.speak(u);
        synth.resume();
      } catch {
        /* ignore */
      }
    },

    speakParts: (parts, onEnd) => {
      // When muted or unsupported, stay silent but keep the loop paced naturally.
      if (!synth || !supported || isMuted() || parts.length === 0) {
        const rate = Math.max(0.5, Math.min(1.5, getRate() || 1));
        window.setTimeout(onEnd, estimateMs(parts) / rate);
        return;
      }
      synth.cancel(); // drop anything still pending
      parts.forEach((part, i) => {
        const u = new SpeechSynthesisUtterance(part.text);
        u.lang = part.lang === 'th' ? 'th-TH' : 'en-US';
        const v = pickVoice(part.lang);
        if (v) u.voice = v;
        u.rate = Math.max(0.5, Math.min(1.5, getRate() || 1));
        if (i === parts.length - 1) {
          u.onend = () => onEnd();
          u.onerror = () => onEnd();
        }
        synth.speak(u);
      });
      // iOS Safari sometimes pauses the queue; nudge it.
      synth.resume();
    },

    cancel: () => {
      if (synth) {
        try {
          synth.cancel();
        } catch {
          /* ignore */
        }
      }
    },
  };
}
