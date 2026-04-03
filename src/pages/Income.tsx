import { useState, type CSSProperties } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Plus, Settings, Save, Trash2, X, Wallet } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import './Income.css';

export default function Income() {
  const { incomes, setIncomes, allocations, setAllocations, setLiquidCash } = useAppData();

  const [showForm, setShowForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    source: '',
    amount: '',
    type: 'Fixed',
    date: new Date().toISOString().split('T')[0],
  });

  const [showAllocationForm, setShowAllocationForm] = useState(false);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.source || !newEntry.amount) return;

    const entry = {
      id: Date.now(),
      source: newEntry.source,
      amount: parseFloat(newEntry.amount),
      type: newEntry.type,
      date: newEntry.date,
    };
    if (entry.type.toLowerCase() === 'variable') {
      setLiquidCash(prev => prev + entry.amount);
    }
    setIncomes(prev => [...prev, entry]);
    setNewEntry({
      source: '',
      amount: '',
      type: 'Fixed',
      date: new Date().toISOString().split('T')[0],
    });
    setShowForm(false);
  };

  const handleDelete = (id: number) => {
    setIncomes(prev => {
      const inc = prev.find(i => i.id === id);
      if (inc && inc.type.toLowerCase() === 'variable') {
        setLiquidCash(lc => lc - inc.amount);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const handleAllocationSave = (e: React.FormEvent) => {
    e.preventDefault();
    const total = allocations.expenses + allocations.savings + allocations.investments;
    if (total === 100) {
      setShowAllocationForm(false);
    } else {
      window.alert('Allocations must add up to 100%');
    }
  };

  const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="page-layout">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Cash in</p>
          <h1 className="page-title-display">Income Tracker</h1>
          <p className="text-secondary mt-1">Manage and allocate your revenue streams.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
          aria-expanded={showForm}
          aria-label={showForm ? 'Close add income form' : 'Add new income entry'}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          <span>{showForm ? 'Close' : 'New entry'}</span>
        </Button>
      </header>

      {showForm && (
        <Card className="glass-panel form-card">
          <CardHeader>
            <CardTitle>Add new income</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddEntry} className="entry-form">
              <div className="form-group">
                <label>Source</label>
                <input
                  type="text"
                  value={newEntry.source}
                  onChange={e => setNewEntry({ ...newEntry, source: e.target.value })}
                  placeholder="e.g. Salary, Dividend"
                  required
                  className="input-field"
                />
              </div>
              <div className="form-group">
                <label>Amount ($)</label>
                <input
                  type="number"
                  value={newEntry.amount}
                  onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })}
                  placeholder="0.00"
                  required
                  min="0"
                  step="0.01"
                  className="input-field"
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={newEntry.type}
                  onChange={e => setNewEntry({ ...newEntry, type: e.target.value })}
                  className="input-field"
                >
                  <option value="Fixed">Fixed</option>
                  <option value="Variable">Variable</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={newEntry.date}
                  onChange={e => setNewEntry({ ...newEntry, date: e.target.value })}
                  required
                  className="input-field"
                />
              </div>
              <div className="form-actions">
                <Button variant="primary" type="submit" aria-label="Save income entry">
                  <Save size={18} />
                  <span>Save entry</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="dashboard-grid">
        <Card className="summary-card glass-panel">
          <CardHeader>
            <CardTitle>Total income</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="amount-display text-success">${totalIncome.toLocaleString()}</h2>
            <p className="text-tertiary">This month</p>
          </CardContent>
        </Card>

        <Card className="allocation-card glass-panel">
          <CardHeader>
            <CardTitle>Allocation strategy</CardTitle>
            <Button
              variant="icon"
              onClick={() => setShowAllocationForm(!showAllocationForm)}
              aria-label="Edit allocation percentages"
              title="Edit allocations"
            >
              <Settings size={18} />
            </Button>
          </CardHeader>
          <CardContent className="allocation-content">
            {showAllocationForm ? (
              <form onSubmit={handleAllocationSave} className="allocation-form">
                <div className="form-group">
                  <label>Expenses (%)</label>
                  <input
                    type="number"
                    value={allocations.expenses}
                    onChange={e =>
                      setAllocations({ ...allocations, expenses: parseInt(e.target.value, 10) || 0 })
                    }
                    className="input-field"
                  />
                </div>
                <div className="form-group">
                  <label>Savings (%)</label>
                  <input
                    type="number"
                    value={allocations.savings}
                    onChange={e =>
                      setAllocations({ ...allocations, savings: parseInt(e.target.value, 10) || 0 })
                    }
                    className="input-field"
                  />
                </div>
                <div className="form-group">
                  <label>Investments (%)</label>
                  <input
                    type="number"
                    value={allocations.investments}
                    onChange={e =>
                      setAllocations({ ...allocations, investments: parseInt(e.target.value, 10) || 0 })
                    }
                    className="input-field"
                  />
                </div>
                <Button variant="primary" type="submit" className="mt-1" aria-label="Save allocations">
                  <Save size={18} />
                  <span>Save</span>
                </Button>
              </form>
            ) : (
              <>
                <div
                  className="donut-chart-container"
                  style={
                    {
                      ['--donut-a1' as string]: `${allocations.expenses * 3.6}deg`,
                      ['--donut-a2' as string]: `${(allocations.expenses + allocations.savings) * 3.6}deg`,
                    } as CSSProperties
                  }
                >
                  <div className="donut-chart-ring" aria-hidden />
                  <div className="donut-chart" />
                  <div className="donut-inner">
                    <span className="donut-inner-label">Your split</span>
                  </div>
                </div>
                <div className="allocation-legend">
                  <div className="legend-item">
                    <span className="legend-color expenses" />
                    <span>
                      Expenses ({allocations.expenses}%) - $
                      {(totalIncome * allocations.expenses / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color savings" />
                    <span>
                      Savings ({allocations.savings}%) - $
                      {(totalIncome * allocations.savings / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color investments" />
                    <span>
                      Investments ({allocations.investments}%) - $
                      {(totalIncome * allocations.investments / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel mt-6">
        <CardHeader>
          <CardTitle>Recent entries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="empty-table-cell">
                    <div className="empty-state-inline">
                      <Wallet size={28} strokeWidth={1.5} aria-hidden />
                      <span>No income entries yet. Add salary, freelance, or other sources to see them here.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                incomes.map(income => (
                  <TableRow key={income.id}>
                    <TableCell className="font-medium">{income.source}</TableCell>
                    <TableCell>
                      <span className={`badge badge-${income.type.toLowerCase()}`}>{income.type}</span>
                    </TableCell>
                    <TableCell className="text-secondary">
                      {new Date(income.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-success font-medium">
                      +${income.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="icon"
                        onClick={() => handleDelete(income.id)}
                        aria-label={`Delete ${income.source}`}
                        title="Delete"
                      >
                        <Trash2 size={18} className="icon-delete" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
