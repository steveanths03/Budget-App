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
  initialBalance: number;
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
}

const STORAGE_KEY = 'budget_app_v1';

const uid = () => Math.random().toString(36).slice(2);

export const useStore = create<AppStore>((set, get) => ({
  db: SEED_DATA as DB,
  liveRates: { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5, JPY: 149.5, AUD: 1.53, CAD: 1.36 },
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ db: { ...SEED_DATA, ...parsed }, loaded: true });
      } else {
        set({ loaded: true });
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
}));
