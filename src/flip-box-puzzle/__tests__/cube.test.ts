import { describe, it, expect } from 'vitest';
import {
  applyCommand,
  IDENTITY,
  resolvePlacement,
  type Mat3,
} from '../generate/cube';
import { COMMANDS, type Command } from '../types';

function key(m: Mat3): string {
  return m.join(',');
}

describe('cube orientation algebra', () => {
  it('starts with the mark on top at angle 0', () => {
    expect(resolvePlacement(IDENTITY)).toEqual({ face: 'top', angle: 0 });
  });

  it('four identical quarter-turns return to the identity', () => {
    for (const cmd of COMMANDS) {
      let m: Mat3 = IDENTITY;
      for (let i = 0; i < 4; i++) m = applyCommand(m, cmd);
      expect(key(m)).toBe(key(IDENTITY));
    }
  });

  it('turn-forwards tips the top mark onto a visible front face, upright', () => {
    const p = resolvePlacement(applyCommand(IDENTITY, 'turn-forwards'));
    expect(p).toEqual({ face: 'left', angle: 0 });
  });

  it('turn-backwards and flip-left tip the top mark to a hidden face', () => {
    expect(resolvePlacement(applyCommand(IDENTITY, 'turn-backwards')).face).toBeNull();
    expect(resolvePlacement(applyCommand(IDENTITY, 'flip-left')).face).toBeNull();
  });

  it('flip-right tips the top mark onto the right face', () => {
    expect(resolvePlacement(applyCommand(IDENTITY, 'flip-right')).face).toBe('right');
  });

  it('reaches exactly the 24 cube orientations', () => {
    const seen = new Set<string>([key(IDENTITY)]);
    const frontier: Mat3[] = [IDENTITY];
    while (frontier.length) {
      const m = frontier.pop()!;
      for (const cmd of COMMANDS) {
        const n = applyCommand(m, cmd);
        const k = key(n);
        if (!seen.has(k)) {
          seen.add(k);
          frontier.push(n);
        }
      }
    }
    expect(seen.size).toBe(24);
  });

  it('every reachable orientation resolves to a valid placement', () => {
    let m: Mat3 = IDENTITY;
    const cmds: Command[] = ['turn-left', 'flip-right', 'turn-forwards', 'turn-right', 'flip-left'];
    for (const cmd of cmds) {
      m = applyCommand(m, cmd);
      const p = resolvePlacement(m);
      expect([0, 90, 180, 270]).toContain(p.angle);
      expect([null, 'top', 'right', 'left']).toContain(p.face);
    }
  });
});
