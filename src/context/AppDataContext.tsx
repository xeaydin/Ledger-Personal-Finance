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

const STORAGE_KEY = 'ledger-app-data-v1';

export type IncomeEntry = {
  id: number;
  source: string;
  amount: number;
  type: string;
  date: string;
};

export type DailySpend = {
  id: number;
  title: string;
  amount: number;
  category: string;
  date: string;
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
};

export type Asset = {
  id: number;
  name: string;
  type: string;
  units: number;
  value: number;
  growth: number;
};

export type ScheduledPayment = {
  id: number;
  title: string;
  amount: number;
  type: 'Income' | 'Expense';
  status: 'Pending' | 'Approved';
  date: string;
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
    { id: 1, title: 'Groceries', amount: 85.5, category: 'Food', date: '2025-10-24' },
    { id: 2, title: 'Uber', amount: 15.0, category: 'Transport', date: '2025-10-23' },
    { id: 3, title: 'Coffee', amount: 4.5, category: 'Food', date: '2025-10-23' },
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
    { id: 1, title: 'Rent', amount: 1500, icon: '🏠', color: 'bg-blue' },
    { id: 2, title: 'Utilities', amount: 120, icon: '⚡', color: 'bg-purple' },
    { id: 3, title: 'Subscriptions', amount: 45, icon: '🎵', color: 'bg-red' },
  ],
  assets: [
    { id: 1, name: 'S&P 500 ETF', type: 'Fund', units: 10.5, value: 450.2, growth: 2.4 },
    { id: 2, name: 'Tech Growth Fund', type: 'Fund', units: 150, value: 25.1, growth: 5.1 },
    { id: 3, name: 'Apple Inc.', type: 'Stock', units: 15, value: 175.5, growth: -1.2 },
    { id: 4, name: 'Bitcoin', type: 'Crypto', units: 0.15, value: 65000, growth: 12.5 },
    { id: 5, name: 'Ethereum', type: 'Crypto', units: 2.5, value: 3400, growth: 4.8 },
  ],
  scheduledPayments: [
    { id: 1, title: 'Rent Payment', amount: 1500, type: 'Expense', status: 'Pending', date: '2025-11-01' },
    { id: 2, title: 'Salary', amount: 4500, type: 'Income', status: 'Approved', date: '2025-11-01' },
    { id: 3, title: 'Internet Bill', amount: 80, type: 'Expense', status: 'Pending', date: '2025-11-05' },
  ],
  allocations: { expenses: 50, savings: 30, investments: 20 },
  expenseCategories: [...DEFAULT_CATEGORIES],
  liquidCash: 12450,
};

function cloneDefault(): AppDataState {
  return JSON.parse(JSON.stringify(defaultState)) as AppDataState;
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
      dailySpends: Array.isArray(parsed.dailySpends) ? parsed.dailySpends : defaultState.dailySpends,
      installments: Array.isArray(parsed.installments) ? parsed.installments : defaultState.installments,
      fixedCosts: Array.isArray(parsed.fixedCosts) ? parsed.fixedCosts : defaultState.fixedCosts,
      assets: Array.isArray(parsed.assets) ? parsed.assets : defaultState.assets,
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
      scheduledPayments,
      allocations,
      expenseCategories,
      liquidCash,
      setIncomes,
      setDailySpends,
      setInstallments,
      setFixedCosts,
      setAssets,
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
