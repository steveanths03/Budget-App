import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED_DATA } from '../constants/seed';

export type IncomeRow = { id: string; source: string; expected: number; real: number };
export type BudgetRow = { id: string; sub: string; budget: number; real: number };
export type Transaction = {
  id: string;
  date: string;
  amount: number;
  category: string;
  subCategory: string;
  description: string;
};

export interface DB {
  income: IncomeRow[];
  expenses: BudgetRow[];
  bills: BudgetRow[];
  savings: BudgetRow[];
  debts: BudgetRow[];
  subscriptions: BudgetRow[];
  transactions: Transaction[];
  initialBalance: number; // The user's all-time starting balance (set once)
  currency: string;
  month: number;
  year: number;
}

interface AppStore {
  db: DB;
  liveRates: Record<string, number>;
  loaded: boolean;
  load: () => Promise<void>;
  persist: (db: DB) => void;
  setMonth: (month: number) => void;
  setYear: (year: number) => void;
  setCurrency: (code: string) => void;
  setInitialBalance: (val: number) => void;
  addRow: (key: keyof DB, row: any) => void;
  editRow: (key: keyof DB, id: string, patch: any) => void;
  deleteRow: (key: keyof DB, id: string) => void;
  addTransaction: (txn: Transaction) => void;
  editTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  fetchRates: () => Promise<void>;

  // Computed balance helpers (pure functions, not stored)
  getMonthlyBalance: (year: number, month: number) => number;
  getCarryForwardBalance: (year: number, month: number) => number;
  getOverallBalance: () => number;
}

const STORAGE_KEY = 'budget_app_v2';

const uid = () => Math.random().toString(36).slice(2);

export const useStore = create<AppStore>((set, get) => ({
  db: SEED_DATA as DB,
  liveRates: { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5, JPY: 149.5, AUD: 1.53, CAD: 1.36 },
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      if (raw) {
        const parsed = JSON.parse(raw);
        // Always keep month/year in sync with current date on load
        const merged = {
          ...SEED_DATA,
          ...parsed,
          month: currentMonth,
          year: currentYear,
        };
        set({ db: merged, loaded: true });
      } else {
        // Fresh install: set current month/year
        const freshDb = {
          ...(SEED_DATA as DB),
          month: currentMonth,
          year: currentYear,
        };
        set({ db: freshDb, loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
    get().fetchRates();
  },

  persist: (db: DB) => {
    set({ db });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db)).catch(() => {});
  },

  setMonth: (month) => {
    const db = { ...get().db, month };
    get().persist(db);
  },

  setYear: (year) => {
    const db = { ...get().db, year };
    get().persist(db);
  },

  setCurrency: (currency) => {
    const db = { ...get().db, currency };
    get().persist(db);
  },

  setInitialBalance: (initialBalance) => {
    const db = { ...get().db, initialBalance };
    get().persist(db);
  },

  addRow: (key, row) => {
    const db = get().db;
    const arr = (db[key] as any[]) || [];
    get().persist({ ...db, [key]: [...arr, { ...row, id: uid() }] });
  },

  editRow: (key, id, patch) => {
    const db = get().db;
    const arr = (db[key] as any[]).map((r: any) => r.id === id ? { ...r, ...patch } : r);
    get().persist({ ...db, [key]: arr });
  },

  deleteRow: (key, id) => {
    const db = get().db;
    const arr = (db[key] as any[]).filter((r: any) => r.id !== id);
    get().persist({ ...db, [key]: arr });
  },

  addTransaction: (txn) => {
    const db = get().db;
    get().persist({ ...db, transactions: [...db.transactions, txn] });
  },

  editTransaction: (id, patch) => {
    const db = get().db;
    const transactions = db.transactions.map(t => t.id === id ? { ...t, ...patch } : t);
    get().persist({ ...db, transactions });
  },

  deleteTransaction: (id) => {
    const db = get().db;
    get().persist({ ...db, transactions: db.transactions.filter(t => t.id !== id) });
  },

  fetchRates: async () => {
    try {
      const r = await fetch('https://open.er-api.com/v6/latest/USD');
      const j = await r.json();
      if (j.rates) {
        set({ liveRates: j.rates });
      }
    } catch {}
  },

  /**
   * Net for a specific month: income - all outflows
   */
  getMonthlyBalance: (year: number, month: number) => {
    const { transactions } = get().db;
    const monthTxns = transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const income = monthTxns
      .filter(t => t.category === 'Income')
      .reduce((s, t) => s + t.amount, 0);
    const out = monthTxns
      .filter(t => t.category !== 'Income')
      .reduce((s, t) => s + t.amount, 0);
    return income - out;
  },

  /**
   * Balance carried forward INTO a given month =
   *   initialBalance + sum of all monthly nets for every month BEFORE this one
   *
   * Months are compared chronologically: all transactions whose year/month
   * is strictly before (year, month) are included.
   */
  getCarryForwardBalance: (year: number, month: number) => {
    const { transactions, initialBalance } = get().db;

    // Target ordinal: year * 12 + month
    const targetOrdinal = year * 12 + month;

    const prevTxns = transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      const ordinal = d.getFullYear() * 12 + d.getMonth();
      return ordinal < targetOrdinal;
    });

    const prevIncome = prevTxns
      .filter(t => t.category === 'Income')
      .reduce((s, t) => s + t.amount, 0);
    const prevOut = prevTxns
      .filter(t => t.category !== 'Income')
      .reduce((s, t) => s + t.amount, 0);

    return initialBalance + prevIncome - prevOut;
  },

  /**
   * Overall balance = initialBalance + ALL transactions net (all time)
   */
  getOverallBalance: () => {
    const { transactions, initialBalance } = get().db;
    const allIn = transactions
      .filter(t => t.category === 'Income')
      .reduce((s, t) => s + t.amount, 0);
    const allOut = transactions
      .filter(t => t.category !== 'Income')
      .reduce((s, t) => s + t.amount, 0);
    return initialBalance + allIn - allOut;
  },
}));