import { describe, it, expect } from 'vitest';
import type { Candidate } from '../types';
import { generatePuzzle } from '../generate';
import { makeRng } from '../generate/rng';
import { applyTransform, outerEdgePoly, rotatePolygon } from '../generate/geometry';
import { hausdorff } from '../generate/symmetry';

const N = 200;

describe('acceptance #1 — geometric identity of correct candidate', () => {
  it('correct candidate transform of original outer == original outer rotated by θ', () => {
    for (let i = 0; i < N; i++) {
      const p = generatePuzzle('medium', { rng: makeRng(0xbeef + i) });
      const correct = p.candidates[p.correctIndex]!;
      const outer = outerEdgePoly(p.original.outer, 80);
      const viaTransform = applyTransform(outer, correct.transform);
      const viaRotation = rotatePolygon(outer, p.rotation);
      expect(hausdorff(viaTransform, viaRotation)).toBeLessThan(0.5);
    }
  });
});

/**
 * Distinctness now lives at the structural level (kind/size/filled/fillStyle/
 * center/rotation + transform.flipX). Two distractors may share a point cloud
 * (e.g. `attribute` and `fillstyle-changed` only differ in colors, not in
 * geometry) yet must still differ structurally because they alter different
 * fields.
 */
function structuralSignature(c: Candidate): string {
  const internals = [...c.figure.internals]
    .map((e) =>
      `${e.kind}|${e.center.x.toFixed(2)}|${e.center.y.toFixed(2)}|${e.size.toFixed(2)}|${e.filled}|${e.fillStyle ?? 'none'}|${e.rotation.toFixed(2)}`,
    )
    .sort();
  return `flip:${c.transform.flipX}|rot:${c.transform.rotate.toFixed(2)}|n:${internals.length}|${internals.join(',')}`;
}

describe('acceptance #2 — candidate structural distinctness', () => {
  it('no two candidates share the same structural signature', () => {
    for (let i = 0; i < N; i++) {
      const p = generatePuzzle('medium', { rng: makeRng(0xface + i) });
      const sigs = p.candidates.map(structuralSignature);
      const unique = new Set(sigs);
      expect(unique.size).toBe(sigs.length);
    }
  });
});
