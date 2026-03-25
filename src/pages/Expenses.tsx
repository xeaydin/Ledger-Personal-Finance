import { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Plus, Receipt, CalendarClock, CreditCard, Save, X, Trash2 } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import './Expenses.css';

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
  });
  const [newInstallment, setNewInstallment] = useState({ title: '', total: '', months_total: '' });
  const [newFixed, setNewFixed] = useState({ title: '', amount: '', icon: '🏠', color: 'bg-blue' });

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
    };
    setLiquidCash(prev => prev - entry.amount);
    setDailySpends(prev => [entry, ...prev]);
    setNewDaily({
      title: '',
      amount: '',
      category: defaultCategory,
      date: new Date().toISOString().split('T')[0],
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
    };
    setFixedCosts(prev => [...prev, entry]);
    setNewFixed({ title: '', amount: '', icon: '🏠', color: 'bg-blue' });
    setShowFixedForm(false);
  };

  return (
    <div className="page-layout">
      <header className="page-header">
        <div>
          <h1 className="text-gradient">Expense Tracker</h1>
          <p className="text-secondary mt-1">Monitor daily spending, installments, and fixed monthly costs.</p>
        </div>
      </header>

      <div className="expenses-grid">
        <section className="expense-section">
          <div className="section-header">
            <h2 className="section-title">
              <Receipt size={20} className="text-primary" />
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
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={newDaily.category}
                      onChange={e => setNewDaily({ ...newDaily, category: e.target.value })}
                      className="input-field"
                    >
                      {expenseCategories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <p className="text-tertiary text-xs mt-1">Manage categories in Settings.</p>
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
                      <TableCell className="text-danger font-medium text-right">
                        -{spend.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right p-0">
                        <Button
                          variant="icon"
                          type="button"
                          className="table-action-btn"
                          onClick={() => {
                            setLiquidCash(lc => lc + spend.amount);
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
                      <TableCell colSpan={4} className="text-center text-secondary py-4">
                        No spendings yet.
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
                  <div className="form-group">
                    <label>Theme</label>
                    <select
                      value={newFixed.color}
                      onChange={e => setNewFixed({ ...newFixed, color: e.target.value })}
                      className="input-field"
                    >
                      <option value="bg-blue">Blue theme</option>
                      <option value="bg-purple">Purple theme</option>
                      <option value="bg-red">Red theme</option>
                      <option value="bg-green">Green theme</option>
                    </select>
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
