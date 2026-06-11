import { describe, it, expect } from 'vitest';
import * as rb from '@/rotated-block-puzzle/generate';

// Fast integration check that signatureOf + within-session dedup are wired into
// a real generator. (Heavy cross-session coverage is exercised manually; the
// shared helpers themselves are unit-tested in coverage.test.ts.)
describe('within-session anti-repeat (integration)', () => {
  it('rotated-block: a session has distinct signatures and is deterministic per seed', () => {
    const settings = { count: 6, difficulty: 'normal' } as never;
    const a = rb.generateSession(settings, 777);
    const b = rb.generateSession(settings, 777);

    // Deterministic per seed (the dedup retries draw from the same seeded rng).
    expect(a.map(rb.signatureOf)).toEqual(b.map(rb.signatureOf));

    // Within one session, the normal-tier pool is large enough to be all-distinct.
    const sigs = a.map(rb.signatureOf);
    expect(new Set(sigs).size).toBe(sigs.length);
  });
});
