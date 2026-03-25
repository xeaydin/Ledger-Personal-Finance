import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import ForecastChart from '../components/ForecastChart';
import type { ChartForecastInterval, ChartHistoryInterval } from '../utils/netWorthSeries';
import {
  buildNetWorthChartPoints,
  buildNetWorthChartStructure,
} from '../utils/netWorthSeries';
import {
  Calendar,
  Wallet,
  CheckCircle,
  Clock,
  Plus,
  Save,
  X,
  CalendarRange,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import type { ScheduledPayment } from '../context/AppDataContext';
import { isPendingExpenseFarFuture, isPendingExpenseInNearWindow, parseLocalDate } from '../utils/scheduleDates';
import './Overview.css';

function compareScheduled(a: ScheduledPayment, b: ScheduledPayment) {
  return parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime();
}

export default function Overview() {
  const {
    scheduledPayments,
    setScheduledPayments,
    setIncomes,
    setLiquidCash,
    liquidCash,
    monthlyFixedIncomeTotal,
    monthlyExpenseTotal,
    portfolioValue,
    incomes,
    dailySpends,
    fixedCosts,
    installments,
  } = useAppData();

  const startingNetWorth = liquidCash + portfolioValue;

  /** Fixed + installments only; day spendings are applied on their own dates in the chart. */
  const recurringExpenseMonthly = useMemo(() => {
    const fixed = fixedCosts.reduce((a, f) => a + f.amount, 0);
    const inst = installments.reduce(
      (a, i) => a + i.total / Math.max(1, i.months_total),
      0
    );
    return fixed + inst;
  }, [fixedCosts, installments]);

  const [historyInterval, setHistoryInterval] = useState<ChartHistoryInterval>({ kind: 'weeks', weeks: 4 });
  const [forecastInterval, setForecastInterval] = useState<ChartForecastInterval>({ kind: 'weeks', weeks: 4 });

  const chartStructure = useMemo(
    () =>
      buildNetWorthChartStructure({
        monthlyFixedIncome: monthlyFixedIncomeTotal,
        monthlyExpense: monthlyExpenseTotal,
        history: historyInterval,
        forecast: forecastInterval,
      }),
    [monthlyFixedIncomeTotal, monthlyExpenseTotal, historyInterval, forecastInterval]
  );

  const { points: netWorthPoints, bands: netWorthBands } = useMemo(
    () =>
      buildNetWorthChartPoints({
        structure: chartStructure,
        startingNetWorth,
        incomes,
        dailySpends,
        recurringExpenseMonthly,
      }),
    [chartStructure, startingNetWorth, incomes, dailySpends, recurringExpenseMonthly]
  );

  const todayCashflow = useMemo(() => {
    const n = new Date();
    const t = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    const variableIn = incomes
      .filter(i => i.type.toLowerCase() === 'variable' && i.date === t)
      .reduce((s, i) => s + i.amount, 0);
    const daySpendOut = dailySpends.filter(d => d.date === t).reduce((s, d) => s + d.amount, 0);
    return { variableIn, daySpendOut, net: variableIn - daySpendOut };
  }, [incomes, dailySpends]);

  const [showTodayNet, setShowTodayNet] = useState(() => {
    try {
      return localStorage.getItem('overview-show-today-net') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleTodayNet = () => {
    setShowTodayNet(v => {
      const next = !v;
      try {
        localStorage.setItem('overview-show-today-net', String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const nearPendingExpenseTotal = useMemo(() => {
    return scheduledPayments
      .filter(
        p =>
          p.type === 'Expense' &&
          p.status === 'Pending' &&
          isPendingExpenseInNearWindow(p.date)
      )
      .reduce((acc, p) => acc + p.amount, 0);
  }, [scheduledPayments]);

  const liquidityGap = liquidCash - nearPendingExpenseTotal;
  const showLiquidityWarning = liquidityGap < 0;

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    amount: '',
    type: 'Expense' as 'Income' | 'Expense',
    date: new Date().toISOString().split('T')[0],
  });

  const sortedScheduled = useMemo(
    () => [...scheduledPayments].sort(compareScheduled),
    [scheduledPayments]
  );

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedule.title.trim() || !newSchedule.amount) return;
    const amount = parseFloat(newSchedule.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const entry: ScheduledPayment = {
      id: Date.now(),
      title: newSchedule.title.trim(),
      amount,
      type: newSchedule.type,
      status: 'Pending',
      date: newSchedule.date,
    };
    setScheduledPayments(prev => [...prev, entry]);
    setNewSchedule({
      title: '',
      amount: '',
      type: 'Expense',
      date: new Date().toISOString().split('T')[0],
    });
    setShowScheduleForm(false);
  };

  const handleApprove = (id: number) => {
    const payment = scheduledPayments.find(p => p.id === id);
    if (!payment || payment.status !== 'Pending') return;

    if (payment.type === 'Income') {
      setLiquidCash(prev => prev + payment.amount);
      setIncomes(prev => [
        ...prev,
        {
          id: Date.now(),
          source: `Scheduled: ${payment.title}`,
          amount: payment.amount,
          type: 'Variable',
          date: payment.date,
        },
      ]);
    } else {
      setLiquidCash(prev => prev - payment.amount);
    }

    setScheduledPayments(prev =>
      prev.map(p => (p.id === id ? { ...p, status: 'Approved' as const } : p))
    );
  };

  return (
    <div className="page-layout">
      {showLiquidityWarning && (
        <div className="overview-liquidity-warning" role="alert">
          <AlertTriangle size={22} className="overview-warning-icon" aria-hidden />
          <div>
            <strong>Insufficient liquid cash</strong>
            <p className="overview-warning-text">
              Your liquid cash (${liquidCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) is less than
              near-term pending expenses (${nearPendingExpenseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).
              Shortfall: ${Math.abs(liquidityGap).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
            </p>
          </div>
        </div>
      )}

      <header className="page-header">
        <div>
          <h1 className="text-gradient">Financial Overview</h1>
          <p className="text-secondary mt-1">Your net balances, scheduled flows, and projections.</p>
        </div>
      </header>

      <div className="metrics-banner">
        <Card className="glass-panel metric-panel">
          <div className="metric-icon bg-indigo">
            <Wallet size={24} />
          </div>
          <div className="metric-details">
            <span className="text-secondary text-sm">Total liquid cash</span>
            <span className="amount font-medium">
              ${liquidCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-tertiary text-xs mt-1">
              Variable income &amp; day spendings update cash; scheduled approvals too
            </span>
          </div>
        </Card>
        <Card className="glass-panel metric-panel">
          <div className="metric-icon bg-purple">
            <Calendar size={24} />
          </div>
          <div className="metric-details">
            <span className="text-secondary text-sm">Pending expenses (near-term)</span>
            <span className="amount font-medium text-danger">
              -$
              {nearPendingExpenseTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-tertiary text-xs mt-1">
              Overdue + due within 30 days. Farther dues are listed but not summed here.
            </span>
          </div>
        </Card>
      </div>

      <div className="overview-today-net-bar">
        {showTodayNet && (
          <Card className="glass-panel today-net-card">
            <div className="today-net-inner">
              <div className="today-net-title">
                <Calendar size={18} className="text-primary" aria-hidden />
                <span>Today&apos;s net (variable)</span>
              </div>
              <p className="text-secondary text-sm today-net-detail">
                Variable income in:{' '}
                <span className="text-success font-medium">
                  +${todayCashflow.variableIn.toFixed(2)}
                </span>
                {' · '}
                Day spendings:{' '}
                <span className="text-danger font-medium">-${todayCashflow.daySpendOut.toFixed(2)}</span>
              </p>
              <p
                className={`today-net-total ${todayCashflow.net >= 0 ? 'text-success' : 'text-danger'}`}
              >
                {todayCashflow.net >= 0 ? (
                  <ArrowUpRight size={22} className="today-net-arrow" aria-hidden />
                ) : (
                  <ArrowDownRight size={22} className="today-net-arrow" aria-hidden />
                )}
                <span>
                  {todayCashflow.net >= 0 ? '+' : ''}${todayCashflow.net.toFixed(2)}
                </span>
                <span className="text-tertiary text-sm font-normal today-net-sub">
                  Net effect on liquid today
                </span>
              </p>
            </div>
          </Card>
        )}
        <Button
          variant="secondary"
          type="button"
          className="today-net-toggle"
          onClick={toggleTodayNet}
          aria-pressed={showTodayNet}
        >
          {showTodayNet ? (
            <>
              <EyeOff size={18} /> Hide today&apos;s net
            </>
          ) : (
            <>
              <Eye size={18} /> Show today&apos;s net
            </>
          )}
        </Button>
      </div>

      <div className="overview-content">
        <section className="dashboard-section main-column">
          <Card className="glass-panel chart-card">
            <CardHeader>
              <CardTitle>Net worth trajectory</CardTitle>
            </CardHeader>
            <CardContent className="chart-content">
              <ForecastChart
                points={netWorthPoints}
                bands={netWorthBands}
                monthlyFixedIncome={monthlyFixedIncomeTotal}
                monthlyExpense={monthlyExpenseTotal}
                historyInterval={historyInterval}
                forecastInterval={forecastInterval}
                onHistoryIntervalChange={setHistoryInterval}
                onForecastIntervalChange={setForecastInterval}
              />
            </CardContent>
          </Card>
        </section>

        <section className="dashboard-section side-column">
          <Card className="glass-panel schedule-card">
            <CardHeader className="schedule-card-header">
              <CardTitle>Scheduled workflows</CardTitle>
              <Button
                variant="primary"
                type="button"
                className="btn-sm schedule-add-btn"
                onClick={() => setShowScheduleForm(!showScheduleForm)}
                aria-expanded={showScheduleForm}
              >
                {showScheduleForm ? <X size={16} /> : <Plus size={16} />}
                <span>{showScheduleForm ? 'Cancel' : 'Schedule'}</span>
              </Button>
            </CardHeader>
            <CardContent>
              {showScheduleForm && (
                <form className="schedule-add-form" onSubmit={handleAddSchedule}>
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      className="input-field"
                      value={newSchedule.type}
                      onChange={e =>
                        setNewSchedule(s => ({
                          ...s,
                          type: e.target.value as 'Income' | 'Expense',
                        }))
                      }
                    >
                      <option value="Expense">Expense</option>
                      <option value="Income">Income</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      className="input-field"
                      value={newSchedule.title}
                      onChange={e => setNewSchedule(s => ({ ...s, title: e.target.value }))}
                      placeholder="e.g. Rent, Freelance payment"
                      required
                      maxLength={80}
                    />
                  </div>
                  <div className="form-group">
                    <label>Amount ($)</label>
                    <input
                      className="input-field"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={newSchedule.amount}
                      onChange={e => setNewSchedule(s => ({ ...s, amount: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Due / expected date</label>
                    <input
                      className="input-field"
                      type="date"
                      value={newSchedule.date}
                      onChange={e => setNewSchedule(s => ({ ...s, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="schedule-form-actions">
                    <Button variant="primary" type="submit" className="btn-sm">
                      <Save size={16} />
                      <span>Add to schedule</span>
                    </Button>
                  </div>
                </form>
              )}

              <div className="schedule-list">
                {sortedScheduled.map(payment => {
                  const isFarExpense =
                    payment.status === 'Pending' &&
                    payment.type === 'Expense' &&
                    isPendingExpenseFarFuture(payment.date);
                  const isNearPendingExpense =
                    payment.status === 'Pending' &&
                    payment.type === 'Expense' &&
                    !isFarExpense;

                  const itemClass = [
                    'schedule-item',
                    payment.status === 'Pending' ? 'pending' : 'approved',
                    isFarExpense ? 'schedule-item-far-expense' : '',
                    isNearPendingExpense ? 'schedule-item-near-expense' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <div key={payment.id} className={itemClass}>
                      <div className="item-header">
                        <div className="date-badge">
                          <span className="day">{parseLocalDate(payment.date).getDate()}</span>
                          <span className="month">
                            {parseLocalDate(payment.date).toLocaleString('default', { month: 'short' })}
                          </span>
                        </div>
                        <div className="item-info">
                          <span className="font-medium schedule-item-title-row">
                            {payment.type === 'Expense' && payment.status === 'Pending' && isFarExpense && (
                              <span className="schedule-icon-wrap" aria-label="Due more than 30 days from today">
                                <CalendarRange size={16} className="schedule-far-icon" aria-hidden />
                              </span>
                            )}
                            {payment.type === 'Expense' && payment.status === 'Pending' && isNearPendingExpense && (
                              <span className="schedule-icon-wrap" aria-label="Included in near-term pending total">
                                <AlertTriangle size={16} className="schedule-near-icon" aria-hidden />
                              </span>
                            )}
                            {payment.title}
                          </span>
                          {isFarExpense && (
                            <span className="schedule-far-badge text-tertiary text-xs">Not in near-term total</span>
                          )}
                          <span
                            className={`text-sm ${payment.type === 'Income' ? 'text-success' : 'text-danger'}`}
                          >
                            {payment.type === 'Income' ? '+' : '-'}$
                            {payment.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      </div>
                      {payment.status === 'Pending' ? (
                        <div className="item-actions">
                          <span className="status-label">
                            <Clock size={14} /> Pending
                          </span>
                          <Button
                            variant="secondary"
                            className="btn-sm text-success approve-btn"
                            type="button"
                            onClick={() => handleApprove(payment.id)}
                            aria-label={`Approve ${payment.title}`}
                          >
                            <CheckCircle size={14} /> Approve
                          </Button>
                        </div>
                      ) : (
                        <div className="item-actions">
                          <span className="text-success text-sm flex-center gap-1">
                            <CheckCircle size={14} />
                            {payment.type === 'Income'
                              ? 'Credited to liquid cash · listed under Income'
                              : 'Paid from liquid cash'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
