import type { ScheduledPayment } from '../context/AppDataContext';
import { parseLocalDate } from './scheduleDates';

/**
 * Card spend in calendar month M rolls into one pending expense due on the 1st of month M+1
 * (upcoming month's statement / extract).
 */
export function getCreditCardStatementMeta(expenseDateIso: string): {
  dueDate: string;
  aggregateMonth: string;
  titleLabel: string;
} {
  const d = parseLocalDate(expenseDateIso);
  const due = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const y = due.getFullYear();
  const m = due.getMonth() + 1;
  const dueDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const aggregateMonth = `${y}-${String(m).padStart(2, '0')}`;
  const titleLabel = due.toLocaleString('default', { month: 'short', year: 'numeric' });
  return { dueDate, aggregateMonth, titleLabel };
}

/** Add or subtract from the pending aggregate line for the statement month; remove if amount <= 0. */
export function applyCreditCardScheduleDelta(
  prev: ScheduledPayment[],
  delta: number,
  expenseDateIso: string
): ScheduledPayment[] {
  if (delta === 0) return prev;
  const { dueDate, aggregateMonth, titleLabel } = getCreditCardStatementMeta(expenseDateIso);
  const title = `Credit card statement (${titleLabel})`;
  const idx = prev.findIndex(
    p =>
      p.source === 'credit_card_aggregate' &&
      p.aggregateMonth === aggregateMonth &&
      p.status === 'Pending' &&
      p.type === 'Expense'
  );

  if (idx === -1) {
    if (delta <= 0) return prev;
    return [
      ...prev,
      {
        id: Date.now(),
        title,
        amount: Math.round(delta * 100) / 100,
        type: 'Expense' as const,
        status: 'Pending' as const,
        date: dueDate,
        source: 'credit_card_aggregate',
        aggregateMonth,
      },
    ];
  }

  const existing = prev[idx];
  const newAmount = Math.round((existing.amount + delta) * 100) / 100;
  if (newAmount <= 0) {
    return prev.filter((_, i) => i !== idx);
  }
  return prev.map((p, i) =>
    i === idx
      ? { ...p, amount: newAmount, title, date: dueDate, aggregateMonth }
      : p
  );
}
