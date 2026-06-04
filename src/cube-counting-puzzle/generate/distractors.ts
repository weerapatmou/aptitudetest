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

  // Priority-ordered distractor pool. First three usable ones are kept.
  const pool: Candidate[] = [
    {
      value: visible,
      kind: 'visible-only',
      rationale: 'นับเฉพาะก้อนที่มองเห็น ลืมก้อนที่ซ่อนอยู่ข้างในและข้างหลัง',
    },
    {
      value: footprint,
      kind: 'footprint-only',
      rationale: 'นับแค่จำนวนเสา (ผิวด้านบน) โดยไม่ได้คูณความสูงของแต่ละเสา',
    },
    {
      value: total + (rng.bool() ? 1 : -1),
      kind: 'off-by-one',
      rationale: 'พลาดไป 1 ก้อน — นับเกินหรือขาดไปหนึ่งก้อน',
    },
    {
      value: total + (rng.bool() ? 2 : -2),
      kind: 'off-by-two',
      rationale: 'พลาดไป 2 ก้อน — มักเกิดจากการนับเสาที่ถูกบังผิด',
    },
    {
      value: tiles,
      kind: 'face-tiles',
      rationale: 'นับจำนวนหน้าสี่เหลี่ยมที่มองเห็น แทนที่จะนับก้อนลูกบาศก์',
    },
  ];

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
          rationale: 'ใกล้เคียงคำตอบแต่ไม่ถูก — ลองนับชั้นและเสาให้ครบอีกครั้ง',
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
      rationale: 'รวมก้อนที่มองเห็นและก้อนที่ซ่อนอยู่ข้างใต้เพื่อรองรับทั้งหมด',
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
