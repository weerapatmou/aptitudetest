import type { ApproxProblem } from '../../types';
import type { Rng } from '../rng';
import { fmt, messyNear, roundDec } from '../messy';

export type ProblemGenerator = (rng: Rng) => ApproxProblem;

// A bank of names to vary the prompts, in the spirit of the source material.
const NAMES = [
  'Somchai',
  'Napha',
  'Manoch',
  'Kanda',
  'Weera',
  'Suda',
  'Anan',
  'Pim',
  'Niran',
  'Ploy',
  'Krit',
  'Mali',
  'Decha',
  'Wan',
  'Arthit',
  'Bua',
  'Chai',
  'Dao',
  'Ekkachai',
  'Fon',
  'Kamol',
  'Lalita',
  'Prasert',
  'Rung',
  'Sunan',
  'Thanon',
  'Ubon',
  'Yupha',
] as const;
const name = (rng: Rng) => rng.pick(NAMES);

// ─────────────────────────────────────────────────────────────────────────────
// Single operation
// ─────────────────────────────────────────────────────────────────────────────

export const speed: ProblemGenerator = (rng) => {
  const roundDist = rng.pick([300, 400, 500, 600, 720, 750, 800, 900] as const);
  const time = rng.int(2, 7); // 2..6 hours
  const dist = messyNear(rng, roundDist, { decimals: 0 });
  const estimate = Math.round(roundDist / time);
  const vehicle = rng.pick([
    'car',
    'train',
    'bus',
    'truck',
    'ferry',
    'coach',
    'van',
    'motorcycle',
  ] as const);
  const prompt = rng.pick([
    `A ${vehicle} travels ${fmt(dist)} kilometers in ${time} hours. Estimate its average speed.`,
    `Over ${time} hours a ${vehicle} covers ${fmt(dist)} kilometers. About what is its average speed?`,
    `A ${vehicle} drives ${fmt(dist)} kilometers, and the trip takes ${time} hours. Roughly how fast was it going?`,
  ]);
  return {
    kind: 'speed',
    prompt,
    unit: 'km/hr',
    exactValue: dist / time,
    estimateValue: estimate,
    mentalLogic: `${fmt(dist)} ≈ ${fmt(roundDist)}, so ${fmt(roundDist)} ÷ ${time} ≈ ${estimate} km/hr.`,
    formula: 'speed = distance ÷ time',
    precision: 0,
  };
};

export const unitPrice: ProblemGenerator = (rng) => {
  const roundPrice = rng.pick([5, 8, 12, 15, 18, 20, 25, 40] as const);
  const roundQty = rng.pick([10, 12, 15, 19, 20, 25, 30, 40] as const);
  const price = messyNear(rng, roundPrice, { decimals: 2 });
  const qty = rng.bool() ? roundQty : roundQty - 1;
  const estimate = roundPrice * roundQty;
  const who = name(rng);
  const item = rng.pick([
    'shirts',
    'notebooks',
    'mugs',
    'books',
    'pens',
    'plates',
    'lamps',
    'tickets',
    'plants',
    'chargers',
  ] as const);
  const prompt = rng.pick([
    `${who} bought ${qty} ${item} for $${price.toFixed(2)} each. About how much was spent in total?`,
    `${who} picked up ${qty} ${item} at $${price.toFixed(2)} apiece. Roughly what was the total cost?`,
    `At $${price.toFixed(2)} each, ${who} ordered ${qty} ${item}. Estimate the total bill.`,
  ]);
  return {
    kind: 'unit-price',
    prompt,
    unit: '$',
    exactValue: qty * price,
    estimateValue: estimate,
    mentalLogic: `≈ ${roundQty} × $${roundPrice} = $${fmt(estimate)}.`,
    formula: 'total = quantity × unit price',
    precision: 0,
  };
};

export const rowsTimesPerRow: ProblemGenerator = (rng) => {
  const rows = rng.int(18, 41); // 18..40
  const roundPerRow = rng.pick([10, 20, 30, 40, 50] as const);
  const perRow = roundPerRow - 1; // e.g. 19, 29, 39
  const estimate = rows * roundPerRow;
  const place = rng.pick([
    'The assembly hall',
    'The auditorium',
    'The theater',
    'The lecture hall',
    'The conference room',
    'The cinema',
  ] as const);
  const prompt = rng.pick([
    `${place} sets up ${rows} rows of chairs with ${perRow} chairs in each row. About how many chairs are there in total?`,
    `${place} has ${rows} rows, each holding ${perRow} chairs. Roughly how many seats is that?`,
  ]);
  return {
    kind: 'rows-times-per-row',
    prompt,
    unit: 'chairs',
    exactValue: rows * perRow,
    estimateValue: estimate,
    mentalLogic: `≈ ${rows} × ${roundPerRow} = ${fmt(estimate)}.`,
    formula: 'total = rows × chairs per row',
    precision: 0,
  };
};

export const divisionPerUnit: ProblemGenerator = (rng) => {
  const quotient = rng.pick([150, 200, 250, 300, 400, 500, 600] as const); // the clean answer
  const divisor = rng.pick([19, 29, 39, 49] as const);
  const cleanDivisor = divisor + 1; // rounds up to 20, 30, 40, 50
  // Total near (answer × clean divisor) so rounding the inputs lands on `quotient`.
  const total = messyNear(rng, quotient * cleanDivisor, { decimals: 0 });
  const ctx = rng.pick([
    { thing: 'books', holder: 'shelves', verb: 'arrange equally onto', per: 'on each shelf' },
    { thing: 'chairs', holder: 'rooms', verb: 'distribute equally across', per: 'in each room' },
    { thing: 'parcels', holder: 'trucks', verb: 'load equally onto', per: 'on each truck' },
    { thing: 'seedlings', holder: 'trays', verb: 'spread equally across', per: 'in each tray' },
  ] as const);
  return {
    kind: 'division-per-unit',
    prompt: `A depot has ${fmt(total)} ${ctx.thing} to ${ctx.verb} ${divisor} ${ctx.holder}. About how many ${ctx.thing} will fit ${ctx.per}?`,
    unit: ctx.thing,
    exactValue: total / divisor,
    estimateValue: quotient,
    mentalLogic: `≈ ${fmt(quotient * cleanDivisor)} ÷ ${cleanDivisor} = ${fmt(quotient)}.`,
    formula: `per ${ctx.holder.slice(0, -1)} = total ÷ ${ctx.holder}`,
    precision: 0,
  };
};

export const percentageOf: ProblemGenerator = (rng) => {
  const total = rng.pick([4000, 5000, 6000, 8000, 9000, 10000, 12000, 15000] as const);
  const roundPct = rng.pick([10, 15, 20, 25, 30, 40] as const);
  const pct = messyNear(rng, roundPct, { decimals: 2 });
  const estimate = Math.round((total * roundPct) / 100);
  const ctx = rng.pick([
    { who: 'A company', whole: 'employees', verb: 'work remotely', subj: 'them' },
    { who: 'A university', whole: 'students', verb: 'live on campus', subj: 'them' },
    { who: 'A city', whole: 'households', verb: 'recycle weekly', subj: 'them' },
    { who: 'A festival', whole: 'attendees', verb: 'bought VIP passes', subj: 'them' },
    { who: 'A clinic', whole: 'patients', verb: 'booked online', subj: 'them' },
  ] as const);
  return {
    kind: 'percentage-of',
    prompt: `${ctx.who} has ${fmt(total)} ${ctx.whole}. If ${pct.toFixed(2)}% of ${ctx.subj} ${ctx.verb}, about how many is that?`,
    unit: ctx.whole,
    exactValue: (total * pct) / 100,
    estimateValue: estimate,
    mentalLogic: `≈ ${roundPct}% of ${fmt(total)} = ${fmt(estimate)}.`,
    formula: 'part = percent × total',
    precision: 0,
  };
};

export const areaSquare: ProblemGenerator = (rng) => {
  const roundSide = rng.pick([8, 10, 12, 15, 18, 20, 25, 30] as const);
  const side = messyNear(rng, roundSide, { decimals: 1 });
  const estimate = roundSide * roundSide;
  const thing = rng.pick([
    'square garden plot',
    'square courtyard',
    'square tile floor',
    'square patio',
    'square paddock',
    'square plaza',
  ] as const);
  const prompt = rng.pick([
    `A ${thing} has a side length of ${side} meters. What is its approximate area?`,
    `A ${thing} measures ${side} meters on each side. Estimate its area.`,
  ]);
  return {
    kind: 'area-square',
    prompt,
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
  const thing = rng.pick([
    'rug',
    'banner',
    'garden bed',
    'tarpaulin',
    'billboard',
    'mural',
  ] as const);
  const prompt = rng.pick([
    `A ${thing} is ${w} meters wide and ${l} meters long. What is its approximate area?`,
    `A ${thing} measures ${w} meters by ${l} meters. Estimate its area.`,
  ]);
  return {
    kind: 'area-rectangle',
    prompt,
    unit: 'm²',
    exactValue: w * l,
    estimateValue: estimate,
    mentalLogic: `≈ ${roundW} × ${roundL} = ${fmt(estimate)} m².`,
    formula: 'area = width × length',
    precision: 0,
  };
};

export const percentageComplement: ProblemGenerator = (rng) => {
  const total = messyNear(rng, rng.pick([12000, 15000, 16000, 18000, 20000, 24000] as const), {
    decimals: 0,
  });
  const roundTotal = Math.round(total / 1000) * 1000;
  const roundFilled = rng.pick([70, 75, 80, 84, 85] as const);
  const filledPct = messyNear(rng, roundFilled, { decimals: 2 });
  const emptyRoundPct = 100 - roundFilled;
  const estimate = Math.round((roundTotal * emptyRoundPct) / 100);
  const ctx = rng.pick([
    { who: 'A stadium', unit: 'seats', filled: 'filled for a game', empty: 'empty' },
    { who: 'A parking garage', unit: 'spaces', filled: 'occupied', empty: 'still free' },
    { who: 'A warehouse', unit: 'pallet slots', filled: 'in use', empty: 'available' },
    { who: 'An airliner fleet', unit: 'seats', filled: 'booked', empty: 'unsold' },
  ] as const);
  return {
    kind: 'percentage-complement',
    prompt: `${ctx.who} has ${fmt(total)} ${ctx.unit}. If ${filledPct.toFixed(2)}% of them are ${ctx.filled}, about how many are ${ctx.empty}?`,
    unit: ctx.unit,
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
  const item = rng.pick([
    'loaves of bread',
    'trays of pies',
    'cakes',
    'batches of buns',
    'pizza bases',
    'pastry sheets',
  ] as const);
  const prompt = rng.pick([
    `A baker uses ${per} kilograms of flour per item. With ${total} kilograms of flour, about how many ${item} can be made?`,
    `Each item needs ${per} kilograms of flour. From ${total} kilograms, roughly how many ${item} can a baker make?`,
  ]);
  return {
    kind: 'how-many-fit',
    prompt,
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

// ─────────────────────────────────────────────────────────────────────────────
// Discount / average / tip-tax
// ─────────────────────────────────────────────────────────────────────────────

export const discountPrice: ProblemGenerator = (rng) => {
  // Sale price after a clean discount: price × (1 − d%).
  const roundPrice = rng.pick([200, 300, 400, 500, 600, 800, 1000] as const);
  const price = messyNear(rng, roundPrice, { decimals: 0 });
  const discount = rng.pick([10, 15, 20, 25, 30] as const);
  const estimate = Math.round((roundPrice * (100 - discount)) / 100);
  const who = name(rng);
  const item = rng.pick([
    'a jacket',
    'a bicycle',
    'a desk',
    'a phone',
    'a sofa',
    'a backpack',
  ] as const);
  const Item = item.charAt(0).toUpperCase() + item.slice(1);
  const prompt = rng.pick([
    `${Item} is priced at $${fmt(price)} and is marked ${discount}% off. About what does ${who} pay?`,
    `${who} buys ${item} listed at $${fmt(price)} with a ${discount}% discount. Roughly what is the sale price?`,
  ]);
  return {
    kind: 'discount-price',
    prompt,
    unit: '$',
    exactValue: (price * (100 - discount)) / 100,
    estimateValue: estimate,
    mentalLogic: `≈ $${fmt(roundPrice)} − ${discount}% = $${fmt(estimate)}.`,
    formula: 'sale price = price × (100 − discount%)',
    precision: 0,
  };
};

export const averageOfGroup: ProblemGenerator = (rng) => {
  // Average = total ÷ count, with a clean quotient.
  const quotient = rng.pick([20, 25, 30, 40, 50, 60, 75] as const);
  const count = rng.pick([4, 5, 6, 8, 10] as const);
  const total = messyNear(rng, quotient * count, { decimals: 0 });
  const ctx = rng.pick([
    { whole: 'students', score: 'points', verb: 'scored a combined' },
    { whole: 'players', score: 'goals', verb: 'netted a combined' },
    { whole: 'branches', score: 'sales', verb: 'reported a combined' },
    { whole: 'workers', score: 'units', verb: 'produced a combined' },
  ] as const);
  return {
    kind: 'average-of-group',
    prompt: `${count} ${ctx.whole} ${ctx.verb} ${fmt(total)} ${ctx.score}. About what is the average per ${ctx.whole.slice(0, -1)}?`,
    unit: ctx.score,
    exactValue: total / count,
    estimateValue: quotient,
    mentalLogic: `≈ ${fmt(quotient * count)} ÷ ${count} = ${fmt(quotient)}.`,
    formula: `average = total ÷ ${ctx.whole}`,
    precision: 0,
  };
};

export const tipOrTax: ProblemGenerator = (rng) => {
  // A tip or tax on a bill: bill × rate%.
  const roundBill = rng.pick([400, 600, 800, 1000, 1200, 1500, 2000] as const);
  const bill = messyNear(rng, roundBill, { decimals: 0 });
  const rate = rng.pick([5, 8, 10, 12, 15] as const);
  const estimate = Math.round((roundBill * rate) / 100);
  const ctx = rng.pick([
    { label: 'tip', verb: 'wants to leave a', tail: 'tip' },
    { label: 'tax', verb: 'is charged a', tail: 'service tax' },
    { label: 'tip', verb: 'adds a', tail: 'gratuity' },
  ] as const);
  const who = name(rng);
  return {
    kind: 'tip-or-tax',
    prompt: `${who}'s bill comes to $${fmt(bill)}, and ${who} ${ctx.verb} ${rate}% ${ctx.tail}. About how much is that?`,
    unit: '$',
    exactValue: (bill * rate) / 100,
    estimateValue: estimate,
    mentalLogic: `≈ ${rate}% of $${fmt(roundBill)} = $${fmt(estimate)}.`,
    formula: `${ctx.label} = bill × rate%`,
    precision: 0,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// New archetypes: conversion / scaling / split / compound
// ─────────────────────────────────────────────────────────────────────────────

export const currencyConversion: ProblemGenerator = (rng) => {
  // amount × exchange rate. Round amount near a clean value; rate is a clean
  // integer-ish multiplier so the estimate is amount-round × rate-round.
  const roundAmount = rng.pick([200, 300, 400, 500, 800, 1000] as const);
  const amount = messyNear(rng, roundAmount, { decimals: 0 });
  const roundRate = rng.pick([25, 30, 35, 40] as const); // e.g. THB per unit
  const rate = messyNear(rng, roundRate, { decimals: 2 });
  const estimate = roundAmount * roundRate;
  const from = rng.pick(['dollars', 'euros', 'pounds'] as const);
  const who = name(rng);
  const prompt = rng.pick([
    `${who} exchanges ${fmt(amount)} ${from} at a rate of ${rate.toFixed(2)} baht per ${from.slice(0, -1)}. About how many baht is that?`,
    `At ${rate.toFixed(2)} baht to the ${from.slice(0, -1)}, ${who} converts ${fmt(amount)} ${from}. Roughly how many baht?`,
  ]);
  return {
    kind: 'currency-conversion',
    prompt,
    unit: 'baht',
    exactValue: amount * rate,
    estimateValue: estimate,
    mentalLogic: `≈ ${fmt(roundAmount)} × ${roundRate} = ${fmt(estimate)} baht.`,
    formula: 'baht = amount × exchange rate',
    precision: 0,
  };
};

export const mapDistance: ProblemGenerator = (rng) => {
  // map centimeters × scale (real km per map cm). Messy cm rounds to a clean
  // number; the scale is an exact integer so the estimate is clean.
  const roundCm = rng.pick([8, 10, 12, 15, 20, 25] as const);
  const cm = messyNear(rng, roundCm, { decimals: 1 });
  const scale = rng.pick([4, 5, 8, 10] as const); // km represented by 1 cm
  const estimate = roundCm * scale;
  const prompt = rng.pick([
    `On a map, 1 centimeter represents ${scale} kilometers. Two towns are ${cm.toFixed(1)} centimeters apart on the map. About how far apart are they in reality?`,
    `A map's scale is ${scale} kilometers per centimeter. If a route measures ${cm.toFixed(1)} centimeters on the map, roughly how long is it?`,
  ]);
  return {
    kind: 'map-distance',
    prompt,
    unit: 'km',
    exactValue: cm * scale,
    estimateValue: estimate,
    mentalLogic: `≈ ${roundCm} × ${scale} = ${fmt(estimate)} km.`,
    formula: 'distance = map length × scale',
    precision: 0,
  };
};

export const densityMass: ProblemGenerator = (rng) => {
  // mass = volume × density. Volume near a clean value (litres), density a clean
  // value (kg per litre); estimate is the product of the round factors.
  const roundVol = rng.pick([20, 25, 30, 40, 50] as const);
  const vol = messyNear(rng, roundVol, { decimals: 1 });
  const roundDensity = rng.pick([8, 9, 11, 13] as const); // kg per litre (×0.1 family below)
  const density = messyNear(rng, roundDensity, { decimals: 2 });
  const estimate = roundVol * roundDensity;
  const fluid = rng.pick(['oil', 'syrup', 'paint', 'resin'] as const);
  const prompt = rng.pick([
    `A drum holds ${vol.toFixed(1)} liters of ${fluid}, which has a density of about ${density.toFixed(2)} kilograms per liter. Estimate the mass of the ${fluid}.`,
    `${vol.toFixed(1)} liters of ${fluid} (density ≈ ${density.toFixed(2)} kg/L) fills a container. About how many kilograms is that?`,
  ]);
  return {
    kind: 'density-mass',
    prompt,
    unit: 'kg',
    exactValue: vol * density,
    estimateValue: estimate,
    mentalLogic: `≈ ${roundVol} × ${roundDensity} = ${fmt(estimate)} kg.`,
    formula: 'mass = volume × density',
    precision: 0,
  };
};

export const recipeScaling: ProblemGenerator = (rng) => {
  // per-serving amount × number of servings. Per-serving messy near a clean
  // value (grams); servings is an exact integer batch.
  const roundPer = rng.pick([80, 100, 120, 150, 200, 250] as const);
  const per = messyNear(rng, roundPer, { decimals: 0 });
  const servings = rng.pick([12, 15, 20, 24, 30] as const);
  const estimate = roundPer * servings;
  const ingredient = rng.pick(['flour', 'sugar', 'rice', 'sauce'] as const);
  const who = name(rng);
  const prompt = rng.pick([
    `A recipe uses ${fmt(per)} grams of ${ingredient} per serving. ${who} is cooking for ${servings} servings. About how many grams of ${ingredient} are needed?`,
    `${who} scales a recipe to ${servings} servings, with each serving needing ${fmt(per)} grams of ${ingredient}. Roughly how much ${ingredient} in total?`,
  ]);
  return {
    kind: 'recipe-scaling',
    prompt,
    unit: 'g',
    exactValue: per * servings,
    estimateValue: estimate,
    mentalLogic: `≈ ${fmt(roundPer)} × ${servings} = ${fmt(estimate)} g.`,
    formula: 'total = per serving × servings',
    precision: 0,
  };
};

export const ratioSplit: ProblemGenerator = (rng) => {
  // total split in a ratio; the question asks for one share = total × share/parts.
  // Choose total as a clean multiple of the parts so the share is exact-ish.
  const { a, b } = rng.pick([
    { a: 2, b: 3 },
    { a: 3, b: 2 },
    { a: 1, b: 3 },
    { a: 3, b: 5 },
    { a: 2, b: 5 },
  ] as const);
  const parts = a + b;
  const shareRound = rng.pick([1200, 1500, 1800, 2400, 3000] as const); // clean per-part base
  const roundTotal = shareRound * parts;
  const total = messyNear(rng, roundTotal, { decimals: 0 });
  const estimate = shareRound * a;
  const who1 = name(rng);
  const who2 = name(rng);
  return {
    kind: 'ratio-split',
    prompt: `${who1} and ${who2} share $${fmt(total)} in the ratio ${a}:${b}. About how much is ${who1}'s share?`,
    unit: '$',
    exactValue: (total * a) / parts,
    estimateValue: estimate,
    mentalLogic: `≈ $${fmt(roundTotal)} × ${a}/${parts} = $${fmt(estimate)}.`,
    formula: 'share = total × (part ÷ sum of parts)',
    precision: 0,
  };
};

export const compoundPercentage: ProblemGenerator = (rng) => {
  // base grown for two periods: base × (1 + r%)². Rate is a clean integer so
  // the estimate is the rounded base compounded the same way.
  const roundBase = rng.pick([4000, 5000, 6000, 8000, 10000] as const);
  const base = messyNear(rng, roundBase, { decimals: 0 });
  const r = rng.pick([5, 8, 10] as const);
  const factor = Math.pow(1 + r / 100, 2);
  const estimate = Math.round(roundBase * factor);
  const ctx = rng.pick([
    { who: 'A town', noun: 'residents', verb: 'grows' },
    { who: 'A startup', noun: 'subscribers', verb: 'grows' },
    { who: 'A savings account', noun: 'baht', verb: 'compounds' },
  ] as const);
  return {
    kind: 'compound-percentage',
    prompt: `${ctx.who} has ${fmt(base)} ${ctx.noun} and ${ctx.verb} by about ${r}% each year for two years. Estimate the amount after two years.`,
    unit: ctx.noun === 'baht' ? 'baht' : ctx.noun,
    exactValue: base * factor,
    estimateValue: estimate,
    mentalLogic: `≈ ${fmt(roundBase)} × (1 + ${r}%)² ≈ ${fmt(estimate)}.`,
    formula: 'amount = base × (1 + rate%)²',
    precision: 0,
  };
};

export const averageSpeedRoundtrip: ProblemGenerator = (rng) => {
  // total distance ÷ total time over a there-and-back trip with clean legs.
  const legDistRound = rng.pick([60, 90, 120, 150] as const);
  const legDist = messyNear(rng, legDistRound, { decimals: 0 });
  const totalTime = rng.pick([3, 4, 5, 6] as const); // total hours, both legs
  const estimate = Math.round((2 * legDistRound) / totalTime);
  const vehicle = rng.pick(['cyclist', 'rider', 'driver', 'runner'] as const);
  const prompt = rng.pick([
    `A ${vehicle} travels ${fmt(legDist)} kilometers to a destination and the same distance back, taking ${totalTime} hours in total. Estimate the average speed over the whole trip.`,
    `Over a round trip of ${fmt(legDist)} kilometers each way, a ${vehicle} spends ${totalTime} hours in total. About what is the average speed?`,
  ]);
  return {
    kind: 'average-speed-roundtrip',
    prompt,
    unit: 'km/hr',
    exactValue: (2 * legDist) / totalTime,
    estimateValue: estimate,
    mentalLogic: `≈ (2 × ${fmt(legDistRound)}) ÷ ${totalTime} = ${fmt(estimate)} km/hr.`,
    formula: 'average speed = total distance ÷ total time',
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
  discountPrice,
  averageOfGroup,
  tipOrTax,
  currencyConversion,
  mapDistance,
  densityMass,
  recipeScaling,
  ratioSplit,
  compoundPercentage,
  averageSpeedRoundtrip,
];
