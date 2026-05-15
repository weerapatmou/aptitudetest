import { describe, it, expect } from 'vitest';
import { generateAssemblyPuzzle } from '../generate';
import type { Difficulty, Mode } from '../types';

describe('generateAssemblyPuzzle', () => {
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
  const expectedCounts: Record<Difficulty, number> = {
    easy: 3, medium: 4, hard: 5, expert: 6,
  };

  for (const d of difficulties) {
    for (const m of ['mirror', 'strict'] as Mode[]) {
      it(`produces 4 options with exactly 1 correct (${d}, ${m})`, () => {
        const puzzle = generateAssemblyPuzzle(d, m, 100 + difficulties.indexOf(d));
        expect(puzzle.options.length).toBe(4);
        expect(puzzle.options[puzzle.correctIndex]!.defect).toBe('correct');
        const correctCount = puzzle.options.filter((o) => o.defect === 'correct').length;
        expect(correctCount).toBe(1);
        expect(puzzle.pieceCount).toBe(expectedCounts[d]);
        // Every option has the right number of pieces.
        for (const opt of puzzle.options) {
          expect(opt.pieces.length).toBe(expectedCounts[d]);
        }
      });
    }
  }

  it('strict mode always includes a mirror-trap distractor', () => {
    for (let seed = 0; seed < 8; seed++) {
      const puzzle = generateAssemblyPuzzle('medium', 'strict', seed);
      const hasMirror = puzzle.options.some((o) => o.defect === 'mirror-trap');
      expect(hasMirror).toBe(true);
    }
  });

  it('mirror mode never includes a mirror-trap distractor', () => {
    for (let seed = 0; seed < 8; seed++) {
      const puzzle = generateAssemblyPuzzle('medium', 'mirror', seed);
      const hasMirror = puzzle.options.some((o) => o.defect === 'mirror-trap');
      expect(hasMirror).toBe(false);
    }
  });

  it('the 3 distractor defects in every puzzle are all distinct kinds', () => {
    for (const d of difficulties) {
      for (const m of ['mirror', 'strict'] as Mode[]) {
        for (let seed = 0; seed < 12; seed++) {
          const puzzle = generateAssemblyPuzzle(d, m, seed);
          const distractorKinds = puzzle.options
            .filter((o) => o.defect !== 'correct')
            .map((o) => o.defect);
          const unique = new Set(distractorKinds);
          expect(unique.size).toBe(distractorKinds.length);
        }
      }
    }
  });

  it('the 3 distractors target distinct pieces (by defective index)', () => {
    for (const d of difficulties) {
      for (let seed = 0; seed < 12; seed++) {
        const puzzle = generateAssemblyPuzzle(d, 'mirror', seed);
        const defectiveIndices: number[] = [];
        for (const opt of puzzle.options) {
          if (opt.defect === 'correct') continue;
          const idx = opt.pieces.findIndex((p) => p.defective);
          if (idx >= 0) defectiveIndices.push(idx);
        }
        const unique = new Set(defectiveIndices);
        expect(unique.size).toBe(defectiveIndices.length);
      }
    }
  });
});
