import type { ApproxProblem } from '../../types';
import type { Rng } from '../rng';
import { fmt, messyNear, roundDec } from '../messy';

export type ProblemGenerator = (rng: Rng) => ApproxProblem;

// A small bank of names to vary the prompts, in the spirit of the source material.
const NAMES = [
  'Somchai',
  'Napha',
  'Manoch',
  'Kanda',
  'Weera',
  'Suda',
  'Anan',
  'Pim',
] as const;
const name = (rng: Rng) => rng.pick(NAMES);

// ─────────────────────────────────────────────────────────────────────────────
// Single operation
// ─────────────────────────────────────────────────────────────────────────────

export const speed: ProblemGenerator = (rng) => {
  const roundDist = rng.pick([300, 500, 600, 750, 900] as const);
  const time = rng.int(2, 7); // 2..6 hours
  const dist = messyNear(rng, roundDist, { decimals: 0 });
  const estimate = Math.round(roundDist / time);
  const vehicle = rng.pick(['car', 'train', 'bus'] as const);
  return {
    kind: 'speed',
    prompt: `A ${vehicle} travels ${fmt(dist)} kilometers in ${time} hours. Estimate its average speed.`,
    unit: 'km/hr',
    exactValue: dist / time,
    estimateValue: estimate,
    mentalLogic: `${fmt(dist)} ≈ ${fmt(roundDist)}, so ${fmt(roundDist)} ÷ ${time} ≈ ${estimate} km/hr.`,
    formula: 'speed = distance ÷ time',
    precision: 0,
  };
};

export const unitPrice: ProblemGenerator = (rng) => {
  const roundPrice = rng.pick([5, 12, 15, 20, 25] as const);
  const roundQty = rng.pick([10, 19, 20, 30] as const);
  const price = messyNear(rng, roundPrice, { decimals: 2 });
  const qty = rng.bool() ? roundQty : roundQty - 1;
  const estimate = roundPrice * roundQty;
  const who = name(rng);
  const item = rng.pick(['shirts', 'notebooks', 'mugs', 'books'] as const);
  return {
    kind: 'unit-price',
    prompt: `${who} bought ${qty} ${item} for $${price.toFixed(2)} each. About how much was spent in total?`,
    unit: '$',
    exactValue: qty * price,
    estimateValue: estimate,
    mentalLogic: `≈ ${roundQty} × $${roundPrice} = $${fmt(estimate)}.`,
    formula: 'total = quantity × unit price',
    precision: 0,
  };
};

export const rowsTimesPerRow: ProblemGenerator = (rng) => {
  const rows = rng.int(18, 31); // 18..30
  const roundPerRow = rng.pick([10, 20, 30] as const);
  const perRow = roundPerRow - 1; // e.g. 19, 29
  const estimate = rows * roundPerRow;
  return {
    kind: 'rows-times-per-row',
    prompt: `An assembly hall sets up ${rows} rows of chairs with ${perRow} chairs in each row. About how many chairs are there in total?`,
    unit: 'chairs',
    exactValue: rows * perRow,
    estimateValue: estimate,
    mentalLogic: `≈ ${rows} × ${roundPerRow} = ${fmt(estimate)}.`,
    formula: 'total = rows × chairs per row',
    precision: 0,
  };
};

export const divisionPerUnit: ProblemGenerator = (rng) => {
  const quotient = rng.pick([200, 300, 400, 500] as const); // the clean answer
  const divisor = rng.pick([19, 29, 39, 49] as const);
  const cleanDivisor = divisor + 1; // rounds up to 20, 30, 40, 50
  // Total near (answer × clean divisor) so rounding the inputs lands on `quotient`.
  const total = messyNear(rng, quotient * cleanDivisor, { decimals: 0 });
  return {
    kind: 'division-per-unit',
    prompt: `A library has ${fmt(total)} books to arrange equally onto ${divisor} shelves. About how many books will fit on each shelf?`,
    unit: 'books',
    exactValue: total / divisor,
    estimateValue: quotient,
    mentalLogic: `≈ ${fmt(quotient * cleanDivisor)} ÷ ${cleanDivisor} = ${fmt(quotient)}.`,
    formula: 'per shelf = total ÷ shelves',
    precision: 0,
  };
};

export const percentageOf: ProblemGenerator = (rng) => {
  const total = rng.pick([4000, 6000, 8000, 9000, 12000] as const);
  const roundPct = rng.pick([10, 15, 20, 25] as const);
  const pct = messyNear(rng, roundPct, { decimals: 2 });
  const estimate = Math.round((total * roundPct) / 100);
  return {
    kind: 'percentage-of',
    prompt: `A company has ${fmt(total)} employees. If ${pct.toFixed(2)}% of them work remotely, about how many work remotely?`,
    unit: 'employees',
    exactValue: (total * pct) / 100,
    estimateValue: estimate,
    mentalLogic: `≈ ${roundPct}% of ${fmt(total)} = ${fmt(estimate)}.`,
    formula: 'part = percent × total',
    precision: 0,
  };
};

export const areaSquare: ProblemGenerator = (rng) => {
  const roundSide = rng.pick([10, 12, 15, 20] as const);
  const side = messyNear(rng, roundSide, { decimals: 1 });
  const estimate = roundSide * roundSide;
  return {
    kind: 'area-square',
    prompt: `A square garden plot has a side length of ${side} meters. What is its approximate area?`,
    unit: 'm²',
    exactValue: side * side,
    estimateValue: estimate,
    mentalLogic: `≈ ${roundSide} × ${roundSide} = ${fmt(estimate)} m².`,
    formula: 'area = side²',
    precision: 0,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Two operations / complement / markup
// ─────────────────────────────────────────────────────────────────────────────

export const areaRectangle: ProblemGenerator = (rng) => {
  const roundW = rng.pick([3, 4, 5] as const);
  const roundL = rng.pick([5, 6, 8] as const);
  const w = messyNear(rng, roundW, { decimals: 1 });
  const l = messyNear(rng, roundL, { decimals: 1 });
  const estimate = roundW * roundL;
  return {
    kind: 'area-rectangle',
    prompt: `A rug is ${w} meters wide and ${l} meters long. What is its approximate area?`,
    unit: 'm²',
    exactValue: w * l,
    estimateValue: estimate,
    mentalLogic: `≈ ${roundW} × ${roundL} = ${fmt(estimate)} m².`,
    formula: 'area = width × length',
    precision: 0,
  };
};

export const percentageComplement: ProblemGenerator = (rng) => {
  const total = messyNear(rng, rng.pick([12000, 15000, 18000, 20000] as const), {
    decimals: 0,
  });
  const roundTotal = Math.round(total / 1000) * 1000;
  const roundFilled = rng.pick([80, 85, 90] as const);
  const filledPct = messyNear(rng, roundFilled, { decimals: 2 });
  const emptyRoundPct = 100 - roundFilled;
  const estimate = Math.round((roundTotal * emptyRoundPct) / 100);
  return {
    kind: 'percentage-complement',
    prompt: `A stadium has ${fmt(total)} seats. If ${filledPct.toFixed(2)}% of the seats are filled for a game, about how many seats are empty?`,
    unit: 'seats',
    exactValue: (total * (100 - filledPct)) / 100,
    estimateValue: estimate,
    mentalLogic: `Empty ≈ ${emptyRoundPct}% of ${fmt(roundTotal)} = ${fmt(estimate)}.`,
    formula: 'empty = (100 − filled%) × total',
    precision: 0,
  };
};

export const profitMarkup: ProblemGenerator = (rng) => {
  const roundCost = rng.pick([3, 4, 5] as const);
  const cost = messyNear(rng, roundCost, { decimals: 2 });
  const roundQty = rng.pick([1500, 2000, 2500] as const);
  const qty = messyNear(rng, roundQty, { decimals: 0 });
  const markup = rng.pick([10, 20, 25] as const);
  const estimate = Math.round((roundQty * roundCost * markup) / 100);
  return {
    kind: 'profit-markup',
    prompt: `A store orders ${fmt(qty)} items at a wholesale cost of $${cost.toFixed(2)} each. If it wants a profit of about ${markup}% on the total purchase, how much is the profit?`,
    unit: '$',
    exactValue: (qty * cost * markup) / 100,
    estimateValue: estimate,
    mentalLogic: `Cost ≈ ${fmt(roundQty)} × $${roundCost} = $${fmt(roundQty * roundCost)}; ${markup}% of that = $${fmt(estimate)}.`,
    formula: 'profit = total cost × markup%',
    precision: 0,
  };
};

export const howManyFit: ProblemGenerator = (rng) => {
  const roundPer = rng.pick([0.4, 0.5] as const);
  const per = messyNear(rng, roundPer, { decimals: 2 });
  const roundTotal = rng.pick([20, 25, 30] as const);
  const total = messyNear(rng, roundTotal, { decimals: 1 });
  const estimate = Math.round(roundTotal / roundPer);
  const item = rng.pick(['loaves of bread', 'trays of pies', 'cakes'] as const);
  return {
    kind: 'how-many-fit',
    prompt: `A baker uses ${per} kilograms of flour per item. With ${total} kilograms of flour, about how many ${item} can be made?`,
    unit: 'items',
    exactValue: Math.floor(total / per),
    estimateValue: estimate,
    mentalLogic: `≈ ${roundTotal} ÷ ${roundPer} = ${fmt(estimate)}.`,
    formula: 'count = total ÷ per item',
    precision: 0,
  };
};

export const timeToFinish: ProblemGenerator = (rng) => {
  const roundPer = rng.pick([20, 200] as const);
  const per = roundPer - 1; // 19 or 199
  const periods = rng.pick([15, 20, 25] as const);
  const total = messyNear(rng, roundPer * periods, { decimals: 0 });
  const estimate = Math.round((roundPer * periods) / roundPer);
  const ctx =
    roundPer === 20
      ? {
          prompt: `A book has ${fmt(total)} pages. If ${name(rng)} reads ${per} pages a day, about how many days will it take to finish?`,
          unit: 'days',
        }
      : {
          prompt: `A store has ${fmt(total)} items in stock and sells about ${per} items every day. About how many days will the stock last?`,
          unit: 'days',
        };
  return {
    kind: 'time-to-finish',
    prompt: ctx.prompt,
    unit: ctx.unit,
    exactValue: total / per,
    estimateValue: estimate,
    mentalLogic: `≈ ${fmt(roundPer * periods)} ÷ ${roundPer} = ${fmt(estimate)}.`,
    formula: 'periods = total ÷ per period',
    precision: 0,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Multi-step / unit conversion
// ─────────────────────────────────────────────────────────────────────────────

export const rateChain: ProblemGenerator = (rng) => {
  const rRound = rng.pick([15, 20, 25] as const);
  const hRound = rng.pick([8, 10] as const);
  const dRound = rng.pick([5, 6] as const);
  const rate = messyNear(rng, rRound, { decimals: 1 });
  const hours = messyNear(rng, hRound, { decimals: 1 });
  const days = messyNear(rng, dRound, { decimals: 1 });
  const estimate = rRound * hRound * dRound;
  return {
    kind: 'rate-chain',
    prompt: `A crew lays ${rate} meters of pipe per hour, working ${hours} hours a day for ${days} days. About how many meters will they lay in total?`,
    unit: 'm',
    exactValue: rate * hours * days,
    estimateValue: estimate,
    mentalLogic: `≈ ${rRound} × ${hRound} × ${dRound} = ${fmt(estimate)} (slightly under, as each factor is a touch lower).`,
    formula: 'total = rate × hours/day × days',
    precision: 0,
  };
};

export const volumeBox: ProblemGenerator = (rng) => {
  const wR = rng.pick([2, 3] as const);
  const lR = rng.pick([4, 5] as const);
  const hR = rng.pick([2, 3] as const);
  const w = messyNear(rng, wR, { decimals: 1 });
  const l = messyNear(rng, lR, { decimals: 1 });
  const h = messyNear(rng, hR, { decimals: 2 });
  const estimate = wR * lR * hR;
  return {
    kind: 'volume-box',
    prompt: `A rectangular water tank is ${w} meters wide, ${l} meters long, and ${h} meters high. What is its approximate capacity?`,
    unit: 'm³',
    exactValue: w * l * h,
    estimateValue: estimate,
    mentalLogic: `≈ ${wR} × ${lR} × ${hR} = ${fmt(estimate)} m³.`,
    formula: 'volume = width × length × height',
    precision: 0,
  };
};

export const simpleInterest: ProblemGenerator = (rng) => {
  const pRound = rng.pick([3000, 4000, 5000, 6000] as const);
  const principal = messyNear(rng, pRound, { decimals: 0 });
  const rRound = rng.pick([6, 8, 10] as const);
  const rate = messyNear(rng, rRound, { decimals: 2 });
  const tRound = rng.pick([2, 3] as const);
  const time = messyNear(rng, tRound, { decimals: 2 });
  const estimate = Math.round((pRound * rRound * tRound) / 100);
  return {
    kind: 'simple-interest',
    prompt: `An investment of $${fmt(principal)} earns an annual simple interest rate of ${rate.toFixed(2)}%. About how much total interest will it earn in ${time.toFixed(2)} years?`,
    unit: '$',
    exactValue: (principal * rate * time) / 100,
    estimateValue: estimate,
    mentalLogic: `≈ $${fmt(pRound)} × ${rRound}% × ${tRound} = $${fmt(estimate)}.`,
    formula: 'interest = principal × rate × time',
    precision: 0,
  };
};

export const roundTripTime: ProblemGenerator = (rng) => {
  const speedRound = rng.pick([30, 45, 60] as const);
  const distRound = rng.pick([10, 15, 20] as const);
  const speed = messyNear(rng, speedRound, { decimals: 2 });
  const dist = messyNear(rng, distRound, { decimals: 2 });
  const totalDist = 2 * distRound;
  const estimate = Math.round((totalDist / speedRound) * 60); // minutes
  return {
    kind: 'round-trip-time',
    prompt: `A delivery drone flies at ${speed.toFixed(2)} km/hr to a drop-off zone ${dist.toFixed(2)} kilometers away and then flies back. Estimate the total round-trip time in minutes.`,
    unit: 'min',
    exactValue: ((2 * dist) / speed) * 60,
    estimateValue: estimate,
    mentalLogic: `Round trip ≈ ${totalDist} km ÷ ${speedRound} km/hr = ${roundDec(totalDist / speedRound, 2)} hr ≈ ${estimate} min.`,
    formula: 'time = distance ÷ speed (then ×60 for minutes)',
    precision: 0,
  };
};

export const fuelRange: ProblemGenerator = (rng) => {
  const tank = rng.pick([40, 50, 60] as const);
  const consRound = rng.pick([8, 10] as const);
  const cons = messyNear(rng, consRound, { decimals: 1 }); // litres per 100 km
  const estimate = Math.round((tank / consRound) * 100);
  return {
    kind: 'fuel-range',
    prompt: `A car's fuel tank holds ${tank} liters and the car uses ${cons} liters per 100 kilometers. About how far can it travel on a full tank?`,
    unit: 'km',
    exactValue: (tank / cons) * 100,
    estimateValue: estimate,
    mentalLogic: `≈ ${tank} ÷ ${consRound} = ${roundDec(tank / consRound, 1)}; ×100 km ≈ ${fmt(estimate)} km.`,
    formula: 'range = (tank ÷ consumption) × 100',
    precision: 0,
  };
};

export const ALL_GENERATORS: ProblemGenerator[] = [
  speed,
  unitPrice,
  rowsTimesPerRow,
  divisionPerUnit,
  percentageOf,
  areaSquare,
  areaRectangle,
  percentageComplement,
  profitMarkup,
  howManyFit,
  timeToFinish,
  rateChain,
  volumeBox,
  simpleInterest,
  roundTripTime,
  fuelRange,
];
