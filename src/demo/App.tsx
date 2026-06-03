import { useEffect, useState, type ReactNode } from 'react';
import { RotationPuzzle } from '@/rotation-puzzle';
import { MatchingPartsPuzzle } from '@/matching-parts-puzzle';
import { PolygonAssemblyPuzzle } from '@/polygon-assembly-puzzle';
import { NumberSeriesPuzzle } from '@/number-series-puzzle';
import { TwoDPuzzle } from '@/two-d-puzzle';
import { ApproximateCalculationPuzzle } from '@/approximate-calculation-puzzle';

type Mode =
  | 'home'
  | 'rotation'
  | 'matching'
  | 'polygon-assembly'
  | 'number-series'
  | 'two-d-puzzle'
  | 'approximate-calculation';

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
    </div>
  );
}

function HomePage({ onSelect }: { onSelect: (m: Mode) => void }) {
  const tests: Array<{
    id: Exclude<Mode, 'home'>;
    title: string;
    tagline: string;
    description: string;
    icon: ReactNode;
  }> = [
    {
      id: 'rotation',
      title: 'Rotation Test',
      tagline: 'Spatial Reasoning',
      description:
        'Identify which option is a pure rotation of the reference figure. Distractors include mirrors, swaps, and altered shapes.',
      icon: (
        <svg width={48} height={48} viewBox="-12 -12 24 24" aria-hidden="true">
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
        <svg width={48} height={48} viewBox="-12 -12 24 24" aria-hidden="true">
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
        <svg width={48} height={48} viewBox="-12 -12 24 24" aria-hidden="true">
          <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="-9,-9 9,-9 9,9 -9,9" opacity={0.35} />
            <polygon points="-7,-7 1,-7 -3,3" />
            <polygon points="3,-5 7,2 -1,5" opacity={0.7} />
          </g>
        </svg>
      ),
    },
    {
      id: 'number-series',
      title: 'Number Series',
      tagline: 'Numerical Reasoning',
      description:
        'Spot the rule behind a sequence and pick the missing number. Difficulty ramps from simple arithmetic to layered recurrences and interleaved sequences.',
      icon: (
        <svg width={48} height={48} viewBox="-12 -12 24 24" aria-hidden="true">
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
      id: 'two-d-puzzle',
      title: '2D Puzzle',
      tagline: 'Spatial Assembly',
      description:
        'A square is shown with a chunk missing. Select the combination of pieces that rotate and combine to complete it. One piece may be enough — or several together.',
      icon: (
        <svg width={48} height={48} viewBox="-12 -12 24 24" aria-hidden="true">
          <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M -9 -9 H 2 V -2 H 9 V 9 H -9 Z" />
            <path d="M 4 -9 L 10 -9 L 10 -3 Z" opacity={0.6} />
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
        <svg width={48} height={48} viewBox="-12 -12 24 24" aria-hidden="true">
          <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M -8 -4 q 4 -5 8 0 t 8 0" />
            <path d="M -8 4 q 4 -5 8 0 t 8 0" opacity={0.55} />
          </g>
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-full bg-instrument">
      <header className="border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          <svg width={28} height={28} viewBox="-12 -12 24 24" aria-hidden="true">
            <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="-9,-2 -1,-2 -5,7" />
              <polygon points="1,-2 9,-2 5,7" opacity={0.55} />
            </g>
          </svg>
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim leading-tight">
            <div className="text-text">TG Aptitude Practice</div>
            <div className="text-[10px] text-text-dim/70">Select a test to begin</div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-10 md:py-16">
        <div className="mb-10 text-center">
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-text mb-3">
            Choose your practice test
          </h1>
          <p className="text-text-dim text-sm md:text-base max-w-xl mx-auto">
            Sharpen pattern recognition and spatial reasoning with timed, randomized exercises.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {tests.map((test) => (
            <button
              key={test.id}
              onClick={() => onSelect(test.id)}
              className="group relative text-left rounded-2xl border border-border bg-bg-card p-6 md:p-7 transition hover:bg-bg-card-hover hover:border-accent/40 hover:shadow-[0_0_40px_-12px_var(--accent)] card-focus-ring"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-xl border border-border bg-bg/40 p-3 group-hover:border-accent/30 transition-colors">
                  {test.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-1">
                    {test.tagline}
                  </div>
                  <div className="font-display text-xl md:text-2xl font-semibold text-text mb-2">
                    {test.title}
                  </div>
                  <div className="text-text-dim text-sm leading-relaxed">
                    {test.description}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end font-mono text-[11px] uppercase tracking-wider text-text-dim group-hover:text-accent transition-colors">
                Start →
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
