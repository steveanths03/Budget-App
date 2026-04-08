import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform, Alert, SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors, CAT_COLOR, CATEGORY_LIST, MONTHS } from '../constants/theme';
import { fmtC, uid, todayStr } from '../utils/format';

/* ── Add/Edit Transaction Modal ─────── */
const TxnModal = ({
  visible, onClose, onSave, db, initialData
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  db: any;
  initialData?: any;
}) => {
  const [date, setDate] = useState(initialData?.date || todayStr());
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');
  const [category, setCategory] = useState(initialData?.category || 'Expenses');
  const [subCategory, setSubCategory] = useState(initialData?.subCategory || '');
  const [description, setDescription] = useState(initialData?.description || '');

  React.useEffect(() => {
    if (visible) {
      setDate(initialData?.date || todayStr());
      setAmount(initialData ? String(initialData.amount) : '');
      setCategory(initialData?.category || 'Expenses');
      setSubCategory(initialData?.subCategory || '');
      setDescription(initialData?.description || '');
    }
  }, [visible, initialData]);

  const subOptions = useMemo(() => {
    const map: Record<string, string[]> = {
      Income: db.income.map((r: any) => r.source),
      Expenses: db.expenses.map((r: any) => r.sub),
      Bills: db.bills.map((r: any) => r.sub),
      Savings: db.savings.map((r: any) => r.sub),
      Debts: db.debts.map((r: any) => r.sub),
      Subscriptions: db.subscriptions.map((r: any) => r.sub),
    };
    return map[category] || [];
  }, [db, category]);

  const handleSave = () => {
    if (!date || !amount || !subCategory) return;
    onSave({ date, amount: parseFloat(amount) || 0, category, subCategory, description });
    onClose();
  };

  const canSave = date && amount && subCategory;
  const color = CAT_COLOR[category];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
        <ScrollView
          style={styles.modalSheet}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={[styles.modalHandle, { backgroundColor: color }]} />
          <Text style={[styles.modalTitle, { color }]}>
            {initialData ? 'Edit Transaction' : 'Add Transaction'}
          </Text>

          {/* Date */}
          <Text style={styles.inputLabel}>Date</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textDim}
            keyboardType="numbers-and-punctuation"
          />

          {/* Amount */}
          <Text style={[styles.inputLabel, { marginTop: 12 }]}>Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={Colors.textDim}
            keyboardType="decimal-pad"
          />

          {/* Category */}
          <Text style={[styles.inputLabel, { marginTop: 12 }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
              {CATEGORY_LIST.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    { borderColor: CAT_COLOR[cat] },
                    category === cat && { backgroundColor: CAT_COLOR[cat] + '33' },
                  ]}
                  onPress={() => { setCategory(cat); setSubCategory(''); }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: CAT_COLOR[cat] }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Sub-Category */}
          <Text style={[styles.inputLabel, { marginTop: 12 }]}>Sub-Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
              {subOptions.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.catChip,
                    { borderColor: Colors.border },
                    subCategory === s && { backgroundColor: color + '33', borderColor: color },
                  ]}
                  onPress={() => setSubCategory(s)}
                >
                  <Text style={{ fontSize: 10, fontWeight: '600', color: subCategory === s ? color : Colors.textDim }}>{s}</Text>
                </TouchableOpacity>
              ))}
              {subOptions.length === 0 && (
                <Text style={{ fontSize: 10, color: Colors.textDim, paddingVertical: 8 }}>
                  Add budget rows first to populate options
                </Text>
              )}
            </View>
          </ScrollView>
          {/* Custom sub-category input */}
          <TextInput
            style={[styles.input, { marginTop: 6 }]}
            value={subCategory}
            onChangeText={setSubCategory}
            placeholder="Or type custom sub-category…"
            placeholderTextColor={Colors.textDim}
          />

          {/* Description */}
          <Text style={[styles.inputLabel, { marginTop: 12 }]}>Description (optional)</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Note…"
            placeholderTextColor={Colors.textDim}
          />

          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={{ color: Colors.textDim, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: color, opacity: canSave ? 1 : 0.4 }]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text style={{ color: Colors.bg, fontWeight: '800', fontSize: 13 }}>Save</Text>
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
  const { currency, month, year } = db;
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const fmt = (v: number) => fmtC(v, currency, liveRates);

  const monthTxns = useMemo(() => db.transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  }), [db.transactions, month, year]);

  const displayed = useMemo(() => {
    let arr = [...monthTxns];
    if (filterCat !== 'All') arr = arr.filter(t => t.category === filterCat);
    if (search) arr = arr.filter(t =>
      t.subCategory.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase())
    );
    return arr.sort((a, b) => b.date.localeCompare(a.date));
  }, [monthTxns, filterCat, search]);

  const catTotals = useMemo(() => {
    const t: Record<string, number> = {};
    CATEGORY_LIST.forEach(c => { t[c] = 0; });
    monthTxns.forEach(tx => { if (t[tx.category] !== undefined) t[tx.category] += tx.amount; });
    return t;
  }, [monthTxns]);

  const handleAdd = (data: any) => {
    addTransaction({ id: uid(), ...data });
  };

  const handleEdit = (data: any) => {
    if (!editData) return;
    editTransaction(editData.id, data);
    setEditData(null);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Transaction', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(id) },
    ]);
  };

  const totalIn = monthTxns.filter(t => t.category === 'Income').reduce((s, t) => s + t.amount, 0);
  const totalOut = monthTxns.filter(t => t.category !== 'Income').reduce((s, t) => s + t.amount, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>

        {/* Fixed header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Transactions</Text>
            <Text style={styles.pageSub}>{MONTHS[month]} {year} · {monthTxns.length} entries</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setEditData(null); setModalVisible(true); }}
          >
            <Ionicons name="add" size={22} color={Colors.bg} />
          </TouchableOpacity>
        </View>

        {/* Summary strip */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={{ fontSize: 9, color: Colors.textDim, letterSpacing: 1 }}>IN</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: Colors.positive }}>{fmt(totalIn)}</Text>
          </View>
          <View style={{ width: 1, height: '80%', backgroundColor: Colors.border }} />
          <View style={styles.summaryItem}>
            <Text style={{ fontSize: 9, color: Colors.textDim, letterSpacing: 1 }}>OUT</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: Colors.negative }}>{fmt(totalOut)}</Text>
          </View>
          <View style={{ width: 1, height: '80%', backgroundColor: Colors.border }} />
          <View style={styles.summaryItem}>
            <Text style={{ fontSize: 9, color: Colors.textDim, letterSpacing: 1 }}>NET</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: totalIn - totalOut >= 0 ? Colors.positive : Colors.negative }}>
              {fmt(totalIn - totalOut)}
            </Text>
          </View>
        </View>

        {/* Category filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 6, paddingHorizontal: 14 }}>
          <TouchableOpacity
            style={[styles.filterChip, filterCat === 'All' && { backgroundColor: Colors.accent + '33', borderColor: Colors.accent }]}
            onPress={() => setFilterCat('All')}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: filterCat === 'All' ? Colors.accent : Colors.textDim }}>All</Text>
          </TouchableOpacity>
          {CATEGORY_LIST.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, { borderColor: CAT_COLOR[cat] }, filterCat === cat && { backgroundColor: CAT_COLOR[cat] + '22' }]}
              onPress={() => setFilterCat(f => f === cat ? 'All' : cat)}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: CAT_COLOR[cat] }}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={14} color={Colors.textDim} style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search transactions…"
            placeholderTextColor={Colors.textDim}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: 12 }}>
              <Ionicons name="close-circle" size={16} color={Colors.textDim} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Transaction list */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {displayed.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color={Colors.textDim} />
              <Text style={{ color: Colors.textDim, marginTop: 10, fontSize: 13 }}>
                {search || filterCat !== 'All' ? 'No matching transactions' : `No transactions for ${MONTHS[month]} ${year}`}
              </Text>
              <TouchableOpacity
                style={[styles.addBtn, { marginTop: 16, paddingHorizontal: 20, borderRadius: 20, flexDirection: 'row', gap: 6, width: 'auto' }]}
                onPress={() => { setEditData(null); setModalVisible(true); }}
              >
                <Ionicons name="add" size={16} color={Colors.bg} />
                <Text style={{ color: Colors.bg, fontWeight: '800', fontSize: 12 }}>Add Transaction</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ padding: 14, gap: 6 }}>
              {displayed.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.txnCard}
                  onPress={() => { setEditData(t); setModalVisible(true); }}
                >
                  {/* Coloured left stripe */}
                  <View style={[styles.txnStripe, { backgroundColor: CAT_COLOR[t.category] }]} />
                  <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.text }} numberOfLines={1}>
                          {t.subCategory}
                        </Text>
                        {t.description ? (
                          <Text style={{ fontSize: 10, color: Colors.textDim, marginTop: 1 }} numberOfLines={1}>
                            {t.description}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: t.category === 'Income' ? Colors.positive : Colors.text }}>
                        {t.category === 'Income' ? '+' : '-'}{fmt(t.amount)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                      <View style={[styles.catBadge, { backgroundColor: CAT_COLOR[t.category] + '1a', borderColor: CAT_COLOR[t.category] + '44' }]}>
                        <Text style={{ fontSize: 8, fontWeight: '800', color: CAT_COLOR[t.category], letterSpacing: 1 }}>
                          {t.category.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 10, color: Colors.textDim }}>{t.date}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.txnDelete}
                    onPress={() => handleDelete(t.id, t.subCategory)}
                  >
                    <Ionicons name="trash-outline" size={14} color={Colors.textDim} />
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
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
  },
  pageTitle: { fontSize: 22, fontWeight: '900', color: Colors.textBright, letterSpacing: -0.5 },
  pageSub: { fontSize: 10, color: Colors.textDim, marginTop: 1 },

  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },

  summaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    marginBottom: 8,
  },
  summaryItem: { alignItems: 'center', gap: 4 },

  filterRow: { marginBottom: 8, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  searchInput: { flex: 1, padding: 10, fontSize: 13, color: Colors.text },

  emptyState: { alignItems: 'center', paddingTop: 80 },

  txnCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  txnStripe: { width: 4 },
  txnDelete: { padding: 14, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: Colors.border },
  catBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 3, borderWidth: 1 },

  // Modal
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderTopWidth: 1,
    borderColor: Colors.border,
    maxHeight: '90%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 20 },
  inputLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: Colors.textDim, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
  },
  catChip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 8,
    backgroundColor: Colors.surface, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  saveBtn: { flex: 2, padding: 14, borderRadius: 8, alignItems: 'center' },
});
