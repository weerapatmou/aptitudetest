import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { LogoMark } from '@/shared/LogoMark';
import { RotationPuzzle } from '@/rotation-puzzle';
import { MatchingPartsPuzzle } from '@/matching-parts-puzzle';
import { PolygonAssemblyPuzzle } from '@/polygon-assembly-puzzle';
import { NumberSeriesPuzzle } from '@/number-series-puzzle';
import { TwoDPuzzle } from '@/two-d-puzzle';
import { ApproximateCalculationPuzzle } from '@/approximate-calculation-puzzle';
import { BlockTouchingPuzzle } from '@/block-touching-puzzle';
import { CubeCountingPuzzle } from '@/cube-counting-puzzle';
import { RotatedBlockPuzzle } from '@/rotated-block-puzzle';
import { FlipBoxPuzzle } from '@/flip-box-puzzle';
import { FindingRotatedShapesPuzzle } from '@/finding-rotated-shapes-puzzle';
import { JigsawPuzzle } from '@/jigsaw-puzzle';

type Mode =
  | 'home'
  | 'rotation'
  | 'matching'
  | 'polygon-assembly'
  | 'number-series'
  | 'two-d-puzzle'
  | 'approximate-calculation'
  | 'block-touching'
  | 'cube-counting'
  | 'rotated-block'
  | 'flip-box'
  | 'finding-rotated-shapes'
  | 'jigsaw-puzzle';

const STORAGE_KEY = 'puzzle:active';

function readMode(): Mode {
  if (typeof window === 'undefined') return 'home';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (
    raw === 'rotation' ||
    raw === 'matching' ||
    raw === 'polygon-assembly' ||
    raw === 'number-series' ||
    raw === 'two-d-puzzle' ||
    raw === 'approximate-calculation' ||
    raw === 'block-touching' ||
    raw === 'cube-counting' ||
    raw === 'rotated-block' ||
    raw === 'flip-box' ||
    raw === 'finding-rotated-shapes' ||
    raw === 'jigsaw-puzzle' ||
    raw === 'home'
  )
    return raw;
  return 'home';
}

export function App() {
  const [mode, setMode] = useState<Mode>(() => readMode());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  if (mode === 'home') {
    return <HomePage onSelect={setMode} />;
  }
  return (
    <div className="relative">
      {mode === 'rotation' && (
        <RotationPuzzle difficulty="medium" onHome={() => setMode('home')} />
      )}
      {mode === 'matching' && (
        <MatchingPartsPuzzle difficulty="medium" onHome={() => setMode('home')} />
      )}
      {mode === 'polygon-assembly' && (
        <PolygonAssemblyPuzzle difficulty="medium" onHome={() => setMode('home')} />
      )}
      {mode === 'number-series' && (
        <NumberSeriesPuzzle onHome={() => setMode('home')} />
      )}
      {mode === 'two-d-puzzle' && (
        <TwoDPuzzle onHome={() => setMode('home')} />
      )}
      {mode === 'approximate-calculation' && (
        <ApproximateCalculationPuzzle onHome={() => setMode('home')} />
      )}
      {mode === 'block-touching' && (
        <BlockTouchingPuzzle onHome={() => setMode('home')} />
      )}
      {mode === 'cube-counting' && (
        <CubeCountingPuzzle onHome={() => setMode('home')} />
      )}
      {mode === 'rotated-block' && (
        <RotatedBlockPuzzle onHome={() => setMode('home')} />
      )}
      {mode === 'flip-box' && (
        <FlipBoxPuzzle onHome={() => setMode('home')} />
      )}
      {mode === 'finding-rotated-shapes' && (
        <FindingRotatedShapesPuzzle onHome={() => setMode('home')} />
      )}
      {mode === 'jigsaw-puzzle' && (
        <JigsawPuzzle onHome={() => setMode('home')} />
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TestDef = {
  id: Exclude<Mode, 'home'>;
  title: string;
  tagline: string;
  description: string;
  icon: ReactNode;
};

type CategoryDef = {
  id: string;
  label: string;
  description: string;
  accentVar: string;
  headerIcon: ReactNode;
  tests: TestDef[];
};

// ─── Score keys that persist across sessions ──────────────────────────────────

const SCORE_KEYS = ['rotation:score', 'matching:score', 'assembly:score', 'jigsaw:score'] as const;

// ─── HomePage ─────────────────────────────────────────────────────────────────

function HomePage({ onSelect }: { onSelect: (m: Mode) => void }) {
  const CATEGORIES: CategoryDef[] = [
    {
      id: '2d-spatial',
      label: '2D Spatial',
      description: 'Rotation, assembly, and shape reconstruction',
      accentVar: '--accent',
      headerIcon: (
        <svg width={20} height={20} viewBox="-12 -12 24 24" aria-hidden="true">
          <g stroke="var(--accent)" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx={0} cy={0} r={9} opacity={0.4} />
            <path d="M -6 -2 L 6 -2 L 3 -5 M 6 -2 L 3 1" />
          </g>
        </svg>
      ),
      tests: [
        {
          id: 'rotation',
          title: 'Rotation Test',
          tagline: 'Spatial Reasoning',
          description:
            'Identify which option is a pure rotation of the reference figure. Distractors include mirrors, swaps, and altered shapes.',
          icon: (
            <svg width={36} height={36} viewBox="-12 -12 24 24" aria-hidden="true">
              <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx={0} cy={0} r={10} />
                <path d="M -7 -2 L 7 -2 L 4 -5 M 7 -2 L 4 1" />
                <path d="M 7 4 L -7 4 L -4 7 M -7 4 L -4 1" opacity={0.55} />
              </g>
            </svg>
          ),
        },
        {
          id: 'matching',
          title: 'Matching Parts',
          tagline: 'Visual Assembly',
          description:
            'Choose the pair of pieces that fit together to form the reference shape. Watch out for scale and proportion errors.',
          icon: (
            <svg width={36} height={36} viewBox="-12 -12 24 24" aria-hidden="true">
              <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="-9,-2 -1,-2 -5,7" />
                <polygon points="1,-2 9,-2 5,7" opacity={0.55} />
              </g>
            </svg>
          ),
        },
        {
          id: 'polygon-assembly',
          title: 'Polygon Assembly',
          tagline: 'Spatial Construction',
          description:
            'Pick which set of 3–6 scattered pieces actually assembles into the target silhouette. Click any option to watch all five attempt assembly side-by-side.',
          icon: (
            <svg width={36} height={36} viewBox="-12 -12 24 24" aria-hidden="true">
              <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="-9,-9 9,-9 9,9 -9,9" opacity={0.35} />
                <polygon points="-7,-7 1,-7 -3,3" />
                <polygon points="3,-5 7,2 -1,5" opacity={0.7} />
              </g>
            </svg>
          ),
        },
        {
          id: 'two-d-puzzle',
          title: '2D Puzzle',
          tagline: 'Spatial Assembly',
          description:
            'A square is shown with a chunk missing. Select the combination of pieces that rotate and combine to complete it. One piece may be enough — or several together.',
          icon: (
            <svg width={36} height={36} viewBox="-12 -12 24 24" aria-hidden="true">
              <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M -9 -9 H 2 V -2 H 9 V 9 H -9 Z" />
                <path d="M 4 -9 L 10 -9 L 10 -3 Z" opacity={0.6} />
              </g>
            </svg>
          ),
        },
        {
          id: 'jigsaw-puzzle',
          title: 'Jigsaw Puzzle',
          tagline: 'Spatial Reconstruction',
          description:
            'A shape is cut into 2–5 pieces — study the given pieces, then choose which option assembles all of them together perfectly with no gaps or overlaps.',
          icon: (
            <svg width={36} height={36} viewBox="-12 -12 24 24" aria-hidden="true">
              <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="-9,-9 9,-9 9,9 -9,9" opacity={0.30} />
                <polygon points="-7,-7 1,-7 -4,2" />
                <polygon points="2,-5 7,1 1,7 -3,3" opacity={0.70} />
              </g>
            </svg>
          ),
        },
        {
          id: 'finding-rotated-shapes',
          title: 'Finding Rotated Shapes',
          tagline: 'Spatial Reasoning',
          description:
            'A single outline shape is shown. Find the one option among five that is the same outline simply turned to another angle — the rest are mirror images or have a corner moved, added, removed, stretched, or skewed.',
          icon: (
            <svg width={36} height={36} viewBox="-12 -12 24 24" aria-hidden="true">
              <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="-9,-6 -2,-9 1,-2 -4,3 -8,1" />
                <path d="M 3 7 q 6 -2 6 -8 M 9 -1 l 0 -4 l -4 1" opacity={0.7} />
              </g>
            </svg>
          ),
        },
      ],
    },
    {
      id: '3d-spatial',
      label: '3D Spatial',
      description: 'Block counting, face touching, and cube folding',
      accentVar: '--accent-warm',
      headerIcon: (
        <svg width={20} height={20} viewBox="-12 -12 24 24" aria-hidden="true">
          <g stroke="var(--accent-warm)" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 0 -9 L 9 -4 L 0 1 L -9 -4 Z" />
            <path d="M -9 -4 L -9 4 L 0 9 L 0 1" />
            <path d="M 9 -4 L 9 4 L 0 9" opacity={0.5} />
          </g>
        </svg>
      ),
      tests: [
        {
          id: 'block-touching',
          title: 'Block Touching',
          tagline: '3D Spatial Reasoning',
          description:
            'Equal-sized blocks are stacked in 3D. For each labelled block, count how many of its six faces sit flat against another block — edges and corners never count.',
          icon: (
            <svg width={36} height={36} viewBox="-12 -12 24 24" aria-hidden="true">
              <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 0 -9 L 9 -4 L 0 1 L -9 -4 Z" />
                <path d="M -9 -4 L -9 5 L 0 10 L 0 1 Z" />
                <path d="M 9 -4 L 9 5 L 0 10 L 0 1 Z" opacity={0.55} />
              </g>
            </svg>
          ),
        },
        {
          id: 'cube-counting',
          title: 'Block Counting',
          tagline: '3D Spatial Reasoning',
          description:
            'Equal-sized cubes are stacked in 3D. Count how many cubes there are in total — including the hidden ones underneath that support what you can see.',
          icon: (
            <svg width={36} height={36} viewBox="-12 -12 24 24" aria-hidden="true">
              <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 0 -9 L 9 -4 L 0 1 L -9 -4 Z" />
                <path d="M -9 -4 L -9 5 L 0 10 L 0 1 Z" />
                <path d="M 9 -4 L 9 5 L 0 10 L 0 1 Z" opacity={0.4} />
                <text x={0} y={-2} fontSize={7} fill="var(--accent)" stroke="none" textAnchor="middle">
                  ?
                </text>
              </g>
            </svg>
          ),
        },
        {
          id: 'rotated-block',
          title: 'Rotated Blocks',
          tagline: '3D Spatial Visualization',
          description:
            'A 3D block is shown. Find the one choice among five that is the same block rotated to a different angle — the rest are mirror images or have a block moved, added, removed, or stretched.',
          icon: (
            <svg width={36} height={36} viewBox="-12 -12 24 24" aria-hidden="true">
              <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 0 -9 L 9 -4 L 9 5 L 0 10 L -9 5 L -9 -4 Z" />
                <path d="M 0 -9 L 0 1 M 0 1 L 9 -4 M 0 1 L -9 -4" opacity={0.55} />
                <path d="M -7 8 q 4 3 8 0" opacity={0.7} />
                <path d="M 1 8 l 3 0 l -1 -2" opacity={0.7} />
              </g>
            </svg>
          ),
        },
        {
          id: 'flip-box',
          title: 'Flip Box',
          tagline: '3D Spatial Reasoning',
          description:
            'A marked cube is turned and flipped through a sequence of commands. Track the mark in your head and pick which of six choices shows where it ends up — replay each step on reveal.',
          icon: (
            <svg width={36} height={36} viewBox="-12 -12 24 24" aria-hidden="true">
              <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 0 -9 L 9 -4 L 9 5 L 0 10 L -9 5 L -9 -4 Z" />
                <path d="M 0 -9 L 0 1 M 0 1 L 9 -4 M 0 1 L -9 -4" opacity={0.5} />
                <path d="M -4 -4 L 4 -4 M 0 -8 L 0 0" opacity={0.95} />
                <path d="M 6 8 q 4 1 6 -3 M 12 5 l 0 3 l -3 -1" opacity={0.75} />
              </g>
            </svg>
          ),
        },
      ],
    },
    {
      id: 'numerical',
      label: 'Numerical',
      description: 'Number sequences and mental estimation',
      accentVar: '--correct',
      headerIcon: (
        <svg width={20} height={20} viewBox="-12 -12 24 24" aria-hidden="true">
          <g stroke="var(--correct)" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" fontFamily="ui-monospace, monospace">
            <text x={-8} y={3} fontSize={5} fill="var(--correct)" stroke="none" opacity={0.7}>2</text>
            <text x={-2} y={3} fontSize={5} fill="var(--correct)" stroke="none" opacity={0.7}>4</text>
            <text x={4} y={3} fontSize={5} fill="var(--correct)" stroke="none" opacity={0.7}>8</text>
            <text x={8} y={3} fontSize={5} fill="var(--correct)" stroke="none">?</text>
          </g>
        </svg>
      ),
      tests: [
        {
          id: 'number-series',
          title: 'Number Series',
          tagline: 'Numerical Reasoning',
          description:
            'Spot the rule behind a sequence and pick the missing number. Difficulty ramps from simple arithmetic to layered recurrences and interleaved sequences.',
          icon: (
            <svg width={36} height={36} viewBox="-12 -12 24 24" aria-hidden="true">
              <g
                stroke="var(--accent)"
                strokeWidth={1.6}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                fontFamily="ui-monospace, monospace"
              >
                <text x={-9} y={3} fontSize={6} fill="var(--accent)" stroke="none" opacity={0.75}>
                  2
                </text>
                <text x={-3} y={3} fontSize={6} fill="var(--accent)" stroke="none" opacity={0.75}>
                  4
                </text>
                <text x={3} y={3} fontSize={6} fill="var(--accent)" stroke="none" opacity={0.75}>
                  8
                </text>
                <text x={9} y={3} fontSize={6} fill="var(--accent)" stroke="none">
                  ?
                </text>
                <rect x={7} y={-3} width={6} height={8} rx={1} opacity={0.7} />
              </g>
            </svg>
          ),
        },
        {
          id: 'approximate-calculation',
          title: 'Approximate Calculation',
          tagline: 'Numerical Estimation',
          description:
            'Word problems with numbers nudged just off round values. Round, estimate in your head, and pick the closest of five answers — speed, area, percentages, interest and more.',
          icon: (
            <svg width={36} height={36} viewBox="-12 -12 24 24" aria-hidden="true">
              <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M -8 -4 q 4 -5 8 0 t 8 0" />
                <path d="M -8 4 q 4 -5 8 0 t 8 0" opacity={0.55} />
              </g>
            </svg>
          ),
        },
      ],
    },
  ];

  const [stats] = useState<{ total: number; correct: number } | null>(() => {
    if (typeof window === 'undefined') return null;
    let total = 0;
    let correct = 0;
    for (const key of SCORE_KEYS) {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const v = JSON.parse(raw) as { correct: number; total: number };
        total += v.total ?? 0;
        correct += v.correct ?? 0;
      } catch {}
    }
    return total > 0 ? { total, correct } : null;
  });

  return (
    <div className="min-h-full bg-instrument">
      <header className="border-b border-border bg-bg/85 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          <LogoMark />
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim leading-tight">
            <div className="text-text">TG Aptitude Practice</div>
            <div className="text-[10px] text-text-dim/70">Select a test to begin</div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-10 md:py-16 space-y-14">
        {/* Hero */}
        <div className="text-center">
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-text mb-3">
            Choose your practice test
          </h1>
          <p className="text-text-dim text-sm md:text-base max-w-xl mx-auto mb-6">
            12 modules across spatial and numerical reasoning — randomised, timed, and self-scoring.
          </p>
          {stats && <StatsRow stats={stats} />}
        </div>

        {/* Category sections */}
        {CATEGORIES.map((cat) => (
          <CategorySection key={cat.id} category={cat} onSelect={onSelect} />
        ))}
      </main>
    </div>
  );
}

// ─── StatsRow ─────────────────────────────────────────────────────────────────

function StatsRow({ stats }: { stats: { total: number; correct: number } }) {
  const accuracy = Math.round((stats.correct / stats.total) * 100);
  return (
    <div className="inline-flex items-center gap-5 rounded-xl border border-border bg-bg-card px-6 py-3">
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-display text-xl font-semibold text-text tabular-nums">{stats.total}</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-dim">Questions</span>
      </div>
      <div className="w-px h-8 bg-border" />
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-display text-xl font-semibold text-correct tabular-nums">{accuracy}%</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-dim">Accuracy</span>
      </div>
      <div className="w-px h-8 bg-border" />
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-display text-xl font-semibold text-accent tabular-nums">{stats.correct}</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-dim">Correct</span>
      </div>
    </div>
  );
}

// ─── CategorySection ──────────────────────────────────────────────────────────

function CategorySection({
  category,
  onSelect,
}: {
  category: CategoryDef;
  onSelect: (m: Mode) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <section>
      <motion.div
        initial={reduced ? false : { x: -20, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={reduced ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
        className="flex items-center gap-3 mb-5"
      >
        <div
          className="w-[3px] h-8 rounded-full shrink-0"
          style={{ background: `var(${category.accentVar})` }}
        />
        <div className="shrink-0">{category.headerIcon}</div>
        <div>
          <div
            className="font-mono text-[9px] uppercase tracking-[0.2em] mb-0.5"
            style={{ color: `var(${category.accentVar})` }}
          >
            {category.tests.length} modules
          </div>
          <h2 className="font-display text-xl font-semibold text-text leading-none">
            {category.label}
          </h2>
        </div>
        <p className="ml-1 text-text-dim text-sm hidden sm:block">— {category.description}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {category.tests.map((test, index) => (
          <TestCard
            key={test.id}
            test={test}
            accentVar={category.accentVar}
            index={index}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

// ─── TestCard ─────────────────────────────────────────────────────────────────

function TestCard({
  test,
  accentVar,
  index,
  onSelect,
}: {
  test: TestDef;
  accentVar: string;
  index: number;
  onSelect: (m: Mode) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.button
      onClick={() => onSelect(test.id)}
      initial={reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={reduced ? { duration: 0 } : { delay: index * 0.05, duration: 0.28, ease: 'easeOut' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 0 32px -8px var(${accentVar})`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '';
      }}
      style={
        {
          borderLeftColor: `var(${accentVar})`,
          '--cat-accent': `var(${accentVar})`,
        } as React.CSSProperties
      }
      className="group relative text-left rounded-xl border border-border bg-bg-card hover:bg-bg-card-hover card-focus-ring border-l-[3px] flex flex-col overflow-hidden transition-colors duration-200 w-full"
    >
      {/* Main row */}
      <div className="flex items-start gap-3 p-4 md:p-5">
        <div className="shrink-0 rounded-lg border border-border bg-bg/40 p-2 group-hover:border-border-strong transition-colors">
          {test.icon}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div
            className="font-mono text-[9px] uppercase tracking-[0.2em] mb-1 transition-opacity"
            style={{ color: `var(${accentVar})` }}
          >
            {test.tagline}
          </div>
          <div className="font-display text-base font-semibold text-text leading-snug">
            {test.title}
          </div>
        </div>
      </div>

      {/* Description — revealed on hover */}
      <div className="max-h-0 overflow-hidden transition-all duration-300 ease-in-out group-hover:max-h-28 px-4 md:px-5">
        <div className="pb-3 text-text-dim text-xs leading-relaxed border-t border-border pt-2">
          {test.description}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-4 md:px-5 pb-3 pt-1 flex items-center justify-end">
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim group-hover:[color:var(--cat-accent)] transition-colors">
          Start →
        </span>
      </div>
    </motion.button>
  );
}

export default App;
