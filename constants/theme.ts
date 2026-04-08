export const Colors = {
  bg: '#0d1117',
  card: '#111927',
  border: '#1c2b3a',
  borderDim: '#0d1117',
  surface: '#0a1018',

  text: '#b8c8d8',
  textDim: '#3a5575',
  textBright: '#ffffff',
  accent: '#4ec9f0',

  income: '#f5c842',
  expenses: '#00c896',
  bills: '#a78bfa',
  savings: '#38bdf8',
  debts: '#e84474',
  subscriptions: '#fb923c',

  positive: '#00c896',
  negative: '#e84474',
};

export const CAT_COLOR: Record<string, string> = {
  Income: '#f5c842',
  Expenses: '#00c896',
  Bills: '#a78bfa',
  Savings: '#38bdf8',
  Debts: '#e84474',
  Subscriptions: '#fb923c',
};

export const CATEGORY_LIST = ['Income', 'Expenses', 'Bills', 'Savings', 'Debts', 'Subscriptions'];

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export const YEARS = Array.from({ length: 10 }, (_, i) => 2020 + i);
