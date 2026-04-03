import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AssetType } from '../utils/assetTypes';
import { normalizeAssetType } from '../utils/assetTypes';

const STORAGE_KEY = 'ledger-app-data-v1';

export type IncomeEntry = {
  id: number;
  source: string;
  amount: number;
  type: string;
  date: string;
};

export type PaymentMethod = 'Cash' | 'Credit card';

export type DailySpend = {
  id: number;
  title: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod: PaymentMethod;
};

export type Installment = {
  id: number;
  title: string;
  total: number;
  paid: number;
  remaining: number;
  months_total: number;
  months_paid: number;
};

export type FixedCost = {
  id: number;
  title: string;
  amount: number;
  icon: string;
  color: string;
  paymentMethod: PaymentMethod;
};

export type Asset = {
  id: number;
  name: string;
  type: AssetType;
  /** Quantity held */
  units: number;
  /** Price per unit (market) */
  value: number;
};

export type AssetOrder = {
  id: number;
  side: 'buy' | 'sell';
  assetName: string;
  assetType: AssetType;
  units: number;
  pricePerUnit: number;
  /** Settlement date YYYY-MM-DD (local) */
  date: string;
};

export type ScheduledPayment = {
  id: number;
  title: string;
  amount: number;
  type: 'Income' | 'Expense';
  status: 'Pending' | 'Approved';
  date: string;
  /** Rolled-up card charges due on `date` (1st of month after spend month). */
  source?: 'manual' | 'credit_card_aggregate';
  /** `YYYY-MM` — statement month key matching the scheduled due month. */
  aggregateMonth?: string;
};

export type Allocations = {
  expenses: number;
  savings: number;
  investments: number;
};

export type AppDataState = {
  incomes: IncomeEntry[];
  dailySpends: DailySpend[];
  installments: Installment[];
  fixedCosts: FixedCost[];
  assets: Asset[];
  assetOrders: AssetOrder[];
  scheduledPayments: ScheduledPayment[];
  allocations: Allocations;
  expenseCategories: string[];
  liquidCash: number;
};

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Other'];

const defaultState: AppDataState = {
  incomes: [
    { id: 1, source: 'Salary', amount: 4500, type: 'Fixed', date: '2025-10-01' },
    { id: 2, source: 'Freelance Design', amount: 800, type: 'Variable', date: '2025-10-15' },
    { id: 3, source: 'Dividend Payout', amount: 150, type: 'Variable', date: '2025-10-20' },
  ],
  dailySpends: [
    {
      id: 1,
      title: 'Groceries',
      amount: 85.5,
      category: 'Food',
      date: '2025-10-24',
      paymentMethod: 'Credit card',
    },
    {
      id: 2,
      title: 'Uber',
      amount: 15.0,
      category: 'Transport',
      date: '2025-10-23',
      paymentMethod: 'Credit card',
    },
    {
      id: 3,
      title: 'Coffee',
      amount: 4.5,
      category: 'Food',
      date: '2025-10-23',
      paymentMethod: 'Cash',
    },
  ],
  installments: [
    {
      id: 1,
      title: 'MacBook Pro',
      total: 2400,
      paid: 800,
      remaining: 1600,
      months_total: 12,
      months_paid: 4,
    },
    {
      id: 2,
      title: 'Vacation Flight',
      total: 600,
      paid: 200,
      remaining: 400,
      months_total: 3,
      months_paid: 1,
    },
  ],
  fixedCosts: [
    {
      id: 1,
      title: 'Rent',
      amount: 1500,
      icon: '🏠',
      color: 'bg-blue',
      paymentMethod: 'Credit card',
    },
    {
      id: 2,
      title: 'Utilities',
      amount: 120,
      icon: '⚡',
      color: 'bg-purple',
      paymentMethod: 'Credit card',
    },
    {
      id: 3,
      title: 'Subscriptions',
      amount: 45,
      icon: '🎵',
      color: 'bg-red',
      paymentMethod: 'Credit card',
    },
  ],
  assets: [
    { id: 1, name: 'S&P 500 ETF', type: 'Funds', units: 10.5, value: 450.2 },
    { id: 2, name: 'Tech Growth Fund', type: 'Funds', units: 150, value: 25.1 },
    { id: 3, name: 'Apple Inc.', type: 'Stocks', units: 15, value: 175.5 },
    { id: 4, name: 'Bitcoin', type: 'Crypto', units: 0.15, value: 65000 },
    { id: 5, name: 'Ethereum', type: 'Crypto', units: 2.5, value: 3400 },
    { id: 6, name: 'Gold bullion', type: 'Gold', units: 2, value: 2650 },
  ],
  assetOrders: [
    {
      id: 101,
      side: 'buy',
      assetName: 'Ethereum',
      assetType: 'Crypto',
      units: 1,
      pricePerUnit: 3200,
      date: '2026-01-12',
    },
    {
      id: 102,
      side: 'sell',
      assetName: 'Tech Growth Fund',
      assetType: 'Funds',
      units: 25,
      pricePerUnit: 24.8,
      date: '2026-02-03',
    },
    {
      id: 103,
      side: 'buy',
      assetName: 'Gold bullion',
      assetType: 'Gold',
      units: 0.5,
      pricePerUnit: 2580,
      date: '2026-03-05',
    },
  ],
  scheduledPayments: [
    { id: 1, title: 'Rent Payment', amount: 1500, type: 'Expense', status: 'Pending', date: '2025-11-01' },
    { id: 2, title: 'Salary', amount: 4500, type: 'Income', status: 'Approved', date: '2025-11-01' },
    { id: 3, title: 'Internet Bill', amount: 80, type: 'Expense', status: 'Pending', date: '2025-11-05' },
    {
      id: 4,
      title: 'Credit card statement (Nov 2025)',
      amount: 100.5,
      type: 'Expense',
      status: 'Pending',
      date: '2025-11-01',
      source: 'credit_card_aggregate',
      aggregateMonth: '2025-11',
    },
  ],
  allocations: { expenses: 50, savings: 30, investments: 20 },
  expenseCategories: [...DEFAULT_CATEGORIES],
  /* Reflects cash day spend only; sample CC lines roll into scheduled statement */
  liquidCash: 12550.5,
};

function cloneDefault(): AppDataState {
  return JSON.parse(JSON.stringify(defaultState)) as AppDataState;
}

function normalizePaymentMethod(v: unknown): PaymentMethod {
  return v === 'Credit card' ? 'Credit card' : 'Cash';
}

function loadState(): AppDataState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefault();
    const parsed = JSON.parse(raw) as Partial<AppDataState>;
    return {
      ...defaultState,
      ...parsed,
      incomes: Array.isArray(parsed.incomes) ? parsed.incomes : defaultState.incomes,
      dailySpends: Array.isArray(parsed.dailySpends)
        ? parsed.dailySpends.map(d => ({
            ...d,
            paymentMethod: normalizePaymentMethod(
              (d as DailySpend).paymentMethod
            ),
          }))
        : defaultState.dailySpends,
      installments: Array.isArray(parsed.installments) ? parsed.installments : defaultState.installments,
      fixedCosts: Array.isArray(parsed.fixedCosts)
        ? parsed.fixedCosts.map(f => ({
            ...f,
            paymentMethod: normalizePaymentMethod(
              (f as FixedCost).paymentMethod
            ),
          }))
        : defaultState.fixedCosts,
      assets: Array.isArray(parsed.assets)
        ? parsed.assets.map(a => {
            const raw = a as Asset & { growth?: number };
            const { growth: _g, ...rest } = raw;
            return {
              ...rest,
              type: normalizeAssetType(String(raw.type)),
            };
          })
        : defaultState.assets,
      assetOrders: Array.isArray(parsed.assetOrders)
        ? parsed.assetOrders.map(o => {
            const row = o as AssetOrder;
            return {
              ...row,
              assetType: normalizeAssetType(String(row.assetType)),
              side: row.side === 'sell' ? 'sell' : 'buy',
            };
          })
        : defaultState.assetOrders,
      scheduledPayments: Array.isArray(parsed.scheduledPayments)
        ? parsed.scheduledPayments
        : defaultState.scheduledPayments,
      expenseCategories:
        Array.isArray(parsed.expenseCategories) && parsed.expenseCategories.length > 0
          ? parsed.expenseCategories
          : [...DEFAULT_CATEGORIES],
      allocations: parsed.allocations ?? defaultState.allocations,
      liquidCash: typeof parsed.liquidCash === 'number' ? parsed.liquidCash : defaultState.liquidCash,
    };
  } catch {
    return cloneDefault();
  }
}

type AppDataContextValue = AppDataState & {
  setIncomes: React.Dispatch<React.SetStateAction<IncomeEntry[]>>;
  setDailySpends: React.Dispatch<React.SetStateAction<DailySpend[]>>;
  setInstallments: React.Dispatch<React.SetStateAction<Installment[]>>;
  setFixedCosts: React.Dispatch<React.SetStateAction<FixedCost[]>>;
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  setAssetOrders: React.Dispatch<React.SetStateAction<AssetOrder[]>>;
  setScheduledPayments: React.Dispatch<React.SetStateAction<ScheduledPayment[]>>;
  setAllocations: React.Dispatch<React.SetStateAction<Allocations>>;
  setExpenseCategories: React.Dispatch<React.SetStateAction<string[]>>;
  setLiquidCash: React.Dispatch<React.SetStateAction<number>>;
  /** Sum of all income entries (Income page totals). */
  monthlyIncomeTotal: number;
  /** Sum of fixed-type income only — used for net worth forecast / budgeting. */
  monthlyFixedIncomeTotal: number;
  /** Fixed + installment monthly + sum of tracked daily spends (monthly variable bucket). */
  monthlyExpenseTotal: number;
  portfolioValue: number;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const initialRef = useRef<AppDataState | null>(null);
  if (!initialRef.current) initialRef.current = loadState();
  const s0 = initialRef.current;

  const [incomes, setIncomes] = useState<IncomeEntry[]>(s0.incomes);
  const [dailySpends, setDailySpends] = useState<DailySpend[]>(s0.dailySpends);
  const [installments, setInstallments] = useState<Installment[]>(s0.installments);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>(s0.fixedCosts);
  const [assets, setAssets] = useState<Asset[]>(s0.assets);
  const [assetOrders, setAssetOrders] = useState<AssetOrder[]>(s0.assetOrders ?? []);
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>(s0.scheduledPayments);
  const [allocations, setAllocations] = useState<Allocations>(s0.allocations);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(s0.expenseCategories);
  const [liquidCash, setLiquidCash] = useState<number>(s0.liquidCash);

  const persist = useCallback(() => {
    const state: AppDataState = {
      incomes,
      dailySpends,
      installments,
      fixedCosts,
      assets,
      assetOrders,
      scheduledPayments,
      allocations,
      expenseCategories,
      liquidCash,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota */
    }
  }, [
    incomes,
    dailySpends,
    installments,
    fixedCosts,
    assets,
    assetOrders,
    scheduledPayments,
    allocations,
    expenseCategories,
    liquidCash,
  ]);

  useEffect(() => {
    persist();
  }, [persist]);

  const monthlyIncomeTotal = useMemo(
    () => incomes.reduce((acc, i) => acc + i.amount, 0),
    [incomes]
  );

  const monthlyFixedIncomeTotal = useMemo(
    () =>
      incomes
        .filter(i => i.type.toLowerCase() === 'fixed')
        .reduce((acc, i) => acc + i.amount, 0),
    [incomes]
  );

  const monthlyExpenseTotal = useMemo(() => {
    const fixed = fixedCosts.reduce((acc, f) => acc + f.amount, 0);
    const installmentMonthly = installments.reduce(
      (acc, inst) => acc + inst.total / Math.max(1, inst.months_total),
      0
    );
    const dailyBucket = dailySpends.reduce((acc, d) => acc + d.amount, 0);
    return fixed + installmentMonthly + dailyBucket;
  }, [fixedCosts, installments, dailySpends]);

  const portfolioValue = useMemo(
    () => assets.reduce((acc, a) => acc + a.units * a.value, 0),
    [assets]
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      incomes,
      dailySpends,
      installments,
      fixedCosts,
      assets,
      assetOrders,
      scheduledPayments,
      allocations,
      expenseCategories,
      liquidCash,
      setIncomes,
      setDailySpends,
      setInstallments,
      setFixedCosts,
      setAssets,
      setAssetOrders,
      setScheduledPayments,
      setAllocations,
      setExpenseCategories,
      setLiquidCash,
      monthlyIncomeTotal,
      monthlyFixedIncomeTotal,
      monthlyExpenseTotal,
      portfolioValue,
    }),
    [
      incomes,
      dailySpends,
      installments,
      fixedCosts,
      assets,
      assetOrders,
      scheduledPayments,
      allocations,
      expenseCategories,
      liquidCash,
      monthlyIncomeTotal,
      monthlyFixedIncomeTotal,
      monthlyExpenseTotal,
      portfolioValue,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
