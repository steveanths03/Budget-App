// app/analytics.tsx
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { useTheme } from '../context/ThemeContext';
import { MONTHS } from '../constants/theme';
import { fmtC } from '../utils/format';

const { width: SW } = Dimensions.get('window');

/* ── Mini bar chart ─────────────────────────────────────── */
const BarChart = ({
  data, color, colors,
}: {
  data: { label: string; budget: number; real: number }[];
  color: string;
  colors: any;
}) => {
  const maxVal = Math.max(...data.flatMap(d => [d.budget, d.real]), 1);
  const BAR_H = 120;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: BAR_H + 28 }}>
      {data.map(d => {
        const budgetH = (d.budget / maxVal) * BAR_H;
        const realH   = (d.real   / maxVal) * BAR_H;
        return (
          <View key={d.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: BAR_H + 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: BAR_H }}>
              <View style={{ flex: 1, height: budgetH, backgroundColor: color + '44', borderRadius: 3, borderWidth: 1, borderColor: color + '88', borderStyle: 'dashed' }} />
              <View style={{ flex: 1, height: realH, backgroundColor: color, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: 7, color: colors.textDim, marginTop: 4, textAlign: 'center' }} numberOfLines={2}>
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

/* ── Horizontal bar ─────────────────────────────────────── */
const HBar = ({ label, value, maxValue, color, fmt, colors }: any) => {
  const pct = Math.min((value / maxValue) * 100, 100);
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 13, color: colors.text }} numberOfLines={1}>{label}</Text>
        <Text style={{ fontSize: 12, color, fontWeight: '700' }}>{fmt(value)}</Text>
      </View>
      <View style={[styles.hbarTrack, { backgroundColor: colors.surface }]}>
        <View style={[styles.hbarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
};

/* ── Donut legend ────────────────────────────────────────── */
const DonutLegend = ({
  data, fmt, colors,
}: {
  data: { name: string; val: number; color: string }[];
  fmt: (v: number) => string;
  colors: any;
}) => {
  const total = data.reduce((s, d) => s + d.val, 0) || 1;
  return (
    <View style={{ gap: 8 }}>
      {data.map(d => (
        <View key={d.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 10, height: 10, backgroundColor: d.color, borderRadius: 2 }} />
          <Text style={{ flex: 1, fontSize: 13, color: colors.text }} numberOfLines={1}>{d.name}</Text>
          <Text style={{ fontSize: 11, color: d.color, fontWeight: '700' }}>{Math.round((d.val / total) * 100)}%</Text>
          <Text style={{ fontSize: 11, color: colors.textDim, minWidth: 64, textAlign: 'right' }}>{fmt(d.val)}</Text>
        </View>
      ))}
    </View>
  );
};

/* ── Analytics Screen ───────────────────────────────────── */
export default function AnalyticsScreen() {
  const { db, liveRates } = useStore();
  const { colors, catColors } = useTheme();
  const { currency, month, year, transactions } = db;
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const fmt = (v: number) => fmtC(v, currency, liveRates);

  /* All transactions for the selected month */
  const monthTxns = useMemo(() => transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  }), [transactions, month, year]);

  /* Budget vs Real — budget from db rows, real from transactions */
  const budgetVsReal = useMemo(() => [
    {
      label: 'EXP',
      color: catColors.Expenses,
      budget: db.expenses.reduce((s, r) => s + r.budget, 0),
      real: monthTxns.filter(t => t.category === 'Expenses').reduce((s, t) => s + t.amount, 0),
    },
    {
      label: 'BILLS',
      color: catColors.Bills,
      budget: db.bills.reduce((s, r) => s + r.budget, 0),
      real: monthTxns.filter(t => t.category === 'Bills').reduce((s, t) => s + t.amount, 0),
    },
    {
      label: 'SAV',
      color: catColors.Savings,
      budget: db.savings.reduce((s, r) => s + r.budget, 0),
      real: monthTxns.filter(t => t.category === 'Savings').reduce((s, t) => s + t.amount, 0),
    },
    {
      label: 'DEBTS',
      color: catColors.Debts,
      budget: db.debts.reduce((s, r) => s + r.budget, 0),
      real: monthTxns.filter(t => t.category === 'Debts').reduce((s, t) => s + t.amount, 0),
    },
    {
      label: 'SUBS',
      color: catColors.Subscriptions,
      budget: db.subscriptions.reduce((s, r) => s + r.budget, 0),
      real: monthTxns.filter(t => t.category === 'Subscriptions').reduce((s, t) => s + t.amount, 0),
    },
  ], [db, monthTxns, catColors]);

  const catConfig = useMemo(() => [
    { label: 'Expenses',      txCat: 'Expenses',      dbKey: 'expenses',      nameKey: 'sub', budgetKey: 'budget', color: catColors.Expenses },
    { label: 'Bills',         txCat: 'Bills',         dbKey: 'bills',         nameKey: 'sub', budgetKey: 'budget', color: catColors.Bills },
    { label: 'Savings',       txCat: 'Savings',       dbKey: 'savings',       nameKey: 'sub', budgetKey: 'budget', color: catColors.Savings },
    { label: 'Debts',         txCat: 'Debts',         dbKey: 'debts',         nameKey: 'sub', budgetKey: 'budget', color: catColors.Debts },
    { label: 'Subscriptions', txCat: 'Subscriptions', dbKey: 'subscriptions', nameKey: 'sub', budgetKey: 'budget', color: catColors.Subscriptions },
  ], [catColors]);

  const activeCat = catConfig.find(c => c.label === selectedCat) || catConfig[0];

  /* Category breakdown: actual spending from transactions, fallback to budget if no txn */
  const breakdownData = useMemo(() => {
    const rows = (db as any)[activeCat.dbKey] || [];

    // Build real spending map from this month's transactions for this category
    const realMap: Record<string, number> = {};
    monthTxns
      .filter(t => t.category === activeCat.txCat)
      .forEach(t => {
        realMap[t.subCategory] = (realMap[t.subCategory] || 0) + t.amount;
      });

    // Combine budget rows with real spending
    // Include rows that have either a budget or actual spending
    const combined: Record<string, { name: string; val: number }> = {};

    // Add all budget rows
    rows.forEach((r: any) => {
      const name = r[activeCat.nameKey];
      combined[name] = { name, val: 0 };
    });

    // Fill in real spending (this overrides zero for rows that have transactions)
    Object.entries(realMap).forEach(([name, val]) => {
      combined[name] = { name, val };
    });

    return Object.values(combined)
      .filter(d => d.val > 0)
      .map((d, i, arr) => {
        const factor = 0.5 + 0.5 * (arr.length <= 1 ? 1 : i / (arr.length - 1));
        const hex = activeCat.color.replace('#', '');
        const r2  = parseInt(hex.slice(0, 2), 16);
        const g   = parseInt(hex.slice(2, 4), 16);
        const b2  = parseInt(hex.slice(4, 6), 16);
        const color = `rgb(${Math.round(r2 * factor)},${Math.round(g * factor)},${Math.round(b2 * factor)})`;
        return { ...d, color };
      });
  }, [db, monthTxns, activeCat]);

  const maxBreakdown = Math.max(...breakdownData.map((d: any) => d.val), 1);

  /* Top spending — from transactions */
  const topSubs = useMemo(() => {
    const map: Record<string, { name: string; amount: number; category: string }> = {};
    monthTxns.filter(t => t.category !== 'Income').forEach(t => {
      if (!map[t.subCategory]) map[t.subCategory] = { name: t.subCategory, amount: 0, category: t.category };
      map[t.subCategory].amount += t.amount;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [monthTxns]);

  const maxTop = Math.max(...topSubs.map(d => d.amount), 1);

  const alloc = budgetVsReal.map(c => ({ name: c.label, val: c.budget, color: c.color }));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.textBright }]}>Analytics</Text>
        <Text style={[styles.pageSub, { color: colors.textDim }]}>{MONTHS[month]} {year}</Text>

        {/* Budget vs Real */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textDim }]}>Budget vs Real</Text>
          <View style={{ flexDirection: 'row', gap: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 8, backgroundColor: colors.accent + '44', borderRadius: 2, borderWidth: 1, borderColor: colors.accent }} />
              <Text style={{ fontSize: 10, color: colors.textDim }}>Budget</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 8, backgroundColor: colors.accent, borderRadius: 2 }} />
              <Text style={{ fontSize: 10, color: colors.textDim }}>Real</Text>
            </View>
          </View>
          <BarChart
            data={budgetVsReal.map(d => ({ label: d.label, budget: d.budget, real: d.real }))}
            color={colors.accent}
            colors={colors}
          />
        </View>

        {/* Budget Utilization */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textDim }]}>Budget Utilization</Text>
          {budgetVsReal.map(d => {
            const pct = d.budget > 0 ? Math.round((d.real / d.budget) * 100) : 0;
            return (
              <View key={d.label} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, color: colors.text }}>{d.label}</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Text style={{ fontSize: 11, color: colors.textDim }}>{fmt(d.real)} / {fmt(d.budget)}</Text>
                    <Text style={{ fontSize: 11, color: pct > 100 ? colors.negative : d.color, fontWeight: '700' }}>{pct}%</Text>
                  </View>
                </View>
                <View style={[styles.hbarTrack, { backgroundColor: colors.surface }]}>
                  <View style={[styles.hbarFill, {
                    width: `${Math.min(pct, 100)}%` as any,
                    backgroundColor: pct > 100 ? colors.negative : d.color,
                  }]} />
                </View>
              </View>
            );
          })}
        </View>

        {/* Category Breakdown */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textDim }]}>Category Breakdown</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {catConfig.map(c => (
                <TouchableOpacity
                  key={c.label}
                  style={[styles.catChip, { borderColor: c.color }, (selectedCat || 'Expenses') === c.label && { backgroundColor: c.color + '33' }]}
                  onPress={() => setSelectedCat(c.label)}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: c.color }}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {breakdownData.length === 0 ? (
            <Text style={{ color: colors.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>
              No transactions yet for this category in {MONTHS[month]}
            </Text>
          ) : (
            breakdownData.map((d: any) => (
              <HBar key={d.name} label={d.name} value={d.val} maxValue={maxBreakdown} color={d.color} fmt={fmt} colors={colors} />
            ))
          )}
        </View>

        {/* Top Spending */}
        {topSubs.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.textDim }]}>Top Spending — {MONTHS[month]}</Text>
            {topSubs.map(d => (
              <HBar key={d.name} label={d.name} value={d.amount} maxValue={maxTop} color={catColors[d.category]} fmt={fmt} colors={colors} />
            ))}
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.textDim }]}>Top Spending — {MONTHS[month]}</Text>
            <Text style={{ color: colors.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>
              No spending recorded for {MONTHS[month]} yet
            </Text>
          </View>
        )}

        {/* Budget Allocation */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textDim }]}>Budget Allocation</Text>
          <DonutLegend data={alloc} fmt={fmt} colors={colors} />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 14, gap: 10 },

  pageTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  pageSub: { fontSize: 12, marginBottom: 4 },

  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  cardLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 2.5,
    textTransform: 'uppercase', marginBottom: 14,
  },

  hbarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  hbarFill: { height: '100%', borderRadius: 3 },

  catChip: {
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
});