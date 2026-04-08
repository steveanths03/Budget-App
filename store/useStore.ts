// store/useStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

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

const BUDGET_CATEGORIES = ['expenses', 'bills', 'savings', 'debts', 'subscriptions'] as const;

interface AppStore {
  db: DB;
  liveRates: Record<string, number>;
  loaded: boolean;
  session: Session | null;
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
  getMonthlyBalance: (year: number, month: number) => number;
  getCarryForwardBalance: (year: number, month: number) => number;
  getOverallBalance: () => number;
}

const uid = () => Math.random().toString(36).slice(2);

const emptyDb = (): DB => {
  const today = new Date();
  return {
    income: [], expenses: [], bills: [], savings: [], debts: [], subscriptions: [],
    transactions: [],
    initialBalance: 0,
    currency: 'USD',
    month: today.getMonth(),
    year: today.getFullYear(),
  };
};

// ── Seed template (names only, all values zero) ──────────────────────

const SEED_TEMPLATE = {
  income: [
    'Salary',
    'Freelance',
    'Other Income',
  ],
  expenses: [
    'Groceries',
    'Dining Out',
    'Takeaways',
    'Gas',
    'Public Transport',
    'Clothing & Accessories',
    'Movies',
    'Hobbies',
    'Books',
    'Gym Membership',
    'Haircuts / Salon',
    'Travel & Vacations',
    'Gifts',
    'Pet Care',
  ],
  bills: [
    'Rent',
    'Electricity',
    'Water',
    'Gas / Heating',
    'Internet',
    'Mobile',
    'Health Insurance',
    'Car Insurance',
  ],
  savings: [
    'Emergency Fund',
    'Retirement Savings',
    'Travel Fund',
    'Education Fund',
  ],
  debts: [
    'Credit Card',
    'Student Loan',
    'Car Loan',
    'Personal Loan',
  ],
  subscriptions: [
    'Netflix',
    'Spotify',
    'Disney+',
    'Other Subscription',
  ],
};

async function seedNewUser(userId: string) {
  // Income rows
  const incomeInserts = SEED_TEMPLATE.income.map(source => ({
    id: uid(), user_id: userId, source, expected: 0, real: 0,
  }));

  // Budget rows for all categories
  const budgetInserts = BUDGET_CATEGORIES.flatMap(category =>
    SEED_TEMPLATE[category].map(sub => ({
      id: uid(), user_id: userId, category, sub, budget: 0, real: 0,
    }))
  );

  await Promise.all([
    supabase.from('income_rows').insert(incomeInserts),
    supabase.from('budget_rows').insert(budgetInserts),
    supabase.from('user_settings').upsert({
      user_id: userId,
      currency: 'USD',
      month: new Date().getMonth(),
      year: new Date().getFullYear(),
      initial_balance: 0,
    }, { onConflict: 'user_id' }),
  ]);
}

// ── Supabase read helpers ────────────────────────────────────────────

async function loadFromSupabase(userId: string): Promise<DB> {
  const today = new Date();

  const [settingsRes, incomeRes, budgetRes, txnsRes] = await Promise.all([
    supabase.from('user_settings').select('*').eq('user_id', userId).single(),
    supabase.from('income_rows').select('*').eq('user_id', userId),
    supabase.from('budget_rows').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
  ]);

  const incomeRows = incomeRes.data;
  const budgetRows = budgetRes.data;

  // First login — seed template data
  if (!budgetRows?.length && !incomeRows?.length) {
    await seedNewUser(userId);
    return loadFromSupabase(userId);
  }

  const income: IncomeRow[] = (incomeRows || []).map(r => ({
    id: r.id, source: r.source, expected: r.expected, real: r.real,
  }));

  const makeBudgetCategory = (cat: string): BudgetRow[] =>
    (budgetRows || [])
      .filter(r => r.category === cat)
      .map(r => ({ id: r.id, sub: r.sub, budget: r.budget, real: r.real }));

  const transactions: Transaction[] = (txnsRes.data || []).map(r => ({
    id: r.id, date: r.date, amount: r.amount,
    category: r.category, subCategory: r.sub_category, description: r.description || '',
  }));

  return {
    income,
    expenses:      makeBudgetCategory('expenses'),
    bills:         makeBudgetCategory('bills'),
    savings:       makeBudgetCategory('savings'),
    debts:         makeBudgetCategory('debts'),
    subscriptions: makeBudgetCategory('subscriptions'),
    transactions,
    initialBalance: settingsRes.data?.initial_balance ?? 0,
    currency:       settingsRes.data?.currency ?? 'USD',
    month:          today.getMonth(),
    year:           today.getFullYear(),
  };
}

async function ensureSettings(userId: string, db: DB) {
  await supabase.from('user_settings').upsert({
    user_id: userId,
    currency: db.currency,
    month: db.month,
    year: db.year,
    initial_balance: db.initialBalance,
  }, { onConflict: 'user_id' });
}

// ── Store ────────────────────────────────────────────────────────────

export const useStore = create<AppStore>((set, get) => ({
  db: emptyDb(),
  liveRates: { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5, JPY: 149.5, AUD: 1.53, CAD: 1.36 },
  loaded: false,
  session: null,

  load: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session });

    if (session?.user) {
      try {
        const db = await loadFromSupabase(session.user.id);
        set({ db, loaded: true });
      } catch (e) {
        console.error('Supabase load failed:', e);
        set({ db: emptyDb(), loaded: true });
      }
    } else {
      set({ db: emptyDb(), loaded: true });
    }

    get().fetchRates();

    supabase.auth.onAuthStateChange(async (event, session) => {
      set({ session });
      if (session?.user) {
        try {
          const db = await loadFromSupabase(session.user.id);
          set({ db });
        } catch (e) {
          console.error('Supabase reload failed:', e);
        }
      } else {
        set({ db: emptyDb() });
      }
    });
  },

  persist: (db: DB) => {
    set({ db });
    const session = get().session;
    if (!session?.user) return;
    ensureSettings(session.user.id, db).catch(console.error);
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
    const newRow = { ...row, id: row.id || uid() };
    const arr = (db[key] as any[]) || [];
    set({ db: { ...db, [key]: [...arr, newRow] } });

    const session = get().session;
    if (!session?.user) return;
    const userId = session.user.id;

    if (key === 'income') {
      supabase.from('income_rows').insert({
        id: newRow.id, user_id: userId,
        source: newRow.source, expected: newRow.expected, real: newRow.real ?? 0,
      }).then(({ error }) => { if (error) console.error(error); });
    } else if (BUDGET_CATEGORIES.includes(key as any)) {
      supabase.from('budget_rows').insert({
        id: newRow.id, user_id: userId,
        category: key, sub: newRow.sub, budget: newRow.budget, real: newRow.real ?? 0,
      }).then(({ error }) => { if (error) console.error(error); });
    }
  },

  editRow: (key, id, patch) => {
    const db = get().db;
    const arr = (db[key] as any[]).map((r: any) => r.id === id ? { ...r, ...patch } : r);
    set({ db: { ...db, [key]: arr } });

    const session = get().session;
    if (!session?.user) return;

    if (key === 'income') {
      const mapped: any = {};
      if (patch.source !== undefined) mapped.source = patch.source;
      if (patch.expected !== undefined) mapped.expected = patch.expected;
      if (patch.real !== undefined) mapped.real = patch.real;
      supabase.from('income_rows').update(mapped).eq('id', id)
        .then(({ error }) => { if (error) console.error(error); });
    } else if (BUDGET_CATEGORIES.includes(key as any)) {
      const mapped: any = {};
      if (patch.sub !== undefined) mapped.sub = patch.sub;
      if (patch.budget !== undefined) mapped.budget = patch.budget;
      if (patch.real !== undefined) mapped.real = patch.real;
      supabase.from('budget_rows').update(mapped).eq('id', id)
        .then(({ error }) => { if (error) console.error(error); });
    }
  },

  deleteRow: (key, id) => {
    const db = get().db;
    const arr = (db[key] as any[]).filter((r: any) => r.id !== id);
    set({ db: { ...db, [key]: arr } });

    const session = get().session;
    if (!session?.user) return;

    const table = key === 'income' ? 'income_rows' : 'budget_rows';
    supabase.from(table).delete().eq('id', id)
      .then(({ error }) => { if (error) console.error(error); });
  },

  addTransaction: (txn) => {
    const db = get().db;
    set({ db: { ...db, transactions: [...db.transactions, txn] } });

    const session = get().session;
    if (!session?.user) return;

    supabase.from('transactions').insert({
      id: txn.id,
      user_id: session.user.id,
      date: txn.date,
      amount: txn.amount,
      category: txn.category,
      sub_category: txn.subCategory,
      description: txn.description || '',
    }).then(({ error }) => { if (error) console.error(error); });
  },

  editTransaction: (id, patch) => {
    const db = get().db;
    const transactions = db.transactions.map(t => t.id === id ? { ...t, ...patch } : t);
    set({ db: { ...db, transactions } });

    const session = get().session;
    if (!session?.user) return;

    const mapped: any = {};
    if (patch.date !== undefined) mapped.date = patch.date;
    if (patch.amount !== undefined) mapped.amount = patch.amount;
    if (patch.category !== undefined) mapped.category = patch.category;
    if (patch.subCategory !== undefined) mapped.sub_category = patch.subCategory;
    if (patch.description !== undefined) mapped.description = patch.description;

    supabase.from('transactions').update(mapped).eq('id', id)
      .then(({ error }) => { if (error) console.error(error); });
  },

  deleteTransaction: (id) => {
    const db = get().db;
    set({ db: { ...db, transactions: db.transactions.filter(t => t.id !== id) } });

    const session = get().session;
    if (!session?.user) return;

    supabase.from('transactions').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error(error); });
  },

  fetchRates: async () => {
    try {
      const r = await fetch('https://open.er-api.com/v6/latest/USD');
      const j = await r.json();
      if (j.rates) set({ liveRates: j.rates });
    } catch {}
  },

  getMonthlyBalance: (year, month) => {
    const { transactions } = get().db;
    const monthTxns = transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return monthTxns.filter(t => t.category === 'Income').reduce((s, t) => s + t.amount, 0)
         - monthTxns.filter(t => t.category !== 'Income').reduce((s, t) => s + t.amount, 0);
  },

  getCarryForwardBalance: (year, month) => {
    const { transactions, initialBalance } = get().db;
    const targetOrdinal = year * 12 + month;
    const prev = transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() * 12 + d.getMonth() < targetOrdinal;
    });
    return initialBalance
      + prev.filter(t => t.category === 'Income').reduce((s, t) => s + t.amount, 0)
      - prev.filter(t => t.category !== 'Income').reduce((s, t) => s + t.amount, 0);
  },

  getOverallBalance: () => {
    const { transactions, initialBalance } = get().db;
    return initialBalance
      + transactions.filter(t => t.category === 'Income').reduce((s, t) => s + t.amount, 0)
      - transactions.filter(t => t.category !== 'Income').reduce((s, t) => s + t.amount, 0);
  },
}));