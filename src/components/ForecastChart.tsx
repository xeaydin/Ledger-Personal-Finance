import './ForecastChart.css';
import {
  NET_WORTH_TRACKING_START_ISO,
  PRE_TRACKING_NET_WORTH,
  type ChartForecastInterval,
  type ChartHistoryInterval,
  type ForecastBand,
  type NetWorthPoint,
} from '../utils/netWorthSeries';

export type { ChartForecastInterval, ChartHistoryInterval, ForecastBand, NetWorthPoint };

type Props = {
  points: NetWorthPoint[];
  bands?: ForecastBand[];
  /** Fixed income only — drives projection & pills. */
  monthlyFixedIncome: number;
  monthlyExpense: number;
  historyInterval: ChartHistoryInterval;
  forecastInterval: ChartForecastInterval;
  onHistoryIntervalChange: (h: ChartHistoryInterval) => void;
  onForecastIntervalChange: (f: ChartForecastInterval) => void;
};

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function parseChartDate(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

function formatTickDate(isoDate: string): string {
  const [y, mo, da] = isoDate.split('-').map(Number);
  const d = new Date(y, mo - 1, da);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (y !== new Date().getFullYear()) opts.year = '2-digit';
  return d.toLocaleString(undefined, opts);
}

/** ~average days per month for spreading monthly net into weekly steps */
const DAYS_PER_MONTH = 30;

type XY = { x: number; y: number };

function linearPathThrough(screenPts: XY[]): string {
  if (screenPts.length === 0) return '';
  if (screenPts.length === 1) return `M ${screenPts[0].x} ${screenPts[0].y}`;
  let d = `M ${screenPts[0].x} ${screenPts[0].y}`;
  for (let i = 1; i < screenPts.length; i++) {
    d += ` L ${screenPts[i].x} ${screenPts[i].y}`;
  }
  return d;
}

function linearRegressionNormY(points: NetWorthPoint[]): { a: number; b: number } {
  const n = points.length;
  if (n < 2) return { a: points[0]?.netWorth ?? 0, b: 0 };
  const xs = points.map((_, i) => (n === 1 ? 0 : i / (n - 1)));
  const ys = points.map(p => p.netWorth);
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const b = den === 0 ? 0 : num / den;
  const a = my - b * mx;
  return { a, b };
}

function historyIntervalsEqual(a: ChartHistoryInterval, b: ChartHistoryInterval): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'weeks' && b.kind === 'weeks') return a.weeks === b.weeks;
  if (a.kind === 'months' && b.kind === 'months') return a.months === b.months;
  return false;
}

function forecastIntervalsEqual(a: ChartForecastInterval, b: ChartForecastInterval): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'weeks' && b.kind === 'weeks') return a.weeks === b.weeks;
  if (a.kind === 'months' && b.kind === 'months') return a.months === b.months;
  return false;
}

export default function ForecastChart({
  points,
  bands = [],
  monthlyFixedIncome,
  monthlyExpense,
  historyInterval,
  forecastInterval,
  onHistoryIntervalChange,
  onForecastIntervalChange,
}: Props) {
  const sorted = [...points].sort((a, b) => parseChartDate(a.date) - parseChartDate(b.date));
  const netMonthly = monthlyFixedIncome - monthlyExpense;
  const netWeekly = netMonthly * (7 / DAYS_PER_MONTH);
  const historyOnly = sorted.filter(p => !p.isForecast);
  const currentNw = historyOnly.length ? historyOnly[historyOnly.length - 1].netWorth : sorted[0]?.netWorth ?? 0;
  const endNw = sorted.length ? sorted[sorted.length - 1].netWorth : currentNw;

  const { a: regA, b: regB } = linearRegressionNormY(sorted);

  if (sorted.length === 0) {
    return (
      <div className="forecast-chart-wrap">
        <p className="text-secondary text-sm">No net worth data to chart.</p>
      </div>
    );
  }

  const W = 680;
  const H = 300;
  const padL = 56;
  const padR = 14;
  const padT = 36;
  const padB = 48;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const times = sorted.map(p => parseChartDate(p.date));
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const tSpan = tMax - tMin || 1;

  const bandValues = bands.flatMap(b => [b.upper, b.lower]);
  const regLineYLeft = regA + regB * 0;
  const regLineYRight = regA + regB * 1;
  const allSeriesY = [...sorted.map(p => p.netWorth), ...bandValues];

  /** When history spans huge reconstructed outliers, scaling to “full data” squashes the forecast into a flat line. */
  const forecastPtsOnly = sorted.filter(p => p.isForecast);
  let yMinData: number;
  let yMaxData: number;
  if (forecastPtsOnly.length > 0 && historyOnly.length > 0) {
    const lastHistNw = historyOnly[historyOnly.length - 1]!.netWorth;
    const fNw = forecastPtsOnly.map(p => p.netWorth);
    const lastFn = fNw[fNw.length - 1]!;
    const forecastDateSet = new Set(forecastPtsOnly.map(p => p.date));
    const focusBands = bands.filter(b => forecastDateSet.has(b.date)).flatMap(b => [b.upper, b.lower]);
    const focusLow = Math.min(lastHistNw, ...fNw, ...focusBands);
    const focusHigh = Math.max(lastHistNw, ...fNw, ...focusBands);
    const projectedRun = lastFn - lastHistNw;
    const pad = Math.max(
      (focusHigh - focusLow) * 0.22,
      Math.abs(projectedRun) * 5,
      Math.abs(netWeekly) * forecastPtsOnly.length * 2.5,
      Math.abs(netMonthly),
      8_000
    );
    yMinData = focusLow - pad;
    yMaxData = focusHigh + pad;
    const regLo = Math.min(regLineYLeft, regLineYRight);
    const regHi = Math.max(regLineYLeft, regLineYRight);
    const span = yMaxData - yMinData;
    if (regLo < yMinData && regLo > yMinData - span) yMinData = regLo - span * 0.04;
    if (regHi > yMaxData && regHi < yMaxData + span) yMaxData = regHi + span * 0.04;
  } else {
    yMinData = Math.min(...allSeriesY, regLineYLeft, regLineYRight);
    yMaxData = Math.max(...allSeriesY, regLineYLeft, regLineYRight);
  }

  const yPad = Math.max((yMaxData - yMinData) * 0.08, 250, Math.abs(netMonthly) * 0.08);
  const yMin = yMinData - yPad;
  const yMax = yMaxData + yPad;
  const ySpan = yMax - yMin || 1;

  const xAt = (t: number) => padL + ((t - tMin) / tSpan) * innerW;
  const yAt = (v: number) => padT + innerH - ((v - yMin) / ySpan) * innerH;
  const yBottom = padT + innerH;

  const toScreen = (p: NetWorthPoint) => ({
    x: xAt(parseChartDate(p.date)),
    y: yAt(p.netWorth),
  });

  let bandPathD = '';
  if (bands.length > 0) {
    const sortedBands = [...bands].sort((a, b) => parseChartDate(a.date) - parseChartDate(b.date));
    const upperFwd = sortedBands.map((b, i) => {
      const x = xAt(parseChartDate(b.date));
      const y = yAt(b.upper);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    });
    const lowerBack = [...sortedBands].reverse().map(b => {
      const x = xAt(parseChartDate(b.date));
      const y = yAt(b.lower);
      return `L ${x} ${y}`;
    });
    bandPathD = `${upperFwd.join(' ')} ${lowerBack.join(' ')} Z`;
  }

  const firstForecastIdx = sorted.findIndex(p => p.isForecast);
  const lastHistoryIdx = firstForecastIdx <= 0 ? -1 : firstForecastIdx - 1;
  const dotIndices = new Set<number>([0, sorted.length - 1]);
  if (lastHistoryIdx >= 0) dotIndices.add(lastHistoryIdx);

  let actualPts: NetWorthPoint[] = [];
  let forecastPts: NetWorthPoint[] = [];

  if (firstForecastIdx === -1) {
    actualPts = sorted;
  } else if (firstForecastIdx === 0) {
    forecastPts = sorted;
  } else {
    actualPts = sorted.slice(0, firstForecastIdx);
    forecastPts = sorted.slice(firstForecastIdx - 1);
  }

  const screenActual = actualPts.map(toScreen);
  const screenForecast = forecastPts.map(toScreen);
  const pathActual = screenActual.length >= 2 ? linearPathThrough(screenActual) : '';
  const pathForecast = screenForecast.length >= 2 ? linearPathThrough(screenForecast) : '';

  const areaActualD =
    pathActual && screenActual.length >= 2
      ? `${pathActual} L ${screenActual[screenActual.length - 1].x} ${yBottom} L ${screenActual[0].x} ${yBottom} Z`
      : '';
  const areaForecastD =
    pathForecast && screenForecast.length >= 2
      ? `${pathForecast} L ${screenForecast[screenForecast.length - 1].x} ${yBottom} L ${screenForecast[0].x} ${yBottom} Z`
      : '';

  const trendYLeft = regA + regB * 0;
  const trendYRight = regA + regB * 1;
  const pathRegression = `M ${padL} ${yAt(trendYLeft)} L ${W - padR} ${yAt(trendYRight)}`;

  const n = sorted.length;
  const tickTs = (() => {
    if (n <= 6) return times;
    const step = Math.max(1, Math.floor((n - 1) / 5));
    const out: number[] = [];
    for (let i = 0; i < n; i += step) out.push(times[i]);
    if (out[out.length - 1] !== times[n - 1]) out.push(times[n - 1]);
    return out;
  })();

  const historyWeekOpts: (4 | 8)[] = [4, 8];
  const historyMonthOpts: (1 | 3 | 6 | 12)[] = [1, 3, 6, 12];
  const forecastWeekOpts: (4 | 8)[] = [4, 8];

  return (
    <div className="forecast-chart-wrap">
      <div className="forecast-range-toolbar">
        <div className="forecast-range-group forecast-range-group-wide">
          <span className="forecast-range-label">History</span>
          <div className="forecast-range-row">
            <span className="forecast-range-sublabel">Weeks</span>
            <div className="forecast-range-buttons" role="group" aria-label="History by weeks">
              {historyWeekOpts.map(wk => {
                const opt: ChartHistoryInterval = { kind: 'weeks', weeks: wk };
                return (
                  <button
                    key={`hw${wk}`}
                    type="button"
                    className={`forecast-range-btn ${historyIntervalsEqual(historyInterval, opt) ? 'active' : ''}`}
                    onClick={() => onHistoryIntervalChange(opt)}
                  >
                    {wk}w
                  </button>
                );
              })}
            </div>
          </div>
          <div className="forecast-range-row">
            <span className="forecast-range-sublabel">Months</span>
            <div className="forecast-range-buttons" role="group" aria-label="History by months">
              {historyMonthOpts.map(mo => {
                const opt: ChartHistoryInterval = { kind: 'months', months: mo };
                return (
                  <button
                    key={`hm${mo}`}
                    type="button"
                    className={`forecast-range-btn ${historyIntervalsEqual(historyInterval, opt) ? 'active' : ''}`}
                    onClick={() => onHistoryIntervalChange(opt)}
                  >
                    {mo}m
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="forecast-range-group forecast-range-group-wide">
          <span className="forecast-range-label">Forecast</span>
          <div className="forecast-range-row">
            <span className="forecast-range-sublabel">Weeks</span>
            <div className="forecast-range-buttons" role="group" aria-label="Forecast by weeks">
              {forecastWeekOpts.map(wk => {
                const opt: ChartForecastInterval = { kind: 'weeks', weeks: wk };
                return (
                  <button
                    key={`fw${wk}`}
                    type="button"
                    className={`forecast-range-btn ${forecastIntervalsEqual(forecastInterval, opt) ? 'active' : ''}`}
                    onClick={() => onForecastIntervalChange(opt)}
                  >
                    {wk}w
                  </button>
                );
              })}
            </div>
          </div>
          <div className="forecast-range-row">
            <span className="forecast-range-sublabel">Months</span>
            <div className="forecast-range-buttons" role="group" aria-label="Forecast six months">
              <button
                type="button"
                className={`forecast-range-btn ${
                  forecastIntervalsEqual(forecastInterval, { kind: 'months', months: 6 }) ? 'active' : ''
                }`}
                onClick={() => onForecastIntervalChange({ kind: 'months', months: 6 })}
              >
                6m
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="forecast-summary">
        <div className="forecast-pill forecast-pill-worth">
          <span className="forecast-pill-label">Net worth (now)</span>
          <span className="forecast-pill-value">${fmt(currentNw)}</span>
        </div>
        <div className="forecast-pill forecast-pill-income">
          <span className="forecast-pill-label">Fixed income / mo</span>
          <span className="forecast-pill-value">${fmt(monthlyFixedIncome)}</span>
        </div>
        <div className="forecast-pill forecast-pill-expense">
          <span className="forecast-pill-label">Expenses / mo</span>
          <span className="forecast-pill-value">${fmt(monthlyExpense)}</span>
        </div>
        <div className="forecast-pill forecast-pill-net">
          <span className="forecast-pill-label">Net / mo (fixed − expenses)</span>
          <span className={`forecast-pill-value ${netMonthly >= 0 ? 'text-success' : 'text-danger'}`}>
            {netMonthly >= 0 ? '+' : ''}${fmt(netMonthly)}
          </span>
        </div>
        <div className="forecast-pill forecast-pill-forecast-end">
          <span className="forecast-pill-label">Projected (end)</span>
          <span className="forecast-pill-value">${fmt(endNw)}</span>
        </div>
      </div>

      <svg
        className="forecast-svg forecast-svg-stock"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Net worth time series with trend line and forecast"
      >
        <defs>
          <linearGradient id="forecast-area-hist" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(196, 181, 253)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(196, 181, 253)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="forecast-area-future" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(167, 139, 250)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="rgb(167, 139, 250)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <text x={padL} y={20} className="forecast-axis-title">
          Net worth ($)
        </text>

        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const y = padT + innerH * (1 - t);
          const val = yMin + ySpan * t;
          return (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} className="forecast-grid" />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="forecast-tick">
                ${fmt(val)}
              </text>
            </g>
          );
        })}

        {bandPathD && <path d={bandPathD} className="forecast-band-area" />}

        {areaActualD && <path d={areaActualD} className="forecast-area-under forecast-area-historical" fill="url(#forecast-area-hist)" />}
        {areaForecastD && (
          <path d={areaForecastD} className="forecast-area-under forecast-area-forecast" fill="url(#forecast-area-future)" />
        )}

        <path d={pathRegression} className="forecast-regression-line" fill="none" />

        {pathActual && <path d={pathActual} fill="none" className="forecast-worth-line forecast-line-actual" strokeWidth={2.2} />}
        {pathForecast && (
          <path d={pathForecast} fill="none" className="forecast-worth-line forecast-line-forecast" strokeWidth={2.2} />
        )}

        {sorted.map((p, idx) => {
          if (!dotIndices.has(idx)) return null;
          const { x, y } = toScreen(p);
          return (
            <g key={`${p.date}-${p.isForecast}-${idx}`}>
              <circle
                cx={x}
                cy={y}
                r={p.isForecast ? 3.5 : 4}
                className={p.isForecast ? 'forecast-worth-dot forecast-dot-forecast' : 'forecast-worth-dot forecast-dot-actual'}
              />
            </g>
          );
        })}

        {tickTs.map(t => {
          const x = xAt(t);
          const label = formatTickDate(
            sorted.find(p => parseChartDate(p.date) === t)?.date ?? new Date(t).toISOString().slice(0, 10)
          );
          return (
            <text key={t} x={x} y={H - 12} textAnchor="middle" className="forecast-week-label">
              {label}
            </text>
          );
        })}
      </svg>

      <div className="forecast-legend">
        <span className="forecast-legend-item">
          <span className="forecast-swatch forecast-swatch-actual" /> History
        </span>
        <span className="forecast-legend-item">
          <span className="forecast-swatch forecast-swatch-forecast-line" /> Forecast
        </span>
        <span className="forecast-legend-item">
          <span className="forecast-swatch forecast-swatch-regression" /> Linear trend
        </span>
        <span className="forecast-legend-item">
          <span className="forecast-swatch forecast-swatch-band" /> Range (estimate)
        </span>
      </div>
      <p className="forecast-footnote text-secondary text-sm">
        Income and day spendings are read from saved entries (each row has a date). Before{' '}
        <strong>{NET_WORTH_TRACKING_START_ISO}</strong> the chart is fixed at{' '}
        <strong>${PRE_TRACKING_NET_WORTH.toLocaleString()}</strong>; from that day on, history steps backward from
        today using recurring fixed costs + installments spread per day, plus <strong>dated</strong> income and day
        spendings so a transaction only shifts its own day (and the chain before it), not unrelated past samples. The
        dashed <strong>linear trend</strong> is OLS on visible points. The vertical scale may clip very low values.
        Forecast band is illustrative only.
      </p>
    </div>
  );
}
