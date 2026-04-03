import type { DailySpend, IncomeEntry } from '../context/AppDataContext';

const DAYS_PER_MONTH = 30.4375;

/**
 * Net worth shown for any chart date **strictly before** this day (ISO).
 * Change if you start tracking from a different calendar day.
 */
export const NET_WORTH_TRACKING_START_ISO = '2025-03-24';

/** Constant level for all history strictly before `NET_WORTH_TRACKING_START_ISO`. */
export const PRE_TRACKING_NET_WORTH = 10_000;

export type NetWorthPoint = {
  date: string;
  netWorth: number;
  isForecast: boolean;
};

export type ForecastBand = {
  date: string;
  upper: number;
  lower: number;
};

export type ChartHistoryInterval =
  | { kind: 'weeks'; weeks: 4 | 8 }
  | { kind: 'months'; months: 1 | 3 | 6 | 12 };

export type ChartForecastInterval =
  | { kind: 'weeks'; weeks: 4 | 8 }
  | { kind: 'months'; months: 6 };

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(base: Date, days: number): Date {
  const x = new Date(base);
  x.setDate(x.getDate() + days);
  return x;
}

function addMonths(base: Date, deltaMonths: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + deltaMonths, base.getDate());
}

/**
 * Dated cashflows only (no double-count with recurring monthly spread):
 * - Every income row (fixed + variable) on its `date`
 * - Day spendings paid **cash** on their `date` (card spend hits liquid when the statement is approved)
 */
export function buildLiquidityDeltaByDate(
  incomes: IncomeEntry[],
  dailySpends: DailySpend[]
): Record<string, number> {
  const m: Record<string, number> = {};
  for (const i of incomes) {
    m[i.date] = (m[i.date] ?? 0) + i.amount;
  }
  for (const s of dailySpends) {
    if (s.paymentMethod !== 'Credit card') {
      m[s.date] = (m[s.date] ?? 0) - s.amount;
    }
  }
  return m;
}

/**
 * Backward from today: only dates >= `trackingStartISO` are filled.
 * `baseDailyRecurringExpense` = (fixed costs + installment monthly) / DAYS — spread evenly; not dated.
 *
 * NW[prev] = NW[cur] + baseDailyRecurringExpense - liq(cur)
 * so a spend only on `cur` moves that step; changing today's liq does not change NW[prev] for unrelated days.
 */
function computeEndOfDayNetWorthMap(
  todayCal: Date,
  endOfTodayNw: number,
  baseDailyRecurringExpense: number,
  liquidityByDate: Record<string, number>,
  trackingStartISO: string
): Map<string, number> {
  const result = new Map<string, number>();
  let cur = new Date(todayCal.getFullYear(), todayCal.getMonth(), todayCal.getDate());
  const todayISO = toISODate(cur);
  let nw = endOfTodayNw;
  result.set(todayISO, nw);

  while (true) {
    const curISO = toISODate(cur);
    const liq = liquidityByDate[curISO] ?? 0;
    const prev = addDays(cur, -1);
    const prevISO = toISODate(prev);
    if (prevISO < trackingStartISO) break;
    nw = nw + baseDailyRecurringExpense - liq;
    result.set(prevISO, nw);
    cur = prev;
  }

  return result;
}

export type NetWorthChartStructure = {
  historyDates: string[];
  forecastDates: string[];
  netWeekly: number;
  netMonthly: number;
  forecastGranularity: 'week' | 'month';
};

export function buildNetWorthChartStructure(opts: {
  monthlyFixedIncome: number;
  monthlyExpense: number;
  history: ChartHistoryInterval;
  forecast: ChartForecastInterval;
}): NetWorthChartStructure {
  const netMonthly = opts.monthlyFixedIncome - opts.monthlyExpense;
  const netWeekly = netMonthly * (7 / DAYS_PER_MONTH);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const historyDates: string[] = [];
  if (opts.history.kind === 'weeks') {
    const W = opts.history.weeks;
    for (let k = W; k >= 0; k--) {
      historyDates.push(toISODate(addDays(today, -7 * k)));
    }
  } else {
    const M = opts.history.months;
    for (let k = M; k >= 0; k--) {
      historyDates.push(toISODate(addMonths(today, -k)));
    }
  }

  let forecastGranularity: 'week' | 'month' = 'week';
  const forecastDates: string[] = [];
  if (opts.forecast.kind === 'weeks') {
    const F = opts.forecast.weeks;
    for (let w = 1; w <= F; w++) {
      forecastDates.push(toISODate(addDays(today, 7 * w)));
    }
  } else {
    forecastGranularity = 'month';
    for (let m = 1; m <= opts.forecast.months; m++) {
      forecastDates.push(toISODate(addMonths(today, m)));
    }
  }

  return { historyDates, forecastDates, netWeekly, netMonthly, forecastGranularity };
}

export function buildNetWorthChartPoints(opts: {
  structure: NetWorthChartStructure;
  startingNetWorth: number;
  incomes: IncomeEntry[];
  dailySpends: DailySpend[];
  /** Fixed costs + installment monthly equivalent (not day spendings). */
  recurringExpenseMonthly: number;
}): { points: NetWorthPoint[]; bands: ForecastBand[] } {
  const { structure, startingNetWorth, incomes, dailySpends, recurringExpenseMonthly } = opts;
  const { historyDates, forecastDates, netWeekly, netMonthly, forecastGranularity } = structure;

  const now = new Date();
  const todayCal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayISO = toISODate(todayCal);

  const liquidity = buildLiquidityDeltaByDate(incomes, dailySpends);
  const baseDailyRecurringExpense = recurringExpenseMonthly / DAYS_PER_MONTH;

  const nwByDate = computeEndOfDayNetWorthMap(
    todayCal,
    startingNetWorth,
    baseDailyRecurringExpense,
    liquidity,
    NET_WORTH_TRACKING_START_ISO
  );

  const points: NetWorthPoint[] = [];
  for (const date of historyDates) {
    let nw: number;
    if (date < NET_WORTH_TRACKING_START_ISO) {
      nw = PRE_TRACKING_NET_WORTH;
    } else if (todayISO < NET_WORTH_TRACKING_START_ISO) {
      nw = startingNetWorth;
    } else {
      nw = nwByDate.get(date) ?? startingNetWorth;
    }
    points.push({ date, netWorth: nw, isForecast: false });
  }

  const bands: ForecastBand[] = [];
  if (forecastGranularity === 'week') {
    for (let w = 0; w < forecastDates.length; w++) {
      const date = forecastDates[w];
      const weekIndex = w + 1;
      const netWorth = startingNetWorth + netWeekly * weekIndex;
      points.push({ date, netWorth, isForecast: true });
      const spread = Math.max(Math.abs(netWorth) * 0.02, 100) * (0.35 + weekIndex * 0.06);
      bands.push({ date, upper: netWorth + spread, lower: netWorth - spread });
    }
  } else {
    for (let mi = 0; mi < forecastDates.length; mi++) {
      const date = forecastDates[mi];
      const m = mi + 1;
      const netWorth = startingNetWorth + netMonthly * m;
      points.push({ date, netWorth, isForecast: true });
      const spread = Math.max(Math.abs(netWorth) * 0.02, 100) * (0.35 + m * 0.08);
      bands.push({ date, upper: netWorth + spread, lower: netWorth - spread });
    }
  }

  return { points, bands };
}
