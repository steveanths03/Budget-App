import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors, CAT_COLOR, CATEGORY_LIST, MONTHS } from '../constants/theme';
import { fmtC, monthEnd, pad } from '../utils/format';

const { width: SW } = Dimensions.get('window');

/* ── Micro-components ─────────────────────────────────────── */
const Card = ({ children, style }: any) => (
  <View style={[styles.card, style]}>{children}</View>
);

const Label = ({ children, color }: any) => (
  <Text style={[styles.label, color && { color }]}>{children}</Text>
);

const UtilBar = ({ pct, color }: { pct: number; color: string }) => {
  const capped = Math.min(Math.abs(pct), 100);
  const barColor = pct > 100 ? Colors.negative : color;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={styles.utilTrack}>
        <View style={[styles.utilFill, { width: `${capped}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={{ fontSize: 9, color: pct > 100 ? Colors.negative : Colors.textDim }}>{pct}%</Text>
    </View>
  );
};

/* ── Dashboard Screen ─────────────────────────────────────── */
export default function DashboardScreen() {
  const { db, liveRates } = useStore();
  const { transactions, initialBalance, currency, month, year } = db;

  const fmt = (v: number) => fmtC(v, currency, liveRates);

  const lastDay = useMemo(() => monthEnd(month, year), [month, year]);
  const startLabel = `${MONTHS[month]} 01, ${year}`;
  const endLabel = `${MONTHS[month]} ${pad(lastDay)}, ${year}`;

  // Month-filtered transactions
  const monthTxns = useMemo(() => transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  }), [transactions, month, year]);

  const totalReceived = useMemo(() =>
    monthTxns.filter(t => t.category === 'Income').reduce((s, t) => s + t.amount, 0),
    [monthTxns]);

  const totalSpent = useMemo(() =>
    monthTxns.filter(t => t.category !== 'Income').reduce((s, t) => s + t.amount, 0),
    [monthTxns]);

  const finalBal = initialBalance + totalReceived - totalSpent;
  const diff = totalReceived - totalSpent;

  // Budget summary
  const cats = [
    { key: 'expenses', label: 'EXPENSES', color: Colors.expenses, txCat: 'Expenses', rows: db.expenses },
    { key: 'bills', label: 'BILLS', color: Colors.bills, txCat: 'Bills', rows: db.bills },
    { key: 'savings', label: 'SAVINGS', color: Colors.savings, txCat: 'Savings', rows: db.savings },
    { key: 'debts', label: 'DEBTS', color: Colors.debts, txCat: 'Debts', rows: db.debts },
    { key: 'subscriptions', label: 'SUBSCRIPTIONS', color: Colors.subscriptions, txCat: 'Subscriptions', rows: db.subscriptions },
  ];

  const incomeBudget = db.income.reduce((s, r) => s + r.expected, 0);

  const catRows = cats.map(c => {
    const budget = c.rows.reduce((s, r) => s + r.budget, 0);
    const real = monthTxns.filter(t => t.category === c.txCat).reduce((s, t) => s + t.amount, 0);
    const util = budget > 0 ? Math.round((real / budget) * 100) : 0;
    return { ...c, budget, real, util };
  });

  const totalBudgetSpend = catRows.reduce((s, r) => s + r.budget, 0);
  const totalRealSpend = catRows.reduce((s, r) => s + r.real, 0);
  const amountLeftBudget = incomeBudget - totalBudgetSpend;
  const amountLeftReal = totalReceived - totalRealSpend;

  // Category quick stats
  const catTotals = useMemo(() => {
    const t: Record<string, number> = {};
    CATEGORY_LIST.forEach(c => { t[c] = 0; });
    monthTxns.forEach(tx => { if (t[tx.category] !== undefined) t[tx.category] += tx.amount; });
    return t;
  }, [monthTxns]);

  const maxIncomeVal = Math.max(totalReceived, totalSpent, 1);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Budget Tracker</Text>
            <Text style={styles.headerSub}>{startLabel} – {endLabel}</Text>
          </View>
          <View style={[styles.dot, { backgroundColor: Colors.accent }]} />
        </View>

        {/* ── Balance Cards ── */}
        <View style={styles.row}>
          <Card style={styles.halfCard}>
            <Label>Initial Balance</Label>
            <Text style={styles.balanceNum}>{fmt(initialBalance)}</Text>
          </Card>
          <Card style={[styles.halfCard, { borderLeftWidth: 3, borderLeftColor: finalBal >= 0 ? Colors.positive : Colors.negative }]}>
            <Label>Final Balance</Label>
            <Text style={[styles.balanceNum, { color: finalBal >= 0 ? Colors.text : Colors.negative }]}>{fmt(finalBal)}</Text>
          </Card>
        </View>

        {/* ── Income vs Spent ── */}
        <Card>
          <Label color={Colors.expenses}>Total Income vs Total Expenses</Label>
          <View style={{ marginTop: 12, gap: 10 }}>
            {[
              { label: 'INCOME', color: Colors.positive, val: totalReceived, pct: (totalReceived / maxIncomeVal) * 100 },
              { label: 'EXPENSES', color: Colors.negative, val: totalSpent, pct: (totalSpent / maxIncomeVal) * 100 },
            ].map(({ label, color, val, pct }) => (
              <View key={label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, backgroundColor: color, borderRadius: 2 }} />
                    <Text style={{ fontSize: 9, color: Colors.textDim, fontWeight: '700', letterSpacing: 1 }}>{label}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color, fontWeight: '700' }}>{fmt(val)}</Text>
                </View>
                <View style={styles.incomeTrack}>
                  <View style={[styles.incomeFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color }]} />
                </View>
              </View>
            ))}
          </View>
          {diff !== 0 && (
            <Text style={{ fontSize: 11, color: diff > 0 ? Colors.positive : Colors.negative, marginTop: 8, textAlign: 'right', fontWeight: '700' }}>
              {diff > 0 ? '▲ +' : '▼ '}{fmt(Math.abs(diff))}
            </Text>
          )}
        </Card>

        {/* ── Category Quick Stats ── */}
        <Text style={styles.sectionTitle}>Month Summary</Text>
        <View style={styles.catGrid}>
          {CATEGORY_LIST.map(cat => (
            <Card key={cat} style={[styles.catCard, { borderLeftWidth: 3, borderLeftColor: CAT_COLOR[cat] }]}>
              <Text style={{ fontSize: 8, color: Colors.textDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{cat}</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: CAT_COLOR[cat] }}>{fmt(catTotals[cat])}</Text>
              <Text style={{ fontSize: 9, color: Colors.textDim, marginTop: 2 }}>
                {monthTxns.filter(t => t.category === cat).length} txns
              </Text>
            </Card>
          ))}
        </View>

        {/* ── Budget Summary Table ── */}
        <Text style={styles.sectionTitle}>Budget Summary</Text>
        <Card>
          {/* Header */}
          <View style={styles.tableHeader}>
            {['Category', 'Budget', 'Real', 'Util'].map(h => (
              <Text key={h} style={[styles.tableHead, h === 'Category' ? { flex: 2 } : { flex: 1 }]}>{h}</Text>
            ))}
          </View>

          {/* Income row */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2, color: Colors.income, fontWeight: '700' }]}>INCOME</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{fmt(incomeBudget)}</Text>
            <Text style={[styles.tableCell, { flex: 1, color: Colors.income }]}>{fmt(totalReceived)}</Text>
            <Text style={[styles.tableCell, { flex: 1, color: Colors.textDim, fontStyle: 'italic' }]}>—</Text>
          </View>

          {catRows.map(r => (
            <View key={r.key} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2, fontSize: 9 }]}>{r.label}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{fmt(r.budget)}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{fmt(r.real)}</Text>
              <View style={{ flex: 1 }}>
                <UtilBar pct={r.util} color={r.color} />
              </View>
            </View>
          ))}

          {/* Amount Left */}
          <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 6 }]}>
            <Text style={[styles.tableCell, { flex: 2, color: Colors.income, fontWeight: '800' }]}>AMOUNT LEFT</Text>
            <Text style={[styles.tableCell, { flex: 1, color: Colors.income, fontWeight: '700' }]}>{fmt(amountLeftBudget)}</Text>
            <Text style={[styles.tableCell, {
              flex: 1, fontWeight: '700',
              color: amountLeftReal < 0 ? Colors.negative : Colors.income,
            }]}>{fmt(amountLeftReal)}</Text>
            <Text style={[styles.tableCell, { flex: 1, color: Colors.textDim, fontStyle: 'italic' }]}>—</Text>
          </View>
        </Card>

        {/* ── Recent Transactions ── */}
        {monthTxns.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <Card>
              {[...monthTxns].slice(-5).reverse().map(t => (
                <View key={t.id} style={styles.txnRow}>
                  <View style={[styles.txnDot, { backgroundColor: CAT_COLOR[t.category] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: Colors.text, fontWeight: '600' }}>{t.subCategory}</Text>
                    <Text style={{ fontSize: 10, color: Colors.textDim }}>{t.date} · {t.category}</Text>
                  </View>
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: t.category === 'Income' ? Colors.positive : Colors.text,
                  }}>
                    {t.category === 'Income' ? '+' : '-'}{fmt(t.amount)}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 14, gap: 10 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: Colors.textBright, letterSpacing: -0.5 },
  headerSub: { fontSize: 11, color: Colors.textDim, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 14,
  },
  halfCard: { flex: 1 },
  row: { flexDirection: 'row', gap: 10 },

  label: {
    fontSize: 9, fontWeight: '700', letterSpacing: 2.5,
    textTransform: 'uppercase', color: Colors.textDim, marginBottom: 6,
  },
  balanceNum: { fontSize: 18, fontWeight: '800', color: Colors.text },

  incomeTrack: { height: 14, backgroundColor: Colors.surface, borderRadius: 3, overflow: 'hidden' },
  incomeFill: { height: '100%', borderRadius: 3 },

  utilTrack: { width: 60, height: 6, backgroundColor: Colors.surface, borderRadius: 3, overflow: 'hidden' },
  utilFill: { height: '100%', borderRadius: 3 },

  sectionTitle: {
    fontSize: 10, fontWeight: '700', letterSpacing: 2.5,
    textTransform: 'uppercase', color: Colors.textDim, marginTop: 6,
  },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catCard: { width: (SW - 28 - 8) / 2 - 2, minWidth: 100 },

  tableHeader: { flexDirection: 'row', marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tableHead: { fontSize: 8, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: Colors.textDim },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: Colors.borderDim },
  tableCell: { fontSize: 10, color: Colors.text },

  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderDim },
  txnDot: { width: 10, height: 10, borderRadius: 5 },
});
