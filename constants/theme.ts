// constants/theme.ts

export const DarkColors = {
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

  isDark: true,
};

export const LightColors = {
  bg: '#f0f4f8',
  card: '#ffffff',
  border: '#d1dde8',
  borderDim: '#e4ecf4',
  surface: '#e8f0f8',

  text: '#2a3f55',
  textDim: '#7a99b8',
  textBright: '#0d1117',
  accent: '#0e9fc7',

  income: '#c9920a',
  expenses: '#007a5e',
  bills: '#6d4fcf',
  savings: '#0e87bf',
  debts: '#c4254e',
  subscriptions: '#d4660a',

  positive: '#007a5e',
  negative: '#c4254e',

  isDark: false,
};

// Default export — will be overridden by ThemeContext at runtime
export let Colors = DarkColors;

export const CAT_COLOR_DARK: Record<string, string> = {
  Income: '#f5c842',
  Expenses: '#00c896',
  Bills: '#a78bfa',
  Savings: '#38bdf8',
  Debts: '#e84474',
  Subscriptions: '#fb923c',
};

export const CAT_COLOR_LIGHT: Record<string, string> = {
  Income: '#c9920a',
  Expenses: '#007a5e',
  Bills: '#6d4fcf',
  Savings: '#0e87bf',
  Debts: '#c4254e',
  Subscriptions: '#d4660a',
};

// Static fallback — components should use useTheme() instead
export const CAT_COLOR: Record<string, string> = CAT_COLOR_DARK;

export const CATEGORY_LIST = ['Income', 'Expenses', 'Bills', 'Savings', 'Debts', 'Subscriptions'];

export const CURRENCIES = [
  { code: 'USD', symbol: '$',  name: 'US Dollar' },
  { code: 'EUR', symbol: '€',  name: 'Euro' },
  { code: 'GBP', symbol: '£',  name: 'British Pound' },
  { code: 'INR', symbol: '₹',  name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥',  name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export const YEARS = Array.from({ length: 10 }, (_, i) => 2020 + i);