import { CURRENCIES } from '../constants/theme';

let LIVE_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5, JPY: 149.5, AUD: 1.53, CAD: 1.36,
};

export const setRates = (rates: Record<string, number>) => { LIVE_RATES = rates; };

export const cvt = (usdVal: number, toCurrency: string, rates?: Record<string, number>) => {
  const r = rates || LIVE_RATES;
  return usdVal * (r[toCurrency] || 1);
};

export const toUSD = (displayVal: number, fromCurrency: string, rates?: Record<string, number>) => {
  const r = rates || LIVE_RATES;
  return displayVal / (r[fromCurrency] || 1);
};

export const fmtC = (
  usdVal: number | null | undefined,
  currency: string,
  rates?: Record<string, number>,
): string => {
  if (usdVal == null) return '';
  const cur = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  const val = cvt(Math.abs(usdVal), currency, rates);
  const decimals = currency === 'JPY' ? 0 : 2;
  return `${cur.symbol}${val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

export const uid = () => Math.random().toString(36).slice(2);

export const pad = (n: number) => String(n).padStart(2, '0');

export const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export const monthEnd = (mIdx: number, y: number) =>
  [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mIdx];

export const todayStr = () => new Date().toISOString().slice(0, 10);
