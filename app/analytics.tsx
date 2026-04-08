import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { Colors, CAT_COLOR, CATEGORY_LIST, MONTHS } from '../constants/theme';
import { fmtC } from '../utils/format';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - 28;

/* ── Mini bar chart (pure RN) ─────── */
const BarChart = ({ data, color }: { data: { label: string; budget: number; real: number }[]; color: string }) => {
  const maxVal = Math.max(...data.flatMap(d => [d.budget, d.real]), 1);
  const BAR_H = 120;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: BAR_H + 28 }}>
      {data.map(d => {
        const budgetH = (d.budget / maxVal) * BAR_H;
        const realH = (d.real / maxVal) * BAR_H;
        return (
          <View key={d.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: BAR_H + 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: BAR_H }}>
              {/* Budget bar */}
              <View style={{ flex: 1, height: budgetH, backgroundColor: color + '44', borderRadius: 3, borderWidth: 1, borderColor: color + '88', borderStyle: 'dashed' }} />
              {/* Real bar */}
              <View style={{ flex: 1, height: realH, backgroundColor: color, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: 6, color: Colors.textDim, marginTop: 4, textAlign: 'center' }} numberOfLines={2}>
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

/* ── Horizontal bar ───────────────── */
const HBar = ({ label, value, maxValue, color, fmt }: any) => {
  const pct = Math.min((value / maxValue) * 100, 100);
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 11, color: Colors.text }} numberOfLines={1}>{label}</Text>
        <Text style={{ fontSize: 11, color, fontWeight: '700' }}>{fmt(value)}</Text>
      </View>
      <View style={styles.hbarTrack}>
        <View style={[styles.hbarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
};

/* ── Donut chart (pure RN / SVG-free) ─────────────────────────────── */
const DonutLegend = ({ data, fmt }: { data: { name: string; val: number; color: string }[]; fmt: (v: number) => string }) => {
  const total = data.reduce((s, d) => s + d.val, 0) || 1;
  return (
    <View style={{ gap: 6 }}>
      {data.map(d => (
        <View key={d.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, backgroundColor: d.color, borderRadius: 2 }} />
          <Text style={{ flex: 1, fontSize: 11, color: Colors.text }} numberOfLines={1}>{d.name}</Text>
          <Text style={{ fontSize: 10, color: d.color, fontWeight: '700' }}>{Math.round((d.val / total) * 100)}%</Text>
          <Text style={{ fontSize: 10, color: Colors.textDim, minWidth: 60, textAlign: 'right' }}>{fmt(d.val)}</Text>
        </View>
      ))}
    </View>
  );
};

/* ── Analytics Screen ─────────────── */
export default function AnalyticsScreen() {
  const { db, liveRates } = useStore();
  const { currency, month, year, transactions } = db;
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const fmt = (v: number) => fmtC(v, currency, liveRates);

  const monthTxns = useMemo(() => transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  }), [transactions, month, year]);

  // Budget vs real per category
  const budgetVsReal = useMemo(() => [
    { label: 'EXP', color: Colors.expenses, budget: db.expenses.reduce((s, r) => s + r.budget, 0), real: monthTxns.filter(t => t.category === 'Expenses').reduce((s, t) => s + t.amount, 0) },
    { label: 'BILLS', color: Colors.bills, budget: db.bills.reduce((s, r) => s + r.budget, 0), real: monthTxns.filter(t => t.category === 'Bills').reduce((s, t) => s + t.amount, 0) },
    { label: 'SAV', color: Colors.savings, budget: db.savings.reduce((s, r) => s + r.budget, 0), real: monthTxns.filter(t => t.category === 'Savings').reduce((s, t) => s + t.amount, 0) },
    { label: 'DEBTS', color: Colors.debts, budget: db.debts.reduce((s, r) => s + r.budget, 0), real: monthTxns.filter(t => t.category === 'Debts').reduce((s, t) => s + t.amount, 0) },
    { label: 'SUBS', color: Colors.subscriptions, budget: db.subscriptions.reduce((s, r) => s + r.budget, 0), real: monthTxns.filter(t => t.category === 'Subscriptions').reduce((s, t) => s + t.amount, 0) },
  ], [db, monthTxns]);

  // Per-category breakdown
  const catConfig: any[] = [
    { label: 'Expenses', txCat: 'Expenses', dbKey: 'expenses', nameKey: 'sub', budgetKey: 'budget', color: Colors.expenses },
    { label: 'Bills', txCat: 'Bills', dbKey: 'bills', nameKey: 'sub', budgetKey: 'budget', color: Colors.bills },
    { label: 'Savings', txCat: 'Savings', dbKey: 'savings', nameKey: 'sub', budgetKey: 'budget', color: Colors.savings },
    { label: 'Debts', txCat: 'Debts', dbKey: 'debts', nameKey: 'sub', budgetKey: 'budget', color: Colors.debts },
    { label: 'Subscriptions', txCat: 'Subscriptions', dbKey: 'subscriptions', nameKey: 'sub', budgetKey: 'budget', color: Colors.subscriptions },
  ];

  const activeCat = catConfig.find(c => c.label === selectedCat) || catConfig[0];

  const breakdownData = useMemo(() => {
    const rows = (db as any)[activeCat.dbKey] || [];
    const realMap: Record<string, number> = {};
    monthTxns.filter(t => t.category === activeCat.txCat).forEach(t => {
      realMap[t.subCategory] = (realMap[t.subCategory] || 0) + t.amount;
    });
    return rows.map((r: any) => {
      const name = r[activeCat.nameKey];
      const val = realMap[name] || r[activeCat.budgetKey] || 0;
      return { name, val };
    }).filter((d: any) => d.val > 0)
      .map((d: any, i: number, arr: any[]) => {
        const factor = 0.5 + 0.5 * (arr.length <= 1 ? 1 : i / (arr.length - 1));
        const hex = activeCat.color.replace('#', '');
        const r2 = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b2 = parseInt(hex.slice(4, 6), 16);
        const color = `rgb(${Math.round(r2 * factor)},${Math.round(g * factor)},${Math.round(b2 * factor)})`;
        return { ...d, color };
      });
  }, [db, monthTxns, activeCat]);

  const maxBreakdown = Math.max(...breakdownData.map((d: any) => d.val), 1);

  // Top spending subs (for the month)
  const topSubs = useMemo(() => {
    const map: Record<string, { name: string; amount: number; category: string }> = {};
    monthTxns.filter(t => t.category !== 'Income').forEach(t => {
      if (!map[t.subCategory]) map[t.subCategory] = { name: t.subCategory, amount: 0, category: t.category };
      map[t.subCategory].amount += t.amount;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [monthTxns]);

  const maxTop = Math.max(...topSubs.map(d => d.amount), 1);

  // Allocation summary
  const alloc = useMemo(() => {
    const items = budgetVsReal.map(c => ({ name: c.label, val: c.budget, color: c.color }));
    return items;
  }, [budgetVsReal]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>Analytics</Text>
        <Text style={styles.pageSub}>{MONTHS[month]} {year}</Text>

        {/* ── Budget vs Real ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Budget vs Real</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 8, backgroundColor: Colors.accent + '44', borderRadius: 2, borderWidth: 1, borderColor: Colors.accent }} />
              <Text style={{ fontSize: 9, color: Colors.textDim }}>Budget</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 8, backgroundColor: Colors.accent, borderRadius: 2 }} />
              <Text style={{ fontSize: 9, color: Colors.textDim }}>Real</Text>
            </View>
          </View>
          <BarChart data={budgetVsReal.map(d => ({ label: d.label, budget: d.budget, real: d.real }))} color={Colors.accent} />
        </View>

        {/* ── Budget Utilization ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Budget Utilization</Text>
          {budgetVsReal.map(d => {
            const pct = d.budget > 0 ? Math.round((d.real / d.budget) * 100) : 0;
            return (
              <View key={d.label} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 10, color: Colors.text }}>{d.label}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ fontSize: 10, color: Colors.textDim }}>{fmt(d.real)} / {fmt(d.budget)}</Text>
                    <Text style={{ fontSize: 10, color: pct > 100 ? Colors.negative : d.color, fontWeight: '700' }}>{pct}%</Text>
                  </View>
                </View>
                <View style={styles.hbarTrack}>
                  <View style={[styles.hbarFill, {
                    width: `${Math.min(pct, 100)}%` as any,
                    backgroundColor: pct > 100 ? Colors.negative : d.color
                  }]} />
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Category Breakdown ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Category Breakdown</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {catConfig.map(c => (
                <TouchableOpacity
                  key={c.label}
                  style={[styles.catChip, { borderColor: c.color }, (selectedCat || 'Expenses') === c.label && { backgroundColor: c.color + '33' }]}
                  onPress={() => setSelectedCat(c.label)}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: c.color }}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {breakdownData.length === 0 ? (
            <Text style={{ color: Colors.textDim, fontSize: 11, textAlign: 'center', paddingVertical: 16 }}>
              No transactions yet for this category
            </Text>
          ) : (
            breakdownData.map((d: any) => (
              <HBar key={d.name} label={d.name} value={d.val} maxValue={maxBreakdown} color={d.color} fmt={fmt} />
            ))
          )}
        </View>

        {/* ── Top Spending ── */}
        {topSubs.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Top Spending</Text>
            {topSubs.map(d => (
              <HBar key={d.name} label={d.name} value={d.amount} maxValue={maxTop} color={CAT_COLOR[d.category]} fmt={fmt} />
            ))}
          </View>
        )}

        {/* ── Allocation Summary ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Budget Allocation</Text>
          <DonutLegend data={alloc.map(d => ({ name: d.name, val: d.val, color: d.color }))} fmt={fmt} />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 14, gap: 10 },

  pageTitle: { fontSize: 22, fontWeight: '900', color: Colors.textBright, letterSpacing: -0.5 },
  pageSub: { fontSize: 10, color: Colors.textDim, marginBottom: 4 },

  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 14,
  },
  cardLabel: {
    fontSize: 9, fontWeight: '700', letterSpacing: 2.5,
    textTransform: 'uppercase', color: Colors.textDim, marginBottom: 14,
  },

  hbarTrack: { height: 6, backgroundColor: Colors.surface, borderRadius: 3, overflow: 'hidden' },
  hbarFill: { height: '100%', borderRadius: 3 },

  catChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
  },
});
