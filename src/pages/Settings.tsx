import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tag, Plus, Trash2, Wallet } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import './Settings.css';

export default function Settings() {
  const {
    expenseCategories,
    setExpenseCategories,
    liquidCash,
    setLiquidCash,
    dailySpends,
  } = useAppData();
  const [newCategory, setNewCategory] = useState('');
  const [cashInput, setCashInput] = useState(String(liquidCash));

  useEffect(() => {
    setCashInput(String(liquidCash));
  }, [liquidCash]);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    if (expenseCategories.some(c => c.toLowerCase() === name.toLowerCase())) {
      setNewCategory('');
      return;
    }
    setExpenseCategories(prev => [...prev, name]);
    setNewCategory('');
  };

  const handleRemoveCategory = (name: string) => {
    if (expenseCategories.length <= 1) return;
    const inUse = dailySpends.some(d => d.category === name);
    if (inUse) {
      window.alert(
        `Cannot remove "${name}" while it is used by day spendings. Re-categorize those entries first.`
      );
      return;
    }
    setExpenseCategories(prev => prev.filter(c => c !== name));
  };

  const handleSaveLiquid = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(cashInput.replace(/,/g, ''));
    if (Number.isFinite(n) && n >= 0) {
      setLiquidCash(n);
    }
  };

  return (
    <div className="page-layout">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Workspace</p>
          <h1 className="page-title-display">Settings</h1>
          <p className="text-secondary mt-1">
            Manage expense categories and your liquid cash baseline used in overview forecasts.
          </p>
        </div>
      </header>

      <div className="settings-grid">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="settings-card-title">
              <Tag size={20} className="text-accent" />
              Expense categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-secondary text-sm mb-4">
              Categories listed here appear when you add a day spending. You need at least one category.
            </p>
            <form onSubmit={handleAddCategory} className="settings-inline-form">
              <input
                type="text"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="input-field"
                placeholder="New category name"
                maxLength={40}
              />
              <Button variant="primary" type="submit" aria-label="Add category">
                <Plus size={18} />
                <span>Add</span>
              </Button>
            </form>
            <ul className="category-list">
              {expenseCategories.map(cat => (
                <li key={cat} className="category-row">
                  <span className="category-name">{cat}</span>
                  <Button
                    variant="icon"
                    type="button"
                    onClick={() => handleRemoveCategory(cat)}
                    disabled={expenseCategories.length <= 1}
                    aria-label={`Remove ${cat}`}
                    title="Remove category"
                  >
                    <Trash2 size={18} />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="settings-card-title">
              <Wallet size={20} className="text-success" />
              Liquid cash baseline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-secondary text-sm mb-4">
              Used as starting cash in <strong className="text-accent">Total liquid cash</strong> and in the net worth
              forecast (together with your investment portfolio value).
            </p>
            <form onSubmit={handleSaveLiquid} className="settings-inline-form">
              <input
                type="number"
                min={0}
                step="0.01"
                value={cashInput}
                onChange={e => setCashInput(e.target.value)}
                className="input-field"
              />
              <Button variant="primary" type="submit" aria-label="Save liquid cash">
                <span>Save</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
