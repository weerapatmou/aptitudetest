import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import type { JigsawPuzzle } from './types';
import { generateJigsawPuzzle, signatureOf } from './generate';
import { PiecePanel } from './PiecePanel';
import { AssembledOptionCard } from './AssembledOptionCard';
import { useLocalStorage } from '../rotation-puzzle/hooks/useLocalStorage';
import { formatDuration, useTimer } from '../rotation-puzzle/hooks/useTimer';
import { SeedBar, useSeedSequence } from '@/shared/seed';
import { pickFreshSeed, useSignatureHistory } from '@/shared/coverage';

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

type PieceMode = '3' | '4' | '5' | 'mix';

type Props = {
  onHome?: () => void;
};

export function JigsawPuzzle({ onHome }: Props = {}) {
  const [score, setScore] = useLocalStorage('jigsaw:score', { correct: 0, total: 0 });
  const [sheetSize, setSheetSize] = useLocalStorage<number>('jigsaw:sheetSize', 5);
  const [pieceMode, setPieceMode] = useLocalStorage<PieceMode>('jigsaw:pieceMode', '3');
  const [sheetNum, setSheetNum] = useState(1);

  const [questions, setQuestions] = useState<JigsawPuzzle[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const reduced = useReducedMotion();
  const { elapsed, reset: resetTimer } = useTimer(true);

  const history = useSignatureHistory('jigsaw:sigHistory', { max: 60 });

  const pickSeed = useCallback(
    () =>
      pickFreshSeed({
        recent: history.recent,
        previewSignatures: (s) => {
          const pc: number | 'mix' = pieceMode === 'mix' ? 'mix' : parseInt(pieceMode);
          return Array.from({ length: sheetSize }, (_, i) =>
            signatureOf(generateJigsawPuzzle(s + i, pc)),
          );
        },
      }).seed,
    [history.recent, sheetSize, pieceMode],
  );

  const seedSeq = useSeedSequence('jigsaw:sessionSeed', undefined, { pickSeed });

  const generateSheet = useCallback(
    (baseSeed: number, count: number = sheetSize, pMode: PieceMode = pieceMode) => {
      const pc: number | 'mix' = pMode === 'mix' ? 'mix' : parseInt(pMode);
      const qs = Array.from({ length: count }, (_, i) =>
        generateJigsawPuzzle(baseSeed + i, pc),
      );
      history.add(qs.map(signatureOf));
      setQuestions(qs);
      setAnswers({});
      setSubmitted(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sheetSize, pieceMode],
  );

  useEffect(() => {
    generateSheet(seedSeq.restart());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetSize, pieceMode]);

  const newSheet = useCallback(() => {
    generateSheet(seedSeq.advance());
    setSheetNum((n) => n + 1);
    resetTimer();
  }, [generateSheet, seedSeq, resetTimer]);

  const handlePick = useCallback((qIdx: number, optIdx: number) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  }, [submitted]);

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    let correct = 0;
    for (let i = 0; i < questions.length; i++) {
      if (answers[i] === questions[i]!.correctIndex) correct++;
    }
    setScore((s) => ({ correct: s.correct + correct, total: s.total + questions.length }));
    setSubmitted(true);
  }, [submitted, questions, answers, setScore]);

  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;
  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  const sheetCorrect = submitted
    ? questions.filter((q, i) => answers[i] === q.correctIndex).length
    : null;

  return (
    <div className="min-h-full bg-instrument">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-4">
          {onHome ? (
            <button
              onClick={onHome}
              aria-label="Back to home"
              className="group flex items-center gap-3 rounded-md px-1 -mx-1 hover:bg-bg-card-hover transition"
            >
              <LogoMark />
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim leading-tight text-left">
                <div className="group-hover:text-text">Jigsaw Puzzle</div>
                <div className="text-[10px] text-text-dim/70 group-hover:text-accent">← Aptitude Practice</div>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <LogoMark />
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim leading-tight">
                <div>Jigsaw Puzzle</div>
                <div className="text-[10px] text-text-dim/70">Aptitude Practice</div>
              </div>
            </div>
          )}
          <div className="hidden md:flex items-center gap-2 ml-4 font-mono text-xs text-text-dim">
            <span className="text-text-dim/70">SHEET</span>
            <span className="text-text font-medium">#{String(sheetNum).padStart(3, '0')}</span>
          </div>
          <div className="ml-auto flex items-center gap-3 md:gap-5 font-mono text-xs">
            <ScoreReadout
              score={score.correct}
              total={score.total}
              accuracy={accuracy}
              onReset={() => {
                if (score.total === 0) return;
                if (typeof window !== 'undefined' && !window.confirm('Reset score to 0/0?')) return;
                setScore({ correct: 0, total: 0 });
              }}
            />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-bg-card">
              <span className="text-text-dim/70">T</span>
              <span className="text-text tabular-nums">{formatDuration(elapsed)}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-32">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* Sheet size input */}
          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-card px-3 py-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim/60">Q</span>
            <input
              type="number"
              min={1}
              max={50}
              value={sheetSize}
              onChange={(e) => {
                const n = Math.max(1, Math.min(50, parseInt(e.target.value) || 1));
                setSheetSize(n);
                generateSheet(seedSeq.restart(), n);
                resetTimer();
              }}
              aria-label="Questions per sheet"
              className="w-12 bg-transparent font-mono text-sm text-text text-center outline-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          {/* Piece count mode selector */}
          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-bg-card p-1">
            <span className="px-2 font-mono text-[10px] uppercase tracking-wider text-text-dim/60">PCS</span>
            {(['3', '4', '5', 'mix'] as PieceMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setPieceMode(m); generateSheet(seedSeq.restart(), sheetSize, m); resetTimer(); }}
                className={clsx(
                  'rounded-lg px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition',
                  m === pieceMode
                    ? 'bg-accent text-bg shadow-[0_0_12px_-2px_var(--accent)]'
                    : 'text-text-dim hover:text-text hover:bg-bg-card-hover',
                )}
              >
                {m === 'mix' ? 'MIX' : m}
              </button>
            ))}
          </div>
          <SeedBar
            variant="full"
            seed={seedSeq.current}
            draft={seedSeq.draft}
            draftValid={seedSeq.draftValid}
            onDraftChange={seedSeq.setDraft}
            onNew={() => { generateSheet(seedSeq.fresh()); resetTimer(); }}
            onReplay={() => { generateSheet(seedSeq.restart()); resetTimer(); }}
            onApply={() => {
              const n = seedSeq.applyDraft();
              if (n !== null) { generateSheet(n); resetTimer(); }
            }}
          />
        </div>

        <div className="flex flex-col gap-4">
          {questions.map((question, qIdx) => (
            <SheetRow
              key={`${sheetNum}-${qIdx}`}
              question={question}
              qIdx={qIdx}
              answer={answers[qIdx] ?? -1}
              submitted={submitted}
              reduced={!!reduced}
              onPick={(optIdx) => handlePick(qIdx, optIdx)}
            />
          ))}
        </div>
      </main>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-bg/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
          {submitted ? (
            <div className="font-mono text-sm">
              <span className="text-text-dim">Sheet result: </span>
              <span className={clsx(
                'font-bold',
                sheetCorrect === totalCount ? 'text-correct' : sheetCorrect! >= totalCount * 0.6 ? 'text-accent' : 'text-wrong',
              )}>
                {sheetCorrect}/{totalCount}
              </span>
              <span className="text-text-dim/60 text-xs ml-2">({Math.round((sheetCorrect! / totalCount) * 100)}%)</span>
            </div>
          ) : (
            <div className="font-mono text-xs text-text-dim">
              Answered{' '}
              <span className={clsx('font-medium', answeredCount === totalCount ? 'text-accent' : 'text-text')}>
                {answeredCount}/{totalCount}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            {submitted && (
              <button
                onClick={newSheet}
                className="px-5 py-2 rounded-lg font-mono uppercase tracking-wider text-xs bg-accent text-bg hover:shadow-[0_0_24px_-4px_var(--accent)] transition"
              >
                New Set →
              </button>
            )}
            {!submitted && (
              <button
                onClick={handleSubmit}
                disabled={answeredCount === 0}
                className={clsx(
                  'px-5 py-2 rounded-lg font-mono uppercase tracking-wider text-xs transition',
                  answeredCount > 0
                    ? 'bg-accent text-bg hover:shadow-[0_0_24px_-4px_var(--accent)]'
                    : 'bg-bg-card text-text-dim/50 border border-border cursor-not-allowed',
                )}
              >
                Submit ({answeredCount}/{totalCount})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type SheetRowProps = {
  question: JigsawPuzzle;
  qIdx: number;
  answer: number;
  submitted: boolean;
  reduced: boolean;
  onPick: (optIdx: number) => void;
};

function SheetRow({ question, qIdx, answer, submitted, reduced, onPick }: SheetRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={rowRef}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-bg-card p-3 md:p-4"
    >
      <div className="flex items-center gap-2">
        <div className="shrink-0 font-mono text-[11px] tracking-widest text-text-dim/60 w-6 text-right">
          {qIdx + 1}.
        </div>
        <div className="flex-1 min-w-0">
          <PiecePanel
            pieces={question.questionPieces}
            pieceCount={question.pieceCount}
            targetPolygon={question.targetPolygon}
            compact
          />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {question.options.map((option, i) => (
          <AssembledOptionCard
            key={i}
            option={option}
            letter={LETTERS[i]!}
            index={i}
            focused={false}
            selected={answer === i}
            isCorrect={question.correctIndex === i}
            phase={submitted ? 'revealed' : 'answering'}
            targetPolygon={question.targetPolygon}
            reduced={reduced}
            compact
            onPick={() => onPick(i)}
            onFocus={() => {}}
          />
        ))}
      </div>
    </div>
  );
}

function ScoreReadout({
  score,
  total,
  accuracy,
  onReset,
}: {
  score: number;
  total: number;
  accuracy: number;
  onReset?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-bg-card">
      <span className="text-text-dim/70">SCORE</span>
      <span className="text-text tabular-nums">
        {score}<span className="text-text-dim/60">/{total}</span>
      </span>
      <span className="text-text-dim/40">·</span>
      <span className="text-accent tabular-nums">{accuracy}%</span>
      {onReset && (
        <button
          onClick={onReset}
          disabled={total === 0}
          aria-label="Reset score"
          title="Reset score"
          className="ml-1 -mr-0.5 inline-flex items-center justify-center w-5 h-5 rounded text-text-dim/70 hover:text-wrong hover:bg-wrong/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-dim/70 transition"
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
        </button>
      )}
    </div>
  );
}

function LogoMark() {
  return (
    <svg width={28} height={28} viewBox="-12 -12 24 24" aria-hidden="true">
      <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="-8,-8 8,-8 8,8 -8,8" opacity={0.35} />
        <polygon points="-6,-6 2,-6 -2,2" />
        <polygon points="2,-4 6,3 -2,6" opacity={0.65} />
      </g>
    </svg>
  );
}

export default JigsawPuzzle;
