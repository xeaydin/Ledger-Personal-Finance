/** Parse YYYY-MM-DD as local calendar date (no UTC shift). */
export function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Last day of the 30-day forward window from today (inclusive of today as day 0). */
export function endOfNearExpenseWindow(from: Date = new Date()): Date {
  const t = startOfLocalDay(from);
  const end = new Date(t);
  end.setDate(end.getDate() + 30);
  return end;
}

/**
 * Pending expense counts toward "pending outflows" if due is not more than 30 days after today.
 * Overdue (due before today) counts.
 */
export function isPendingExpenseInNearWindow(dueDateStr: string, from: Date = new Date()): boolean {
  const due = startOfLocalDay(parseLocalDate(dueDateStr));
  const end = endOfNearExpenseWindow(from);
  return due.getTime() <= end.getTime();
}

/** Due more than 30 days after today — show separately, excluded from near-term pending total. */
export function isPendingExpenseFarFuture(dueDateStr: string, from: Date = new Date()): boolean {
  const due = startOfLocalDay(parseLocalDate(dueDateStr));
  const end = endOfNearExpenseWindow(from);
  return due.getTime() > end.getTime();
}
