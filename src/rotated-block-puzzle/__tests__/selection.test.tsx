import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import { RotatedBlockPuzzle } from '..';

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

function start(container: HTMLElement) {
  const startBtn = within(container).getByText(/Start session/i);
  fireEvent.click(startBtn);
}

function section(container: HTMLElement, q: number): HTMLElement {
  const el = container.querySelector(`#q-${q}`);
  if (!el) throw new Error(`question ${q} not rendered`);
  return el as HTMLElement;
}

function choice(container: HTMLElement, q: number, letter: string): HTMLElement {
  return within(section(container, q)).getByLabelText(`Choice ${letter}`);
}

function pressedLetters(container: HTMLElement, q: number): string[] {
  return LETTERS.filter(
    (l) => choice(container, q, l).getAttribute('aria-pressed') === 'true',
  );
}

describe('Rotated Blocks — answer selection integrity', () => {
  beforeEach(() => window.localStorage.clear());

  it('records exactly the clicked choice, scoped to its own question', () => {
    const { container } = render(<RotatedBlockPuzzle />);
    start(container);

    // Click C on question 0.
    fireEvent.click(choice(container, 0, 'C'));
    expect(pressedLetters(container, 0)).toEqual(['C']);

    // Other questions are untouched — the reported bug was a cross/other pick.
    expect(pressedLetters(container, 1)).toEqual([]);
    expect(pressedLetters(container, 2)).toEqual([]);

    // A second question keeps its own independent selection.
    fireEvent.click(choice(container, 1, 'E'));
    expect(pressedLetters(container, 0)).toEqual(['C']); // unchanged
    expect(pressedLetters(container, 1)).toEqual(['E']);
  });

  it('switching picks a different choice; re-clicking the same clears it', () => {
    const { container } = render(<RotatedBlockPuzzle />);
    start(container);

    fireEvent.click(choice(container, 0, 'A'));
    expect(pressedLetters(container, 0)).toEqual(['A']);

    fireEvent.click(choice(container, 0, 'D')); // switch
    expect(pressedLetters(container, 0)).toEqual(['D']);

    fireEvent.click(choice(container, 0, 'D')); // toggle off
    expect(pressedLetters(container, 0)).toEqual([]);
  });

  it('after submit, the revealed pick matches what was selected', () => {
    const { container } = render(<RotatedBlockPuzzle />);
    start(container);

    fireEvent.click(choice(container, 0, 'B'));
    expect(pressedLetters(container, 0)).toEqual(['B']);

    fireEvent.click(within(container).getByText('Submit'));

    // The reveal panel for q0 names the correct answer; the result must agree
    // with whether our pick (B) equals it — no phantom/other selection.
    const txt = section(container, 0).textContent ?? '';
    const m = txt.match(/Answer:\s*([A-E])/);
    expect(m).toBeTruthy();
    const pickedCorrect = m![1] === 'B';
    // "Incorrect" has a lowercase c; case-sensitive /Correct/ matches only the
    // "Correct" status word, so this cleanly distinguishes the two.
    const shownCorrect = /Incorrect/.test(txt) ? false : /Correct/.test(txt);
    expect(shownCorrect).toBe(pickedCorrect);
  });
});
