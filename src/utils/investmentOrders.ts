import type { AssetOrder } from '../context/AppDataContext';

/** Inclusive start date (YYYY-MM-DD) for orders on or after this calendar day. */
export function getThreeMonthHistoryStartIso(from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setMonth(d.getMonth() - 3);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function filterOrdersLastThreeMonths(orders: AssetOrder[], from: Date = new Date()): AssetOrder[] {
  const start = getThreeMonthHistoryStartIso(from);
  return orders
    .filter(o => o.date >= start)
    .sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.id - a.id;
    });
}

export function todayLocalIso(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export function orderTotal(o: Pick<AssetOrder, 'units' | 'pricePerUnit'>): number {
  return Math.round(o.units * o.pricePerUnit * 100) / 100;
}
