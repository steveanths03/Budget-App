// app/transactions.tsx
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { useTheme } from '../context/ThemeContext';
import { CATEGORY_LIST, CURRENCIES, MONTHS } from '../constants/theme';
import { fmtC, toUSD, cvt, uid, todayStr } from '../utils/format';

/* ─────────────────────────────────────────────────────────────────────
   TxnModal
   ───────────────────────────────────────────────────────────────────── */
const TxnModal = ({
  visible, onClose, onSave, db, initialData, colors, catColors, currency, liveRates,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  db: any;
  initialData?: any;
  colors: any;
  catColors: Record<string, string>;
  currency: string;
  liveRates: Record<string, number>;
}) => {
  const curSymbol = (CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]).symbol;

  const [date,        setDate]        = useState(todayStr());
  const [amount,      setAmount]      = useState('');
  const [category,    setCategory]    = useState('Expenses');
  const [subCategory, setSubCategory] = useState('');
  const [description, setDescription] = useState('');

  React.useEffect(() => {
    if (!visible) return;
    setDate(initialData?.date ?? todayStr());
    setCategory(initialData?.category ?? 'Expenses');
    setSubCategory(initialData?.subCategory ?? '');
    setDescription(initialData?.description ?? '');

    if (initialData?.amount != null) {
      const displayVal = cvt(initialData.amount, currency, liveRates);
      setAmount(String(Math.round(displayVal)));
    } else {
      setAmount('');
    }
  }, [visible, initialData, currency, liveRates]);

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

  const canSave = date && parseFloat(amount) > 0 && subCategory;
  const color   = catColors[category];

  const handleSave = () => {
    if (!canSave) return;
    const usdAmount = toUSD(parseFloat(amount), currency, liveRates);
    onSave({ date, amount: usdAmount, category, subCategory, description });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
        <ScrollView
          style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={[styles.modalHandle, { backgroundColor: color }]} />
          <Text style={[styles.modalTitle, { color }]}>
            {initialData ? 'Edit Transaction' : 'Add Transaction'}
          </Text>

          <Text style={[styles.inputLabel, { color: colors.textDim }]}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textDim}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={[styles.inputLabel, { marginTop: 13, color: colors.textDim }]}>
            Amount ({curSymbol})
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={colors.textDim}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.inputLabel, { marginTop: 13, color: colors.textDim }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
              {CATEGORY_LIST.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, { borderColor: catColors[cat] }, category === cat && { backgroundColor: catColors[cat] + '33' }]}
                  onPress={() => { setCategory(cat); setSubCategory(''); }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: catColors[cat] }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={[styles.inputLabel, { marginTop: 13, color: colors.textDim }]}>Sub-Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
              {subOptions.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.catChip, { borderColor: colors.border }, subCategory === s && { backgroundColor: color + '33', borderColor: color }]}
                  onPress={() => setSubCategory(s)}
                >
                  <Text style={{ fontSize: 11, color: subCategory === s ? color : colors.textDim, fontWeight: '600' }}>{s}</Text>
                </TouchableOpacity>
              ))}
              {subOptions.length === 0 && (
                <Text style={{ fontSize: 11, color: colors.textDim, paddingVertical: 8 }}>Add budget rows first</Text>
              )}
            </View>
          </ScrollView>
          <TextInput
            style={[styles.input, { marginTop: 6, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={subCategory}
            onChangeText={setSubCategory}
            placeholder="Or type custom sub-category…"
            placeholderTextColor={colors.textDim}
          />

          <Text style={[styles.inputLabel, { marginTop: 13, color: colors.textDim }]}>Description (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Note…"
            placeholderTextColor={colors.textDim}
          />

          <View style={styles.modalBtns}>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.textDim, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: color, opacity: canSave ? 1 : 0.4 }]}
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

/* ── Transactions Screen ─────────── */
export default function TransactionsScreen() {
  const { db, liveRates, addTransaction, editTransaction, deleteTransaction } = useStore();
  const { colors, catColors } = useTheme();
  const { currency, month, year } = db;

  const [search,       setSearch]       = useState('');
  const [filterCat,    setFilterCat]    = useState('All');
  const [dateScope,    setDateScope]    = useState<'month' | 'all'>('month');
  const [modalVisible, setModalVisible] = useState(false);
  const [editData,     setEditData]     = useState<any>(null);

  const fmt = (usdVal: number) => fmtC(usdVal, currency, liveRates);

  /* Month transactions */
  const monthTxns = useMemo(() => db.transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  }), [db.transactions, month, year]);

  /* All transactions */
  const allTxns = db.transactions;

  /* Source pool depends on dateScope toggle */
  const scopedTxns = dateScope === 'month' ? monthTxns : allTxns;

  /* Applied filters for the LIST only */
  const displayed = useMemo(() => {
    let arr = [...scopedTxns];
    if (filterCat !== 'All') arr = arr.filter(t => t.category === filterCat);
    if (search) arr = arr.filter(t =>
      t.subCategory.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase())
    );
    return arr.sort((a, b) => b.date.localeCompare(a.date));
  }, [scopedTxns, filterCat, search]);

  /* ── IN / OUT / NET always reflect the CURRENT SCOPE (not hardcoded to month) ── */
  const summaryTxns = scopedTxns; // whatever the user toggled
  const totalIn  = summaryTxns.filter(t => t.category === 'Income').reduce((s, t) => s + t.amount, 0);
  const totalOut = summaryTxns.filter(t => t.category !== 'Income').reduce((s, t) => s + t.amount, 0);
  const net      = totalIn - totalOut;

  /* Scope label for the strip */
  const scopeLabel = dateScope === 'month'
    ? `${MONTHS[month].slice(0, 3)} ${year}`
    : 'All Time';

  const handleAdd  = (data: any) => addTransaction({ id: uid(), ...data });
  const handleEdit = (data: any) => {
    if (editData) { editTransaction(editData.id, data); setEditData(null); }
  };
  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Transaction', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(id) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.textBright }]}>Transactions</Text>
            <Text style={[styles.pageSub, { color: colors.textDim }]}>
              {MONTHS[month]} {year} · {monthTxns.length} entries this month
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
            onPress={() => { setEditData(null); setModalVisible(true); }}
          >
            <Ionicons name="add" size={24} color={colors.bg} />
          </TouchableOpacity>
        </View>

        {/* Date scope toggle — ABOVE the summary strip so it's clear what the strip shows */}
        <View style={[styles.scopeRow, { paddingHorizontal: 14, marginBottom: 8 }]}>
          {(['month', 'all'] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[
                styles.scopeBtn,
                { borderColor: colors.border },
                dateScope === s && { backgroundColor: colors.accent + '22', borderColor: colors.accent },
              ]}
              onPress={() => setDateScope(s)}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: dateScope === s ? colors.accent : colors.textDim }}>
                {s === 'month' ? `${MONTHS[month].slice(0, 3)} ${year}` : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary strip — always reflects current dateScope */}
        <View style={[styles.summaryStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: 'IN',  val: totalIn,  color: colors.positive },
            { label: 'OUT', val: totalOut, color: colors.negative },
            { label: 'NET', val: net,      color: net >= 0 ? colors.positive : colors.negative },
          ].map((item, i) => (
            <React.Fragment key={item.label}>
              {i > 0 && <View style={{ width: 1, height: '80%', backgroundColor: colors.border }} />}
              <View style={styles.summaryItem}>
                <Text style={{ fontSize: 9, color: colors.textDim, letterSpacing: 1, textTransform: 'uppercase' }}>
                  {item.label} · {scopeLabel}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: item.color }}>{fmt(item.val)}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 14 }}
        >
          <TouchableOpacity
            style={[styles.filterChip, { borderColor: colors.border }, filterCat === 'All' && { backgroundColor: colors.accent + '33', borderColor: colors.accent }]}
            onPress={() => setFilterCat('All')}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: filterCat === 'All' ? colors.accent : colors.textDim }}>All</Text>
          </TouchableOpacity>
          {CATEGORY_LIST.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, { borderColor: catColors[cat] }, filterCat === cat && { backgroundColor: catColors[cat] + '22' }]}
              onPress={() => setFilterCat(f => f === cat ? 'All' : cat)}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: catColors[cat] }}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={15} color={colors.textDim} style={{ marginLeft: 12 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search transactions…"
            placeholderTextColor={colors.textDim}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: 12 }}>
              <Ionicons name="close-circle" size={17} color={colors.textDim} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Transaction list */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {displayed.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={42} color={colors.textDim} />
              <Text style={{ color: colors.textDim, marginTop: 10, fontSize: 14, textAlign: 'center' }}>
                {search || filterCat !== 'All'
                  ? 'No matching transactions'
                  : dateScope === 'month'
                    ? `No transactions for ${MONTHS[month]} ${year}`
                    : 'No transactions yet'}
              </Text>
              {dateScope === 'month' && db.transactions.length > 0 && monthTxns.length === 0 && (
                <TouchableOpacity onPress={() => setDateScope('all')} style={{ marginTop: 10 }}>
                  <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '700' }}>Show all transactions →</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.addBtn, {
                  marginTop: 16, paddingHorizontal: 20, borderRadius: 20,
                  flexDirection: 'row', gap: 6, width: 'auto', height: 40,
                  backgroundColor: colors.accent,
                }]}
                onPress={() => { setEditData(null); setModalVisible(true); }}
              >
                <Ionicons name="add" size={17} color={colors.bg} />
                <Text style={{ color: colors.bg, fontWeight: '800', fontSize: 13 }}>Add Transaction</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ padding: 14, gap: 7 }}>
              {displayed.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.txnCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => { setEditData(t); setModalVisible(true); }}
                >
                  <View style={[styles.txnStripe, { backgroundColor: catColors[t.category] }]} />
                  <View style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                          {t.subCategory}
                        </Text>
                        {t.description ? (
                          <Text style={{ fontSize: 11, color: colors.textDim, marginTop: 1 }} numberOfLines={1}>
                            {t.description}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: t.category === 'Income' ? colors.positive : colors.text }}>
                        {t.category === 'Income' ? '+' : '-'}{fmt(t.amount)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
                      <View style={[styles.catBadge, { backgroundColor: catColors[t.category] + '1a', borderColor: catColors[t.category] + '44' }]}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: catColors[t.category], letterSpacing: 1 }}>
                          {t.category.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: colors.textDim }}>{t.date}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.txnDelete, { borderLeftColor: colors.border }]}
                    onPress={() => handleDelete(t.id, t.subCategory)}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.textDim} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              <View style={{ height: 20 }} />
            </View>
          )}
        </ScrollView>

        <TxnModal
          visible={modalVisible}
          onClose={() => { setModalVisible(false); setEditData(null); }}
          onSave={editData ? handleEdit : handleAdd}
          db={db}
          initialData={editData}
          colors={colors}
          catColors={catColors}
          currency={currency}
          liveRates={liveRates}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1 },
  container: { flex: 1 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
  },
  pageTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  pageSub:   { fontSize: 11, marginTop: 1 },

  addBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },

  summaryStrip: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 10, marginBottom: 8,
  },
  summaryItem: { alignItems: 'center', gap: 4 },

  scopeRow:  { flexDirection: 'row', gap: 8 },
  scopeBtn:  { flex: 1, paddingVertical: 7, borderRadius: 20, borderWidth: 1, alignItems: 'center' },

  filterRow:  { marginBottom: 8, flexGrow: 0 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 14, borderRadius: 8, borderWidth: 1, marginBottom: 8,
  },
  searchInput: { flex: 1, padding: 11, fontSize: 14 },

  emptyState: { alignItems: 'center', paddingTop: 80 },

  txnCard:   { borderWidth: 1, borderRadius: 8, flexDirection: 'row', overflow: 'hidden' },
  txnStripe: { width: 4 },
  txnDelete: { padding: 14, justifyContent: 'center', borderLeftWidth: 1 },
  catBadge:  { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 3, borderWidth: 1 },

  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, borderTopWidth: 1, maxHeight: '90%',
  },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 17, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 20 },
  inputLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  input:        { borderWidth: 1, borderRadius: 7, padding: 13, fontSize: 15 },
  catChip:      { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  modalBtns:    { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancelBtn:    { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  saveBtn:      { flex: 2, padding: 14, borderRadius: 8, alignItems: 'center' },
});