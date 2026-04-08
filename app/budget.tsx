import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors, CAT_COLOR } from '../constants/theme';
import { fmtC, uid } from '../utils/format';

/* ── Shared styles ─────────────────── */
const LABEL_STYLE = {
  fontSize: 8 as const, fontWeight: '700' as const, letterSpacing: 2 as const,
  textTransform: 'uppercase' as const, color: Colors.textDim,
};

const CARD_CONFIGS = [
  { key: 'income', label: 'Income', color: Colors.income, schema: 'income' as const },
  { key: 'expenses', label: 'Expenses', color: Colors.expenses, schema: 'budget' as const },
  { key: 'bills', label: 'Bills', color: Colors.bills, schema: 'budget' as const },
  { key: 'savings', label: 'Savings', color: Colors.savings, schema: 'budget' as const },
  { key: 'debts', label: 'Debts', color: Colors.debts, schema: 'budget' as const },
  { key: 'subscriptions', label: 'Subscriptions', color: Colors.subscriptions, schema: 'budget' as const },
];

/* ── Util bar ─────────────────────── */
const UtilBar = ({ pct, color }: { pct: number; color: string }) => {
  const capped = Math.min(Math.abs(pct), 100);
  const c = pct > 100 ? Colors.negative : color;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={styles.utilTrack}>
        <View style={[styles.utilFill, { width: `${capped}%` as any, backgroundColor: c }]} />
      </View>
      <Text style={{ fontSize: 9, color: pct > 100 ? Colors.negative : Colors.textDim }}>{pct}%</Text>
    </View>
  );
};

/* ── Add/Edit Row Modal ────────────── */
const RowModal = ({
  visible, onClose, onSave, schema, titleColor, initialData
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  schema: 'income' | 'budget';
  titleColor: string;
  initialData?: any;
}) => {
  const isIncome = schema === 'income';
  const [name, setName] = useState(initialData?.name || '');
  const [amount, setAmount] = useState(initialData?.amount || '');

  React.useEffect(() => {
    if (visible) {
      setName(initialData?.name || '');
      setAmount(initialData?.amount || '');
    }
  }, [visible, initialData]);

  const handleSave = () => {
    if (!name || !amount) return;
    onSave({ name, amount: parseFloat(amount) || 0 });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={[styles.modalHandle, { backgroundColor: titleColor }]} />
          <Text style={[styles.modalTitle, { color: titleColor }]}>
            {initialData ? 'Edit Row' : 'Add Row'}
          </Text>

          <Text style={styles.inputLabel}>{isIncome ? 'Source' : 'Sub-Category'}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={isIncome ? 'e.g. Paycheck' : 'e.g. Groceries'}
            placeholderTextColor={Colors.textDim}
            autoFocus
          />

          <Text style={[styles.inputLabel, { marginTop: 12 }]}>{isIncome ? 'Expected Amount' : 'Budget Amount'}</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={Colors.textDim}
            keyboardType="decimal-pad"
          />

          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={{ color: Colors.textDim, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: titleColor, opacity: name && amount ? 1 : 0.4 }]}
              onPress={handleSave}
              disabled={!name || !amount}
            >
              <Text style={{ color: Colors.bg, fontWeight: '800', fontSize: 13 }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/* ── Budget Table Card ─────────────── */
const BudgetCard = ({
  title, color, schema, dbKey, currency, liveRates, transactions,
}: {
  title: string; color: string; schema: 'income' | 'budget';
  dbKey: string; currency: string; liveRates: Record<string, number>;
  transactions: any[];
}) => {
  const { db, addRow, editRow, deleteRow } = useStore();
  const [expanded, setExpanded] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const rows = (db as any)[dbKey] || [];
  const fmt = (v: number) => fmtC(v, currency, liveRates);
  const isIncome = schema === 'income';

  // derive real spend from transactions
  const realMap = useMemo(() => {
    const m: Record<string, number> = {};
    transactions.forEach(t => { m[t.subCategory] = (m[t.subCategory] || 0) + t.amount; });
    return m;
  }, [transactions]);

  const totalBudget = rows.reduce((s: number, r: any) => s + (isIncome ? r.expected : r.budget), 0);
  const totalReal = rows.reduce((s: number, r: any) => {
    const name = isIncome ? r.source : r.sub;
    return s + (realMap[name] || 0);
  }, 0);

  const handleAdd = (data: any) => {
    if (isIncome) {
      addRow(dbKey as any, { id: uid(), source: data.name, expected: data.amount, real: 0 });
    } else {
      addRow(dbKey as any, { id: uid(), sub: data.name, budget: data.amount, real: 0 });
    }
  };

  const handleEdit = (data: any) => {
    if (!editData) return;
    if (isIncome) {
      editRow(dbKey as any, editData.id, { source: data.name, expected: data.amount });
    } else {
      editRow(dbKey as any, editData.id, { sub: data.name, budget: data.amount });
    }
    setEditData(null);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Row', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRow(dbKey as any, id) },
    ]);
  };

  return (
    <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: color }]}>
      {/* Card header */}
      <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded(e => !e)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.cardTitle, { color }]}>{title}</Text>
          <Text style={{ fontSize: 9, color: Colors.textDim }}>{rows.length} rows</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 11, color: Colors.text, fontWeight: '700' }}>{fmt(totalReal)}</Text>
          <Text style={{ fontSize: 10, color: Colors.textDim }}>/ {fmt(totalBudget)}</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14} color={Colors.textDim}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <>
          {/* Column headers */}
          <View style={styles.tblHead}>
            <Text style={[styles.tblHCell, { flex: 2 }]}>{isIncome ? 'Source' : 'Sub-Category'}</Text>
            <Text style={[styles.tblHCell, { flex: 1 }]}>{isIncome ? 'Expected' : 'Budget'}</Text>
            <Text style={[styles.tblHCell, { flex: 1 }]}>Actual</Text>
            <Text style={[styles.tblHCell, { flex: 1 }]}>Util</Text>
            <View style={{ width: 24 }} />
          </View>

          {rows.map((r: any) => {
            const name = isIncome ? r.source : r.sub;
            const budgetVal = isIncome ? r.expected : r.budget;
            const realVal = realMap[name] || 0;
            const pct = budgetVal > 0 ? Math.round((realVal / budgetVal) * 100) : 0;
            return (
              <TouchableOpacity
                key={r.id}
                style={styles.tblRow}
                onPress={() => {
                  setEditData({ id: r.id, name, amount: String(budgetVal) });
                  setModalVisible(true);
                }}
              >
                <Text style={[styles.tblCell, { flex: 2 }]} numberOfLines={1}>{name}</Text>
                <Text style={[styles.tblCell, { flex: 1 }]}>{fmt(budgetVal)}</Text>
                <Text style={[styles.tblCell, { flex: 1, color: realVal > 0 ? Colors.text : Colors.textDim }]}>
                  {fmt(realVal)}
                </Text>
                <View style={{ flex: 1 }}>
                  <UtilBar pct={pct} color={color} />
                </View>
                <TouchableOpacity
                  style={{ width: 24, alignItems: 'center' }}
                  onPress={() => handleDelete(r.id, name)}
                >
                  <Ionicons name="close" size={14} color={Colors.textDim} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          {/* Totals row */}
          <View style={[styles.tblRow, styles.tblTotal]}>
            <Text style={[styles.tblCell, { flex: 2, color, fontWeight: '800' }]}>TOTAL</Text>
            <Text style={[styles.tblCell, { flex: 1, color, fontWeight: '700' }]}>{fmt(totalBudget)}</Text>
            <Text style={[styles.tblCell, { flex: 1, color, fontWeight: '700' }]}>{fmt(totalReal)}</Text>
            <Text style={[styles.tblCell, { flex: 1, color: Colors.textDim }]}>
              {totalBudget > 0 ? Math.round((totalReal / totalBudget) * 100) : 0}%
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Add button */}
          <TouchableOpacity
            style={styles.addRowBtn}
            onPress={() => { setEditData(null); setModalVisible(true); }}
          >
            <Ionicons name="add" size={14} color={color} />
            <Text style={{ fontSize: 11, color, fontWeight: '700', letterSpacing: 1 }}>Add row</Text>
          </TouchableOpacity>
        </>
      )}

      <RowModal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setEditData(null); }}
        onSave={editData ? handleEdit : handleAdd}
        schema={schema}
        titleColor={color}
        initialData={editData}
      />
    </View>
  );
};

/* ── Budget Screen ────────────────── */
export default function BudgetScreen() {
  const { db, liveRates } = useStore();
  const { currency, month, year } = db;

  const monthTxns = useMemo(() => db.transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  }), [db.transactions, month, year]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>Budget</Text>
        <Text style={styles.pageSub}>Tap a row to edit · Swipe to delete</Text>

        {CARD_CONFIGS.map(cfg => (
          <BudgetCard
            key={cfg.key}
            title={cfg.label}
            color={cfg.color}
            schema={cfg.schema}
            dbKey={cfg.key}
            currency={currency}
            liveRates={liveRates}
            transactions={monthTxns.filter(t => t.category === cfg.label)}
          />
        ))}

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
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  cardTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },

  tblHead: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  tblHCell: { fontSize: 8, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: Colors.textDim },
  tblRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDim,
  },
  tblTotal: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tblCell: { fontSize: 10, color: Colors.text },

  utilTrack: { width: 44, height: 5, backgroundColor: Colors.surface, borderRadius: 2, overflow: 'hidden' },
  utilFill: { height: '100%', borderRadius: 2 },

  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  // Modal
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: Colors.border,
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
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 8,
    backgroundColor: Colors.surface, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  saveBtn: { flex: 2, padding: 14, borderRadius: 8, alignItems: 'center' },
});
