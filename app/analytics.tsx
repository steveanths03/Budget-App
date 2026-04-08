// app/analytics.tsx
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { useTheme } from '../context/ThemeContext';
import { MONTHS } from '../constants/theme';
import { fmtC } from '../utils/format';

/* ── Mini bar chart ─────────────────────────────────────── */
const BarChart = ({
  data, colors,
}: {
  data: { label: string; budget: number; real: number; color: string }[];
  colors: any;
}) => {
  const maxVal = Math.max(...data.flatMap(d => [d.budget, d.real]), 1);
  const BAR_H = 130;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: BAR_H + 32 }}>
      {data.map(d => {
        const budgetH = (d.budget / maxVal) * BAR_H;
        const realH   = Math.max((d.real / maxVal) * BAR_H, d.real > 0 ? 3 : 0);
        return (
          <View key={d.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: BAR_H + 32 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: BAR_H }}>
              <View style={{
                flex: 1, height: Math.max(budgetH, 2),
                backgroundColor: d.color + '30',
                borderRadius: 3, borderWidth: 1,
                borderColor: d.color + '99',
                borderStyle: 'dashed',
              }} />
              <View style={{
                flex: 1, height: Math.max(realH, d.real > 0 ? 3 : 0),
                backgroundColor: d.color,
                borderRadius: 3,
              }} />
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
  const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
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
          <Text style={{ fontSize: 11, color: colors.textDim, minWidth: 60, textAlign: 'right' }}>{fmt(d.val)}</Text>
        </View>
      ))}
    </View>
  );
};

/* ── Reusable scope toggle ───────────────────────────────── */
const ScopeToggle = ({
  scope, setScope, monthLabel, colors,
}: {
  scope: 'month' | 'all';
  setScope: (s: 'month' | 'all') => void;
  monthLabel: string;
  colors: any;
}) => (
  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
    {(['month', 'all'] as const).map(s => (
      <TouchableOpacity
        key={s}
        style={[
          styles.scopeBtn,
          { borderColor: colors.border },
          scope === s && { backgroundColor: colors.accent + '22', borderColor: colors.accent },
        ]}
        onPress={() => setScope(s)}
      >
        <Text style={{ fontSize: 11, fontWeight: '700', color: scope === s ? colors.accent : colors.textDim }}>
          {s === 'month' ? monthLabel : 'All Time'}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

/* ── Analytics Screen ───────────────────────────────────── */
export default function AnalyticsScreen() {
  const { db, liveRates } = useStore();
  const { colors, catColors } = useTheme();
  const { currency, month, year, transactions } = db;

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [bvrScope,    setBvrScope]    = useState<'month' | 'all'>('month');
  const [breakScope,  setBreakScope]  = useState<'month' | 'all'>('month');
  const [topScope,    setTopScope]    = useState<'month' | 'all'>('month');

  const fmt        = (v: number) => fmtC(v, currency, liveRates);
  const monthLabel = `${MONTHS[month].slice(0, 3)} ${year}`;

  /* Month transactions */
  const monthTxns = useMemo(() => transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  }), [transactions, month, year]);

  const txnsFor = (scope: 'month' | 'all') => scope === 'month' ? monthTxns : transactions;

  /* ── Budget vs Real ──────────────────────────────────────
     Budget = configured monthly targets from db rows.
     Real   = actual transactions in the chosen scope.
  ── */
  const budgetVsReal = useMemo(() => {
    const t = txnsFor(bvrScope);
    return [
      { label: 'Expenses', color: catColors.Expenses,
        budget: db.expenses.reduce((s, r) => s + r.budget, 0),
        real: t.filter(x => x.category === 'Expenses').reduce((s, x) => s + x.amount, 0) },
      { label: 'Bills', color: catColors.Bills,
        budget: db.bills.reduce((s, r) => s + r.budget, 0),
        real: t.filter(x => x.category === 'Bills').reduce((s, x) => s + x.amount, 0) },
      { label: 'Savings', color: catColors.Savings,
        budget: db.savings.reduce((s, r) => s + r.budget, 0),
        real: t.filter(x => x.category === 'Savings').reduce((s, x) => s + x.amount, 0) },
      { label: 'Debts', color: catColors.Debts,
        budget: db.debts.reduce((s, r) => s + r.budget, 0),
        real: t.filter(x => x.category === 'Debts').reduce((s, x) => s + x.amount, 0) },
      { label: 'Subs', color: catColors.Subscriptions,
        budget: db.subscriptions.reduce((s, r) => s + r.budget, 0),
        real: t.filter(x => x.category === 'Subscriptions').reduce((s, x) => s + x.amount, 0) },
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, bvrScope, monthTxns, transactions, catColors]);

  /* ── Category config ── */
  const catConfig = useMemo(() => [
    { label: 'Expenses',      txCat: 'Expenses',      color: catColors.Expenses },
    { label: 'Bills',         txCat: 'Bills',         color: catColors.Bills },
    { label: 'Savings',       txCat: 'Savings',       color: catColors.Savings },
    { label: 'Debts',         txCat: 'Debts',         color: catColors.Debts },
    { label: 'Subscriptions', txCat: 'Subscriptions', color: catColors.Subscriptions },
  ], [catColors]);

  const activeCat = catConfig.find(c => c.label === selectedCat) || catConfig[0];

  /* ── Category Breakdown ──────────────────────────────────
     100% transaction-based — shows actual sub-category spend.
     NOT budget targets. Scope-aware.
  ── */
  const breakdownData = useMemo(() => {
    const t = txnsFor(breakScope);
    const realMap: Record<string, number> = {};
    t.filter(x => x.category === activeCat.txCat)
      .forEach(x => { realMap[x.subCategory] = (realMap[x.subCategory] || 0) + x.amount; });

    return Object.entries(realMap)
      .filter(([, val]) => val > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name, val], i, arr) => {
        const factor = 1 - (i / Math.max(arr.length - 1, 1)) * 0.45;
        const hex = activeCat.color.replace('#', '');
        const rv = parseInt(hex.slice(0, 2), 16);
        const gv = parseInt(hex.slice(2, 4), 16);
        const bv = parseInt(hex.slice(4, 6), 16);
        const color = `rgb(${Math.round(rv * factor)},${Math.round(gv * factor)},${Math.round(bv * factor)})`;
        return { name, val, color };
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakScope, monthTxns, transactions, activeCat]);

  const maxBreakdown = Math.max(...breakdownData.map(d => d.val), 1);

  /* ── Top Spending ── */
  const topSubs = useMemo(() => {
    const t = txnsFor(topScope);
    const map: Record<string, { name: string; amount: number; category: string }> = {};
    t.filter(x => x.category !== 'Income').forEach(x => {
      if (!map[x.subCategory]) map[x.subCategory] = { name: x.subCategory, amount: 0, category: x.category };
      map[x.subCategory].amount += x.amount;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 8);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topScope, monthTxns, transactions]);

  const maxTop = Math.max(...topSubs.map(d => d.amount), 1);

  /* ── Budget Allocation (always monthly config) ── */
  const alloc = [
    { name: 'Expenses',      val: db.expenses.reduce((s, r) => s + r.budget, 0),      color: catColors.Expenses },
    { name: 'Bills',         val: db.bills.reduce((s, r) => s + r.budget, 0),          color: catColors.Bills },
    { name: 'Savings',       val: db.savings.reduce((s, r) => s + r.budget, 0),        color: catColors.Savings },
    { name: 'Debts',         val: db.debts.reduce((s, r) => s + r.budget, 0),          color: catColors.Debts },
    { name: 'Subscriptions', val: db.subscriptions.reduce((s, r) => s + r.budget, 0), color: catColors.Subscriptions },
  ].filter(d => d.val > 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.textBright }]}>Analytics</Text>
        <Text style={[styles.pageSub, { color: colors.textDim }]}>{MONTHS[month]} {year}</Text>

        {/* ── Budget vs Actual Spend ── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textDim }]}>Budget vs Actual Spend</Text>
          <ScopeToggle scope={bvrScope} setScope={setBvrScope} monthLabel={monthLabel} colors={colors} />

          <View style={{ flexDirection: 'row', gap: 14, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 8, backgroundColor: '#ffffff20', borderRadius: 2, borderWidth: 1, borderColor: '#ffffff60', borderStyle: 'dashed' }} />
              <Text style={{ fontSize: 10, color: colors.textDim }}>Budget</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 8, backgroundColor: colors.accent, borderRadius: 2 }} />
              <Text style={{ fontSize: 10, color: colors.textDim }}>Actual</Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.textDim, marginLeft: 'auto' }}>
              from {bvrScope === 'month' ? `${monthLabel} txns` : 'all txns'}
            </Text>
          </View>

          <BarChart data={budgetVsReal} colors={colors} />

          <View style={{ marginTop: 16, gap: 10 }}>
            {budgetVsReal.map(d => {
              const pct  = d.budget > 0 ? Math.round((d.real / d.budget) * 100) : 0;
              const over = pct > 100;
              return (
                <View key={d.label}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: d.color }} />
                      <Text style={{ fontSize: 12, color: colors.text }}>{d.label}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: colors.textDim }}>
                        {fmt(d.real)} / {fmt(d.budget)}
                      </Text>
                      <Text style={{
                        fontSize: 11, fontWeight: '700', minWidth: 36, textAlign: 'right',
                        color: over ? colors.negative : d.color,
                      }}>
                        {pct}%
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.hbarTrack, { backgroundColor: colors.surface }]}>
                    <View style={[styles.hbarFill, {
                      width: `${Math.min(pct, 100)}%` as any,
                      backgroundColor: over ? colors.negative : d.color,
                    }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Category Breakdown (transaction-based) ── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textDim }]}>Category Breakdown</Text>
          <Text style={{ fontSize: 11, color: colors.textDim, marginTop: -8, marginBottom: 12 }}>
            Actual spend from transactions — not budget targets
          </Text>

          <ScopeToggle scope={breakScope} setScope={setBreakScope} monthLabel={monthLabel} colors={colors} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {catConfig.map(c => (
                <TouchableOpacity
                  key={c.label}
                  style={[
                    styles.catChip,
                    { borderColor: c.color },
                    (selectedCat || 'Expenses') === c.label && { backgroundColor: c.color + '33' },
                  ]}
                  onPress={() => setSelectedCat(c.label)}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: c.color }}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {breakdownData.length === 0 ? (
            <Text style={{ color: colors.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>
              No {activeCat.label} transactions{breakScope === 'month' ? ` in ${MONTHS[month]}` : ' recorded yet'}
            </Text>
          ) : (
            breakdownData.map(d => (
              <HBar key={d.name} label={d.name} value={d.val} maxValue={maxBreakdown} color={d.color} fmt={fmt} colors={colors} />
            ))
          )}
        </View>

        {/* ── Top Spending ── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textDim }]}>Top Spending</Text>
          <ScopeToggle scope={topScope} setScope={setTopScope} monthLabel={monthLabel} colors={colors} />

          {topSubs.length === 0 ? (
            <Text style={{ color: colors.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>
              No spending{topScope === 'month' ? ` in ${MONTHS[month]}` : ' recorded yet'}
            </Text>
          ) : (
            topSubs.map(d => (
              <HBar
                key={d.name}
                label={d.name}
                value={d.amount}
                maxValue={maxTop}
                color={catColors[d.category] || colors.accent}
                fmt={fmt}
                colors={colors}
              />
            ))
          )}
        </View>

        {/* ── Budget Allocation ── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textDim }]}>Budget Allocation</Text>
          <Text style={{ fontSize: 11, color: colors.textDim, marginTop: -8, marginBottom: 12 }}>
            Monthly budget targets by category
          </Text>
          {alloc.length === 0 ? (
            <Text style={{ color: colors.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>
              No budget configured yet
            </Text>
          ) : (
            <DonutLegend data={alloc} fmt={fmt} colors={colors} />
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1 },
  container: { flex: 1 },
  content:   { padding: 14, gap: 10 },

  pageTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  pageSub:   { fontSize: 12, marginBottom: 4 },

  card:      { borderWidth: 1, borderRadius: 8, padding: 14 },
  cardLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 14 },

  hbarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  hbarFill:  { height: '100%', borderRadius: 3 },

  catChip:  { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  scopeBtn: { flex: 1, paddingVertical: 7, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
});