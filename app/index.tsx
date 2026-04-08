// app/index.tsx  —  Dashboard
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { useTheme } from '../context/ThemeContext';
import { CATEGORY_LIST, CURRENCIES, MONTHS } from '../constants/theme';
import { fmtC, toUSD, uid, todayStr } from '../utils/format';

/* ─── Quick-Add Transaction modal ──────────────────────────────────── */
const QuickAddModal = ({
  visible, onClose, db, onSave, colors, catColors, currency, liveRates,
}: {
  visible: boolean;
  onClose: () => void;
  db: any;
  onSave: (data: any) => void;
  colors: any;
  catColors: Record<string, string>;
  currency: string;
  liveRates: Record<string, number>;
}) => {
  const curSymbol = (CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]).symbol;

  const [amount,      setAmount]      = useState('');
  const [category,    setCategory]    = useState('Expenses');
  const [subCategory, setSubCategory] = useState('');
  const [description, setDescription] = useState('');

  React.useEffect(() => {
    if (visible) { setAmount(''); setSubCategory(''); setDescription(''); setCategory('Expenses'); }
  }, [visible]);

  const subOptions = useMemo(() => {
    const map: Record<string, string[]> = {
      Income:        db.income.map((r: any) => r.source),
      Expenses:      db.expenses.map((r: any) => r.sub),
      Bills:         db.bills.map((r: any) => r.sub),
      Savings:       db.savings.map((r: any) => r.sub),
      Debts:         db.debts.map((r: any) => r.sub),
      Subscriptions: db.subscriptions.map((r: any) => r.sub),
    };
    return map[category] || [];
  }, [db, category]);

  const canSave = parseFloat(amount) > 0 && subCategory;
  const color   = catColors[category];

  const handleSave = () => {
    if (!canSave) return;
    // Convert display-currency amount → USD before saving
    const usdAmount = toUSD(parseFloat(amount), currency, liveRates);
    onSave({ date: todayStr(), amount: usdAmount, category, subCategory, description });
    onClose();
  };

  const s = makeModalStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
        <ScrollView style={s.sheet} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={[s.handle, { backgroundColor: color }]} />
          <Text style={[s.title, { color }]}>Quick Add</Text>

          <Text style={s.label}>Amount ({curSymbol})</Text>
          <TextInput
            style={s.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textDim}
            keyboardType="decimal-pad"
            autoFocus
          />

          <Text style={[s.label, { marginTop: 12 }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
              {CATEGORY_LIST.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[s.chip, { borderColor: catColors[cat] }, category === cat && { backgroundColor: catColors[cat] + '33' }]}
                  onPress={() => { setCategory(cat); setSubCategory(''); }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: catColors[cat] }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={[s.label, { marginTop: 12 }]}>Sub-Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
              {subOptions.map(sub => (
                <TouchableOpacity
                  key={sub}
                  style={[s.chip, { borderColor: colors.border }, subCategory === sub && { backgroundColor: color + '33', borderColor: color }]}
                  onPress={() => setSubCategory(sub)}
                >
                  <Text style={{ fontSize: 11, color: subCategory === sub ? color : colors.textDim, fontWeight: '600' }}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TextInput
            style={[s.input, { marginTop: 6 }]}
            value={subCategory}
            onChangeText={setSubCategory}
            placeholder="Or type custom…"
            placeholderTextColor={colors.textDim}
          />

          <Text style={[s.label, { marginTop: 12 }]}>Note (optional)</Text>
          <TextInput
            style={s.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Note…"
            placeholderTextColor={colors.textDim}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={{ color: colors.textDim, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: color, opacity: canSave ? 1 : 0.4 }]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text style={{ color: colors.bg, fontWeight: '800', fontSize: 14 }}>Save</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const makeModalStyles = (colors: any) =>
  StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 22, borderTopRightRadius: 22,
      padding: 24, borderTopWidth: 1, borderColor: colors.border, maxHeight: '92%',
    },
    handle:    { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    title:     { fontSize: 17, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 20 },
    label:     { fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: colors.textDim, marginBottom: 6 },
    input:     { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 7, padding: 13, fontSize: 15, color: colors.text },
    chip:      { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
    cancelBtn: { flex: 1, padding: 14, borderRadius: 9, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    saveBtn:   { flex: 2, padding: 14, borderRadius: 9, alignItems: 'center' },
  });

/* ─── Stat card ─────────────────────────────────────────────────── */
const StatCard = ({ label, value, color, colors }: any) => (
  <View style={[dStyles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: color, borderLeftWidth: 3 }]}>
    <Text style={[dStyles.statLabel, { color: colors.textDim }]}>{label}</Text>
    <Text style={[dStyles.statValue, { color }]}>{value}</Text>
  </View>
);

/* ─── Budget utilization row ────────────────────────────────────── */
const BudgetRow = ({ label, color, pct, real, budget, fmt, colors }: any) => {
  const capped = Math.min(pct, 100);
  const over   = pct > 100;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>{label}</Text>
        <Text style={{ fontSize: 12, color: over ? colors.negative : color, fontWeight: '700' }}>
          {fmt(real)} <Text style={{ color: colors.textDim, fontWeight: '400' }}>/ {fmt(budget)}</Text>
        </Text>
      </View>
      <View style={{ height: 6, backgroundColor: colors.surface, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${capped}%`, backgroundColor: over ? colors.negative : color, borderRadius: 3 }} />
      </View>
      <Text style={{ fontSize: 10, color: over ? colors.negative : colors.textDim, marginTop: 2, textAlign: 'right' }}>
        {pct}% used
      </Text>
    </View>
  );
};

/* ─── Dashboard Screen ───────────────────────────────────────────── */
export default function DashboardScreen() {
  const { db, liveRates, addTransaction } = useStore();
  const { colors, catColors }             = useTheme();
  const router                            = useRouter();
  const [quickAddVisible, setQuickAddVisible] = useState(false);

  const { currency, month, year, transactions, initialBalance } = db;
  const fmt = (usdVal: number) => fmtC(usdVal, currency, liveRates);

  /* Month transactions (for summary strip) */
  const monthTxns = useMemo(() =>
    transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    }), [transactions, month, year]);

  /* Month totals */
  const totalIn  = monthTxns.filter(t => t.category === 'Income').reduce((s, t) => s + t.amount, 0);
  const totalOut = monthTxns.filter(t => t.category !== 'Income').reduce((s, t) => s + t.amount, 0);
  const net      = totalIn - totalOut;

  /* Budget utilization */
  const budgetRows = useMemo(() => [
    { label: 'Expenses',      color: catColors.Expenses,      dbKey: 'expenses',      txCat: 'Expenses' },
    { label: 'Bills',         color: catColors.Bills,         dbKey: 'bills',         txCat: 'Bills' },
    { label: 'Savings',       color: catColors.Savings,       dbKey: 'savings',       txCat: 'Savings' },
    { label: 'Debts',         color: catColors.Debts,         dbKey: 'debts',         txCat: 'Debts' },
    { label: 'Subscriptions', color: catColors.Subscriptions, dbKey: 'subscriptions', txCat: 'Subscriptions' },
  ].map(r => {
    const budget = (db as any)[r.dbKey].reduce((s: number, x: any) => s + x.budget, 0);
    const real   = monthTxns.filter(t => t.category === r.txCat).reduce((s, t) => s + t.amount, 0);
    const pct    = budget > 0 ? Math.round((real / budget) * 100) : 0;
    return { ...r, budget, real, pct };
  }), [db, monthTxns, catColors]);

  /* Net worth = initialBalance + ALL-TIME net */
  const allIn    = transactions.filter(t => t.category === 'Income').reduce((s, t) => s + t.amount, 0);
  const allOut   = transactions.filter(t => t.category !== 'Income').reduce((s, t) => s + t.amount, 0);
  const netWorth = initialBalance + allIn - allOut;

  /* Most recent 5 transactions (all-time, not month-filtered) */
  const recent = useMemo(() =>
    [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5),
    [transactions]);

  /* Over-budget alerts */
  const alerts = budgetRows.filter(r => r.pct > 100);

  const handleQuickAdd = (data: any) => {
    // data.amount is already USD (converted inside QuickAddModal)
    addTransaction({ id: uid(), ...data });
  };

  const s = makeScreenStyles(colors);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[s.pageTitle, { color: colors.textBright }]}>Dashboard</Text>
            <Text style={[s.pageSub, { color: colors.textDim }]}>{MONTHS[month]} {year}</Text>
          </View>
          <TouchableOpacity
            style={[s.fab, { backgroundColor: colors.accent }]}
            onPress={() => setQuickAddVisible(true)}
          >
            <Ionicons name="add" size={24} color={colors.bg} />
          </TouchableOpacity>
        </View>

        {/* Net Worth banner */}
        <View style={[s.banner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.bannerLabel, { color: colors.textDim }]}>NET WORTH</Text>
          <Text style={[s.bannerValue, { color: netWorth >= 0 ? colors.positive : colors.negative }]}>
            {fmt(netWorth)}
          </Text>
          <Text style={[s.bannerSub, { color: colors.textDim }]}>initial balance + all transactions</Text>
        </View>

        {/* Month summary */}
        <View style={s.row3}>
          <StatCard label="IN"  value={fmt(totalIn)}  color={colors.positive} colors={colors} />
          <StatCard label="OUT" value={fmt(totalOut)} color={colors.negative} colors={colors} />
          <StatCard label="NET" value={fmt(net)} color={net >= 0 ? colors.positive : colors.negative} colors={colors} />
        </View>

        {/* Over-budget alerts */}
        {alerts.length > 0 && (
          <View style={[s.card, { backgroundColor: colors.negative + '18', borderColor: colors.negative + '55' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Ionicons name="warning-outline" size={16} color={colors.negative} />
              <Text style={[s.cardLabel, { color: colors.negative, marginBottom: 0 }]}>OVER BUDGET</Text>
            </View>
            {alerts.map(a => (
              <Text key={a.label} style={{ fontSize: 13, color: colors.negative, marginBottom: 2 }}>
                • {a.label} — {a.pct}% used ({fmt(a.real)} / {fmt(a.budget)})
              </Text>
            ))}
          </View>
        )}

        {/* Budget utilization */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.cardLabel, { color: colors.textDim }]}>BUDGET UTILIZATION</Text>
          {budgetRows.map(r => (
            <BudgetRow key={r.label} {...r} fmt={fmt} colors={colors} />
          ))}
          <TouchableOpacity
            style={[s.linkBtn, { borderColor: colors.border }]}
            onPress={() => router.push('/budget')}
          >
            <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '700' }}>Manage Budget →</Text>
          </TouchableOpacity>
        </View>

        {/* Recent transactions — always shows all-time recents, not month-filtered */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={[s.cardLabel, { color: colors.textDim, marginBottom: 0 }]}>RECENT TRANSACTIONS</Text>
            <TouchableOpacity onPress={() => router.push('/transactions')}>
              <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '700' }}>See all →</Text>
            </TouchableOpacity>
          </View>

          {recent.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Ionicons name="receipt-outline" size={32} color={colors.textDim} />
              <Text style={{ color: colors.textDim, marginTop: 8, fontSize: 13 }}>No transactions yet</Text>
              <TouchableOpacity
                style={[s.fab, { marginTop: 12, width: 'auto', paddingHorizontal: 18, borderRadius: 20, flexDirection: 'row', gap: 6, height: 38 }]}
                onPress={() => setQuickAddVisible(true)}
              >
                <Ionicons name="add" size={16} color={colors.bg} />
                <Text style={{ color: colors.bg, fontWeight: '800', fontSize: 13 }}>Add Transaction</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recent.map(t => (
              <View key={t.id} style={[s.txnRow, { borderColor: colors.borderDim }]}>
                <View style={[s.txnDot, { backgroundColor: catColors[t.category] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>{t.subCategory}</Text>
                  <Text style={{ fontSize: 11, color: colors.textDim }}>{t.date} · {t.category}</Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: t.category === 'Income' ? colors.positive : colors.text }}>
                  {t.category === 'Income' ? '+' : '-'}{fmt(t.amount)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Quick links */}
        <View style={s.row2}>
          {[
            { label: 'Budget',    icon: 'list-outline',      route: '/budget',    color: colors.bills   },
            { label: 'Analytics', icon: 'bar-chart-outline', route: '/analytics', color: colors.savings },
          ].map(item => (
            <TouchableOpacity
              key={item.label}
              style={[s.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(item.route as any)}
            >
              <Ionicons name={item.icon as any} size={24} color={item.color} />
              <Text style={{ fontSize: 13, color: colors.text, fontWeight: '700', marginTop: 6 }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <QuickAddModal
        visible={quickAddVisible}
        onClose={() => setQuickAddVisible(false)}
        db={db}
        onSave={handleQuickAdd}
        colors={colors}
        catColors={catColors}
        currency={currency}
        liveRates={liveRates}
      />
    </SafeAreaView>
  );
}

const makeScreenStyles = (colors: any) => StyleSheet.create({
  safe:    { flex: 1 },
  content: { padding: 14, gap: 12 },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  pageTitle:  { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  pageSub:    { fontSize: 12, marginTop: 2 },

  fab: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  banner:      { borderWidth: 1, borderRadius: 10, padding: 18, alignItems: 'center' },
  bannerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2.5, textTransform: 'uppercase' },
  bannerValue: { fontSize: 32, fontWeight: '900', letterSpacing: -1, marginVertical: 4 },
  bannerSub:   { fontSize: 11 },

  row3:     { flexDirection: 'row', gap: 8 },
  card:     { borderWidth: 1, borderRadius: 10, padding: 14 },
  cardLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 14 },

  linkBtn:  { marginTop: 8, paddingTop: 10, borderTopWidth: 1, alignItems: 'center' },

  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1 },
  txnDot: { width: 10, height: 10, borderRadius: 5 },

  row2:      { flexDirection: 'row', gap: 8 },
  quickCard: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 16, alignItems: 'center' },
});

const dStyles = StyleSheet.create({
  statCard:  { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1 },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  statValue: { fontSize: 15, fontWeight: '800', marginTop: 4 },
});