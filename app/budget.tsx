// app/budget.tsx
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { useTheme } from '../context/ThemeContext';
import { CURRENCIES } from '../constants/theme';
import { fmtC, cvt, toUSD, uid } from '../utils/format';

const CARD_CONFIGS = [
  { key: 'income',        label: 'Income',        schema: 'income'  as const },
  { key: 'expenses',      label: 'Expenses',      schema: 'budget'  as const },
  { key: 'bills',         label: 'Bills',         schema: 'budget'  as const },
  { key: 'savings',       label: 'Savings',       schema: 'budget'  as const },
  { key: 'debts',         label: 'Debts',         schema: 'budget'  as const },
  { key: 'subscriptions', label: 'Subscriptions', schema: 'budget'  as const },
];

/* ── Util bar ─────────────────────── */
const UtilBar = ({ pct, color, colors }: { pct: number; color: string; colors: any }) => {
  const capped = Math.min(Math.abs(pct), 100);
  const c = pct > 100 ? colors.negative : color;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={[styles.utilTrack, { backgroundColor: colors.surface }]}>
        <View style={[styles.utilFill, { width: `${capped}%` as any, backgroundColor: c }]} />
      </View>
      <Text style={{ fontSize: 10, color: pct > 100 ? colors.negative : colors.textDim }}>{pct}%</Text>
    </View>
  );
};

/* ─────────────────────────────────────────────────────────────────────
   RowModal
   - initialData.displayAmount  = value already in user's currency (NOT USD)
   - onSave receives displayAmount in user's currency; caller does toUSD()
   ───────────────────────────────────────────────────────────────────── */
const RowModal = ({
  visible, onClose, onSave, schema, titleColor, initialData, colors, currencySymbol,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { name: string; displayAmount: number }) => void;
  schema: 'income' | 'budget';
  titleColor: string;
  initialData?: { id: string; name: string; displayAmount: number } | null;
  colors: any;
  currencySymbol: string;
}) => {
  const isIncome = schema === 'income';
  const [name,   setName]   = useState('');
  const [amount, setAmount] = useState('');

  React.useEffect(() => {
    if (visible) {
      setName(initialData?.name ?? '');
      setAmount(
        initialData?.displayAmount != null
          ? String(initialData.displayAmount)
          : ''
      );
    }
  }, [visible, initialData]);

  const canSave = name.trim().length > 0 && parseFloat(amount) > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ name: name.trim(), displayAmount: parseFloat(amount) });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.modalHandle, { backgroundColor: titleColor }]} />
          <Text style={[styles.modalTitle, { color: titleColor }]}>
            {initialData ? 'Edit Row' : 'Add Row'}
          </Text>

          <Text style={[styles.inputLabel, { color: colors.textDim }]}>
            {isIncome ? 'Source' : 'Sub-Category'}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={name}
            onChangeText={setName}
            placeholder={isIncome ? 'e.g. Salary' : 'e.g. Groceries'}
            placeholderTextColor={colors.textDim}
            autoFocus
          />

          {/* Label shows the currency symbol so user knows what unit they're entering */}
          <Text style={[styles.inputLabel, { marginTop: 14, color: colors.textDim }]}>
            {isIncome ? 'Expected Amount' : 'Budget Amount'} ({currencySymbol})
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textDim}
            keyboardType="decimal-pad"
          />

          <View style={styles.modalBtns}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={{ color: colors.textDim, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: titleColor, opacity: canSave ? 1 : 0.4 }]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text style={{ color: colors.bg, fontWeight: '800', fontSize: 14 }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/* ── Budget Table Card ─────────────── */
const BudgetCard = ({
  title, schema, dbKey, currency, liveRates, transactions,
}: {
  title: string;
  schema: 'income' | 'budget';
  dbKey: string;
  currency: string;
  liveRates: Record<string, number>;
  transactions: any[];
}) => {
  const { db, addRow, editRow, deleteRow } = useStore();
  const { colors, catColors } = useTheme();
  const color     = catColors[title] || colors.accent;
  const isIncome  = schema === 'income';
  const curSymbol = (CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]).symbol;

  const [expanded,     setExpanded]     = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editData,     setEditData]     = useState<{ id: string; name: string; displayAmount: number } | null>(null);

  const rows = (db as any)[dbKey] || [];

  // fmtC: USD → display currency string
  const fmt = (usdVal: number) => fmtC(usdVal, currency, liveRates);

  // USD → display-currency number (for pre-filling the modal)
  const toDisplay = (usdVal: number): number => {
    const raw = cvt(usdVal, currency, liveRates);
    return currency === 'JPY' ? Math.round(raw) : Math.round(raw * 100) / 100;
  };

  // Transactions are stored in USD (same as budget rows)
  const realMap = useMemo(() => {
    const m: Record<string, number> = {};
    transactions.forEach(t => { m[t.subCategory] = (m[t.subCategory] || 0) + t.amount; });
    return m;
  }, [transactions]);

  const totalBudgetUSD = rows.reduce((s: number, r: any) => s + (isIncome ? r.expected : r.budget), 0);
  const totalRealUSD   = rows.reduce((s: number, r: any) => s + (realMap[isIncome ? r.source : r.sub] || 0), 0);

  /* Normalise a DB row → modal-friendly shape */
  const toEditData = (r: any) => ({
    id:            r.id,
    name:          isIncome ? r.source : r.sub,
    displayAmount: toDisplay(isIncome ? r.expected : r.budget),
  });

  /* Add: user entered displayAmount in their currency → convert to USD */
  const handleAdd = ({ name, displayAmount }: { name: string; displayAmount: number }) => {
    const usdVal = toUSD(displayAmount, currency, liveRates);
    if (isIncome) {
      addRow(dbKey as any, { id: uid(), source: name, expected: usdVal, real: 0 });
    } else {
      addRow(dbKey as any, { id: uid(), sub: name, budget: usdVal, real: 0 });
    }
  };

  /* Edit: same conversion */
  const handleEdit = ({ name, displayAmount }: { name: string; displayAmount: number }) => {
    if (!editData) return;
    const usdVal = toUSD(displayAmount, currency, liveRates);
    if (isIncome) {
      editRow(dbKey as any, editData.id, { source: name, expected: usdVal });
    } else {
      editRow(dbKey as any, editData.id, { sub: name, budget: usdVal });
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
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: color }]}>
      {/* Header */}
      <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded(e => !e)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.cardTitle, { color }]}>{title}</Text>
          <Text style={{ fontSize: 10, color: colors.textDim }}>{rows.length} rows</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 13, color: colors.text, fontWeight: '700' }}>{fmt(totalRealUSD)}</Text>
          <Text style={{ fontSize: 11, color: colors.textDim }}>/ {fmt(totalBudgetUSD)}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textDim} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <>
          <View style={[styles.tblHead, { backgroundColor: colors.surface }]}>
            <Text style={[styles.tblHCell, { flex: 2, color: colors.textDim }]}>{isIncome ? 'Source' : 'Sub-Category'}</Text>
            <Text style={[styles.tblHCell, { flex: 1, color: colors.textDim }]}>{isIncome ? 'Expected' : 'Budget'}</Text>
            <Text style={[styles.tblHCell, { flex: 1, color: colors.textDim }]}>Actual</Text>
            <Text style={[styles.tblHCell, { flex: 1, color: colors.textDim }]}>Util</Text>
            <View style={{ width: 26 }} />
          </View>

          {rows.map((r: any) => {
            const name      = isIncome ? r.source : r.sub;
            const budgetUSD = isIncome ? r.expected : r.budget;
            const realUSD   = realMap[name] || 0;
            const pct       = budgetUSD > 0 ? Math.round((realUSD / budgetUSD) * 100) : 0;
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.tblRow, { borderTopColor: colors.borderDim }]}
                onPress={() => { setEditData(toEditData(r)); setModalVisible(true); }}
              >
                <Text style={[styles.tblCell, { flex: 2, color: colors.text }]} numberOfLines={1}>{name}</Text>
                <Text style={[styles.tblCell, { flex: 1, color: colors.text }]}>{fmt(budgetUSD)}</Text>
                <Text style={[styles.tblCell, { flex: 1, color: realUSD > 0 ? colors.text : colors.textDim }]}>
                  {fmt(realUSD)}
                </Text>
                <View style={{ flex: 1 }}>
                  <UtilBar pct={pct} color={color} colors={colors} />
                </View>
                <TouchableOpacity style={{ width: 26, alignItems: 'center' }} onPress={() => handleDelete(r.id, name)}>
                  <Ionicons name="close" size={15} color={colors.textDim} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          {/* Totals row */}
          <View style={[styles.tblRow, styles.tblTotal, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Text style={[styles.tblCell, { flex: 2, color, fontWeight: '800' }]}>TOTAL</Text>
            <Text style={[styles.tblCell, { flex: 1, color, fontWeight: '700' }]}>{fmt(totalBudgetUSD)}</Text>
            <Text style={[styles.tblCell, { flex: 1, color, fontWeight: '700' }]}>{fmt(totalRealUSD)}</Text>
            <Text style={[styles.tblCell, { flex: 1, color: colors.textDim }]}>
              {totalBudgetUSD > 0 ? Math.round((totalRealUSD / totalBudgetUSD) * 100) : 0}%
            </Text>
            <View style={{ width: 26 }} />
          </View>

          <TouchableOpacity
            style={[styles.addRowBtn, { borderTopColor: colors.border }]}
            onPress={() => { setEditData(null); setModalVisible(true); }}
          >
            <Ionicons name="add" size={15} color={color} />
            <Text style={{ fontSize: 12, color, fontWeight: '700', letterSpacing: 1 }}>Add row</Text>
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
        colors={colors}
        currencySymbol={curSymbol}
      />
    </View>
  );
};

/* ── Budget Screen ────────────────── */
export default function BudgetScreen() {
  const { db, liveRates } = useStore();
  const { colors }        = useTheme();
  const { currency, month, year } = db;

  const monthTxns = useMemo(() => db.transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  }), [db.transactions, month, year]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.textBright }]}>Budget</Text>
        <Text style={[styles.pageSub, { color: colors.textDim }]}>Tap a row to edit · Press × to delete</Text>

        {CARD_CONFIGS.map(cfg => (
          <BudgetCard
            key={cfg.key}
            title={cfg.label}
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
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 14, gap: 10 },

  pageTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  pageSub:   { fontSize: 11, marginBottom: 4 },

  card: { borderWidth: 1, borderLeftWidth: 3, borderRadius: 8, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  cardTitle:  { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },

  tblHead:  { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 7, alignItems: 'center' },
  tblHCell: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  tblRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9, borderTopWidth: 1 },
  tblTotal: { borderTopWidth: 1 },
  tblCell:  { fontSize: 11 },

  utilTrack: { width: 44, height: 5, borderRadius: 2, overflow: 'hidden' },
  utilFill:  { height: '100%', borderRadius: 2 },

  addRowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderTopWidth: 1 },

  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, borderTopWidth: 1 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle:  { fontSize: 17, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 20 },
  inputLabel:  { fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 7, padding: 13, fontSize: 15, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },
  modalBtns:  { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancelBtn:  { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  saveBtn:    { flex: 2, padding: 14, borderRadius: 8, alignItems: 'center' },
});