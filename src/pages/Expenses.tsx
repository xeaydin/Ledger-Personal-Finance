import { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Plus, Receipt, CalendarClock, CreditCard, Save, X, Trash2, Banknote } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import type { PaymentMethod } from '../context/AppDataContext';
import { applyCreditCardScheduleDelta } from '../utils/creditCardSchedule';
import './Expenses.css';

const CATEGORY_CHIP_VARIANTS = 6;

const FIXED_COST_THEMES = [
  { color: 'bg-blue', label: 'Ocean', hint: 'Blue accent' },
  { color: 'bg-purple', label: 'Lilac', hint: 'Purple accent' },
  { color: 'bg-red', label: 'Coral', hint: 'Red accent' },
  { color: 'bg-green', label: 'Moss', hint: 'Green accent' },
] as const;

function PaymentMethodField({
  value,
  onChange,
  groupLabelId,
}: {
  value: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
  groupLabelId: string;
}) {
  return (
    <div className="payment-method-row" role="group" aria-labelledby={groupLabelId}>
      <button
        type="button"
        className={`payment-method-btn ${value === 'Cash' ? 'is-selected' : ''}`}
        onClick={() => onChange('Cash')}
        aria-pressed={value === 'Cash'}
      >
        <Banknote size={17} strokeWidth={2} aria-hidden />
        Cash
      </button>
      <button
        type="button"
        className={`payment-method-btn ${value === 'Credit card' ? 'is-selected' : ''}`}
        onClick={() => onChange('Credit card')}
        aria-pressed={value === 'Credit card'}
      >
        <CreditCard size={17} strokeWidth={2} aria-hidden />
        Credit card
      </button>
    </div>
  );
}

export default function Expenses() {
  const {
    dailySpends,
    setDailySpends,
    installments,
    setInstallments,
    fixedCosts,
    setFixedCosts,
    expenseCategories,
    setLiquidCash,
    setScheduledPayments,
  } = useAppData();

  const defaultCategory = expenseCategories[0] ?? 'Other';

  const [showDailyForm, setShowDailyForm] = useState(false);
  const [showInstallmentForm, setShowInstallmentForm] = useState(false);
  const [showFixedForm, setShowFixedForm] = useState(false);

  const [newDaily, setNewDaily] = useState({
    title: '',
    amount: '',
    category: defaultCategory,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash' as PaymentMethod,
  });
  const [newInstallment, setNewInstallment] = useState({ title: '', total: '', months_total: '' });
  const [newFixed, setNewFixed] = useState({
    title: '',
    amount: '',
    icon: '🏠',
    color: 'bg-blue',
    paymentMethod: 'Cash' as PaymentMethod,
  });

  useEffect(() => {
    setNewDaily(prev => ({
      ...prev,
      category: expenseCategories.includes(prev.category) ? prev.category : defaultCategory,
    }));
  }, [expenseCategories, defaultCategory]);

  const handleAddDaily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDaily.title || !newDaily.amount) return;
    const entry = {
      id: Date.now(),
      title: newDaily.title,
      amount: parseFloat(newDaily.amount),
      category: newDaily.category,
      date: newDaily.date,
      paymentMethod: newDaily.paymentMethod,
    };
    if (entry.paymentMethod === 'Cash') {
      setLiquidCash(prev => prev - entry.amount);
    } else {
      setScheduledPayments(prev => applyCreditCardScheduleDelta(prev, entry.amount, entry.date));
    }
    setDailySpends(prev => [entry, ...prev]);
    setNewDaily({
      title: '',
      amount: '',
      category: defaultCategory,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
    });
    setShowDailyForm(false);
  };

  const handleAddInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstallment.title || !newInstallment.total || !newInstallment.months_total) return;
    const total = parseFloat(newInstallment.total);
    const months = parseInt(newInstallment.months_total, 10);
    const entry = {
      id: Date.now(),
      title: newInstallment.title,
      total,
      paid: 0,
      remaining: total,
      months_total: months,
      months_paid: 0,
    };
    setInstallments(prev => [...prev, entry]);
    setNewInstallment({ title: '', total: '', months_total: '' });
    setShowInstallmentForm(false);
  };

  const handleAddFixed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFixed.title || !newFixed.amount) return;
    const entry = {
      id: Date.now(),
      title: newFixed.title,
      amount: parseFloat(newFixed.amount),
      icon: newFixed.icon,
      color: newFixed.color,
      paymentMethod: newFixed.paymentMethod,
    };
    setFixedCosts(prev => [...prev, entry]);
    setNewFixed({ title: '', amount: '', icon: '🏠', color: 'bg-blue', paymentMethod: 'Cash' });
    setShowFixedForm(false);
  };

  return (
    <div className="page-layout">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Cash out</p>
          <h1 className="page-title-display">Expense Tracker</h1>
          <p className="text-secondary mt-1">Monitor daily spending, installments, and fixed monthly costs.</p>
        </div>
      </header>

      <div className="expenses-grid">
        <section className="expense-section">
          <div className="section-header">
            <h2 className="section-title">
              <Receipt size={20} className="text-accent" />
              Day spendings
            </h2>
            <Button
              variant="primary"
              onClick={() => setShowDailyForm(!showDailyForm)}
              aria-expanded={showDailyForm}
              aria-label={showDailyForm ? 'Cancel adding day spending' : 'Add day spending'}
            >
              {showDailyForm ? <X size={16} /> : <Plus size={16} />}
              <span>{showDailyForm ? 'Cancel' : 'Add'}</span>
            </Button>
          </div>

          {showDailyForm && (
            <Card className="glass-panel form-card mb-4">
              <CardContent className="pt-4">
                <form onSubmit={handleAddDaily} className="entry-form">
                  <div className="form-group">
                    <label>Item / title</label>
                    <input
                      type="text"
                      value={newDaily.title}
                      onChange={e => setNewDaily({ ...newDaily, title: e.target.value })}
                      className="input-field"
                      required
                      placeholder="e.g. Lunch"
                    />
                  </div>
                  <div className="form-group">
                    <label>Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newDaily.amount}
                      onChange={e => setNewDaily({ ...newDaily, amount: e.target.value })}
                      className="input-field"
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      value={newDaily.date}
                      onChange={e => setNewDaily({ ...newDaily, date: e.target.value })}
                      className="input-field"
                      required
                    />
                    <p className="text-tertiary text-xs mt-1">
                      Net-worth chart moves on this date only; past sample points stay stable for other days.
                    </p>
                  </div>
                  <div className="form-group form-group-full-width">
                    <span className="input-label" id="daily-category-label">
                      Category
                    </span>
                    <div
                      className="category-chip-grid"
                      role="listbox"
                      aria-labelledby="daily-category-label"
                    >
                      {expenseCategories.map((cat, i) => (
                        <button
                          key={cat}
                          type="button"
                          role="option"
                          aria-selected={newDaily.category === cat}
                          className={`category-chip category-chip--${i % CATEGORY_CHIP_VARIANTS} ${
                            newDaily.category === cat ? 'is-selected' : ''
                          }`}
                          onClick={() => setNewDaily({ ...newDaily, category: cat })}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <p className="text-tertiary text-xs mt-1">Add or remove categories in Settings.</p>
                  </div>
                  <div className="form-group form-group-full-width">
                    <span className="input-label" id="daily-payment-label">
                      Payment method
                    </span>
                    <PaymentMethodField
                      value={newDaily.paymentMethod}
                      onChange={paymentMethod => setNewDaily({ ...newDaily, paymentMethod })}
                      groupLabelId="daily-payment-label"
                    />
                    <p className="text-tertiary text-xs payment-behavior-hint">
                      Cash is taken from liquid cash immediately. Credit card spend is added to a single
                      &quot;Credit card statement&quot; due on the <strong>1st of next month</strong> (Overview →
                      Scheduled); approving it pays the balance from liquid cash.
                    </p>
                  </div>
                  <div className="form-actions">
                    <Button variant="primary" type="submit" aria-label="Save day spending">
                      <Save size={18} />
                      <span>Save</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="glass-panel">
            <CardContent className="no-padding">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right" style={{ width: '52px' }} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySpends.map(spend => (
                    <TableRow key={spend.id}>
                      <TableCell className="font-medium">{spend.title}</TableCell>
                      <TableCell className="text-secondary text-sm">{spend.date}</TableCell>
                      <TableCell>
                        <span className="badge badge-category">{spend.category}</span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`payment-badge payment-badge--${spend.paymentMethod === 'Credit card' ? 'card' : 'cash'}`}
                        >
                          {spend.paymentMethod === 'Credit card' ? (
                            <CreditCard size={13} strokeWidth={2} aria-hidden />
                          ) : (
                            <Banknote size={13} strokeWidth={2} aria-hidden />
                          )}
                          {spend.paymentMethod}
                        </span>
                      </TableCell>
                      <TableCell className="text-danger font-medium text-right">
                        -{spend.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right p-0">
                        <Button
                          variant="icon"
                          type="button"
                          className="table-action-btn"
                          onClick={() => {
                            if (spend.paymentMethod === 'Cash') {
                              setLiquidCash(lc => lc + spend.amount);
                            } else {
                              setScheduledPayments(prev =>
                                applyCreditCardScheduleDelta(prev, -spend.amount, spend.date)
                              );
                            }
                            setDailySpends(prev => prev.filter(s => s.id !== spend.id));
                          }}
                          aria-label={`Delete ${spend.title}`}
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {dailySpends.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="empty-table-cell">
                        <div className="empty-state-inline">
                          <Receipt size={28} strokeWidth={1.5} aria-hidden />
                          <span>No day spendings yet. Add one to start tracking.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <section className="expense-section">
          <div className="section-header">
            <h2 className="section-title">
              <CreditCard size={20} className="text-warning" />
              Active installments
            </h2>
            <Button
              variant="primary"
              onClick={() => setShowInstallmentForm(!showInstallmentForm)}
              aria-expanded={showInstallmentForm}
            >
              {showInstallmentForm ? <X size={16} /> : <Plus size={16} />}
              <span>{showInstallmentForm ? 'Cancel' : 'New'}</span>
            </Button>
          </div>

          {showInstallmentForm && (
            <Card className="glass-panel form-card mb-4">
              <CardContent className="pt-4">
                <form onSubmit={handleAddInstallment} className="entry-form">
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      value={newInstallment.title}
                      onChange={e => setNewInstallment({ ...newInstallment, title: e.target.value })}
                      className="input-field"
                      required
                      placeholder="e.g. Laptop"
                    />
                  </div>
                  <div className="form-group">
                    <label>Total amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newInstallment.total}
                      onChange={e => setNewInstallment({ ...newInstallment, total: e.target.value })}
                      className="input-field"
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label>Total months</label>
                    <input
                      type="number"
                      min="1"
                      value={newInstallment.months_total}
                      onChange={e =>
                        setNewInstallment({ ...newInstallment, months_total: e.target.value })
                      }
                      className="input-field"
                      required
                      placeholder="12"
                    />
                  </div>
                  <div className="form-actions">
                    <Button variant="primary" type="submit" aria-label="Save installment">
                      <Save size={18} />
                      <span>Save</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="installments-list">
            {installments.length === 0 && (
              <div className="text-secondary text-center py-4">No active installments.</div>
            )}
            {installments.map(inst => (
              <Card key={inst.id} className="glass-panel installment-card relative">
                <Button
                  variant="icon"
                  type="button"
                  className="installment-delete-btn"
                  onClick={() => setInstallments(prev => prev.filter(i => i.id !== inst.id))}
                  aria-label={`Delete ${inst.title}`}
                  title="Delete"
                >
                  <Trash2 size={18} />
                </Button>
                <CardContent>
                  <div className="installment-header">
                    <h3 className="font-medium pr-6">{inst.title}</h3>
                    <span className="text-danger font-medium">
                      -${(inst.total / inst.months_total).toFixed(2)} / mo
                    </span>
                  </div>
                  <div className="progress-container">
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${(inst.months_paid / inst.months_total) * 100}%` }}
                      />
                    </div>
                    <div className="progress-stats">
                      <span className="text-secondary text-sm">
                        {inst.months_paid} of {inst.months_total} months
                      </span>
                      <span className="text-secondary text-sm">${inst.remaining.toFixed(2)} left</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="expense-section full-width">
          <div className="section-header">
            <h2 className="section-title">
              <CalendarClock size={20} className="text-success" />
              Monthly fixed costs
            </h2>
            <Button variant="primary" onClick={() => setShowFixedForm(!showFixedForm)}>
              {showFixedForm ? <X size={16} /> : <Plus size={16} />}
              <span>{showFixedForm ? 'Cancel' : 'Manage'}</span>
            </Button>
          </div>

          {showFixedForm && (
            <Card className="glass-panel form-card mb-4">
              <CardContent className="pt-4">
                <form onSubmit={handleAddFixed} className="entry-form">
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      value={newFixed.title}
                      onChange={e => setNewFixed({ ...newFixed, title: e.target.value })}
                      className="input-field"
                      required
                      placeholder="e.g. Electricity"
                    />
                  </div>
                  <div className="form-group">
                    <label>Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newFixed.amount}
                      onChange={e => setNewFixed({ ...newFixed, amount: e.target.value })}
                      className="input-field"
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group form-group-full-width">
                    <span className="input-label" id="fixed-theme-label">
                      Card theme
                    </span>
                    <p className="text-tertiary text-xs theme-field-hint">
                      Tap a style to set the color ring for this fixed cost on the grid.
                    </p>
                    <div
                      className="fixed-theme-grid"
                      role="group"
                      aria-labelledby="fixed-theme-label"
                    >
                      {FIXED_COST_THEMES.map(t => (
                        <button
                          key={t.color}
                          type="button"
                          className={`fixed-theme-option ${newFixed.color === t.color ? 'is-selected' : ''}`}
                          onClick={() => setNewFixed({ ...newFixed, color: t.color })}
                          aria-pressed={newFixed.color === t.color}
                          aria-label={`${t.label} theme, ${t.hint}`}
                        >
                          <span className={`fixed-theme-swatch ${t.color}`} aria-hidden />
                          <span className="fixed-theme-text">
                            <span className="fixed-theme-name">{t.label}</span>
                            <span className="fixed-theme-hint">{t.hint}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group form-group-full-width">
                    <span className="input-label" id="fixed-payment-label">
                      Payment method
                    </span>
                    <PaymentMethodField
                      value={newFixed.paymentMethod}
                      onChange={paymentMethod => setNewFixed({ ...newFixed, paymentMethod })}
                      groupLabelId="fixed-payment-label"
                    />
                  </div>
                  <div className="form-group">
                    <label>Icon emoji</label>
                    <input
                      type="text"
                      value={newFixed.icon}
                      onChange={e => setNewFixed({ ...newFixed, icon: e.target.value })}
                      className="input-field"
                      required
                      maxLength={2}
                    />
                  </div>
                  <div className="form-actions">
                    <Button variant="primary" type="submit" aria-label="Save fixed cost">
                      <Save size={18} />
                      <span>Save</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="glass-panel">
            <CardContent>
              <div className="fixed-costs-wrapper">
                {fixedCosts.length === 0 && (
                  <div className="text-secondary">No fixed costs tracked.</div>
                )}
                {fixedCosts.map(cost => (
                  <div key={cost.id} className="fixed-cost-item relative">
                    <Button
                      variant="icon"
                      type="button"
                      className="fixed-cost-delete-btn"
                      onClick={() => setFixedCosts(prev => prev.filter(c => c.id !== cost.id))}
                      aria-label={`Delete ${cost.title}`}
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </Button>
                    <div className={`cost-icon ${cost.color}`}>{cost.icon}</div>
                    <div className="cost-details pr-4">
                      <span className="cost-title">{cost.title}</span>
                      <span className="cost-amount text-danger">-${cost.amount.toFixed(2)}</span>
                      <span
                        className={`payment-badge payment-badge--${cost.paymentMethod === 'Credit card' ? 'card' : 'cash'} payment-badge--compact`}
                      >
                        {cost.paymentMethod === 'Credit card' ? (
                          <CreditCard size={12} strokeWidth={2} aria-hidden />
                        ) : (
                          <Banknote size={12} strokeWidth={2} aria-hidden />
                        )}
                        {cost.paymentMethod}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
