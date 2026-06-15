import type { Arrangement, Choice, DistractorKind } from '../types';
import type { Rng } from './rng';
import { totalCubes, visibleCubes, footprintCubes, faceTiles } from './counting';

type Candidate = { value: number; kind: DistractorKind; rationale: string };

/**
 * Build 4 numeric choices (3 distractors + the correct total), shuffled.
 * The strongest trap is `visible-only`: counting just the cubes you can see and
 * forgetting the hidden support cubes underneath.
 */
export function buildOptions(a: Arrangement, rng: Rng): Choice[] {
  const total = totalCubes(a);
  const visible = visibleCubes(a);
  const footprint = footprintCubes(a);
  const tiles = faceTiles(a);

  // `visible-only` is the signature trap (forgetting hidden support cubes), so
  // it leads the pool whenever it's usable. The rest of the pool is shuffled so
  // the wrong-answer set varies from question to question instead of always
  // landing on the same first-three.
  const lead: Candidate = {
    value: visible,
    kind: 'visible-only',
    rationale: 'Counted only visible cubes, forgetting the hidden ones inside and behind',
  };
  const rest: Candidate[] = rng.shuffle([
    {
      value: footprint,
      kind: 'footprint-only',
      rationale: 'Counted only the columns (top surface) without multiplying by each column\'s height',
    },
    {
      value: total + (rng.bool() ? 1 : -1),
      kind: 'off-by-one',
      rationale: 'Off by 1 — counted one too many or one too few',
    },
    {
      value: total + (rng.bool() ? 2 : -2),
      kind: 'off-by-two',
      rationale: 'Off by 2 — often from miscounting obscured columns',
    },
    {
      value: tiles,
      kind: 'face-tiles',
      rationale: 'Counted visible square faces instead of cubes',
    },
    {
      value: visible + footprint,
      kind: 'visible-plus-footprint',
      rationale: 'Double-counted — added visible cubes plus column count, inflating the total',
    },
  ]);
  const pool: Candidate[] = [lead, ...rest];

  const used = new Set<number>([total]);
  const distractors: Candidate[] = [];
  for (const c of pool) {
    if (distractors.length >= 3) break;
    if (c.value >= 1 && !used.has(c.value)) {
      used.add(c.value);
      distractors.push(c);
    }
  }

  // Top up with synthetic close-misses if the structure didn't yield 3 distinct.
  let delta = 3;
  while (distractors.length < 3) {
    for (const v of [total + delta, total - delta]) {
      if (distractors.length >= 3) break;
      if (v >= 1 && !used.has(v)) {
        used.add(v);
        distractors.push({
          value: v,
          kind: 'off-by-two',
          rationale: 'Close but not correct — recount each layer and column carefully',
        });
      }
    }
    delta++;
  }

  const choices: Choice[] = [
    {
      value: total,
      isCorrect: true,
      kind: 'correct',
      rationale: 'Includes all visible cubes plus the hidden support cubes underneath',
    },
    ...distractors.map<Choice>((d) => ({
      value: d.value,
      isCorrect: false,
      kind: d.kind,
      rationale: d.rationale,
    })),
  ];

  return rng.shuffle(choices);
}
