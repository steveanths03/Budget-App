import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors, CURRENCIES, MONTHS, YEARS } from '../constants/theme';
import { fmtC, cvt, toUSD } from '../utils/format';

const Section = ({ title, children }: any) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionCard}>{children}</View>
  </View>
);

const Row = ({ label, icon, iconColor, right, onPress, last }: any) => (
  <TouchableOpacity
    style={[styles.row, !last && styles.rowBorder]}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={[styles.iconCircle, { backgroundColor: iconColor + '22' }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
    {right}
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const { db, liveRates, setCurrency, setMonth, setYear, setInitialBalance, persist, load, fetchRates } = useStore();
  const { currency, month, year, initialBalance } = db;

  const [editingBal, setEditingBal] = useState(false);
  const [balInput, setBalInput] = useState('');

  const fmt = (v: number) => fmtC(v, currency, liveRates);
  const curSym = (CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]).symbol;
  const dispBal = Number(cvt(initialBalance, currency, liveRates).toFixed(2));

  const handleBalCommit = () => {
    const v = parseFloat(balInput);
    if (!isNaN(v)) setInitialBalance(toUSD(v, currency, liveRates));
    setEditingBal(false);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset All Data',
      'This will erase all your budget data and transactions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset', style: 'destructive',
          onPress: async () => {
            const { SEED_DATA } = await import('../constants/seed');
            persist(SEED_DATA as any);
          },
        },
      ]
    );
  };

  const handleRefreshRates = () => {
    fetchRates();
    Alert.alert('Rates Updated', 'Currency exchange rates have been refreshed.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>Settings</Text>

        {/* ── Period ── */}
        <Section title="Period">
          <Row
            label="Month"
            icon="calendar-outline"
            iconColor={Colors.accent}
            right={
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: 200 }}>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {MONTHS.map((m, i) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.chip, month === i && { backgroundColor: Colors.accent + '33', borderColor: Colors.accent }]}
                      onPress={() => setMonth(i)}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: month === i ? Colors.accent : Colors.textDim }}>
                        {m.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            }
          />
          <Row
            label="Year"
            icon="time-outline"
            iconColor={Colors.accent}
            last
            right={
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {YEARS.map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.chip, year === y && { backgroundColor: Colors.accent + '33', borderColor: Colors.accent }]}
                    onPress={() => setYear(y)}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: year === y ? Colors.accent : Colors.textDim }}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />
        </Section>

        {/* ── Currency ── */}
        <Section title="Currency">
          <View style={styles.currencyGrid}>
            {CURRENCIES.map(c => (
              <TouchableOpacity
                key={c.code}
                style={[
                  styles.currencyChip,
                  currency === c.code && { backgroundColor: Colors.accent + '22', borderColor: Colors.accent },
                ]}
                onPress={() => setCurrency(c.code)}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: currency === c.code ? Colors.accent : Colors.text }}>{c.symbol}</Text>
                <Text style={{ fontSize: 9, fontWeight: '700', color: currency === c.code ? Colors.accent : Colors.textDim }}>{c.code}</Text>
                <Text style={{ fontSize: 8, color: Colors.textDim }} numberOfLines={1}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefreshRates}>
            <Ionicons name="refresh-outline" size={14} color={Colors.accent} />
            <Text style={{ fontSize: 11, color: Colors.accent, fontWeight: '700' }}>Refresh Exchange Rates</Text>
          </TouchableOpacity>
        </Section>

        {/* ── Initial Balance ── */}
        <Section title="Initial Balance">
          <View style={[styles.row, { alignItems: 'center', gap: 10 }]}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.income + '22' }]}>
              <Ionicons name="wallet-outline" size={16} color={Colors.income} />
            </View>
            <Text style={styles.rowLabel}>Starting Balance</Text>
            <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
              {editingBal ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: Colors.textDim, fontSize: 13 }}>{curSym}</Text>
                  <TextInput
                    value={balInput}
                    onChangeText={setBalInput}
                    keyboardType="decimal-pad"
                    autoFocus
                    onBlur={handleBalCommit}
                    onSubmitEditing={handleBalCommit}
                    style={styles.balInput}
                    returnKeyType="done"
                  />
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => { setBalInput(String(dispBal)); setEditingBal(true); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.income }}>{fmt(initialBalance)}</Text>
                  <Ionicons name="pencil-outline" size={12} color={Colors.textDim} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Section>

        {/* ── About ── */}
        <Section title="About">
          <Row icon="information-circle-outline" iconColor={Colors.savings} label="Version" right={<Text style={{ color: Colors.textDim, fontSize: 12 }}>1.0.0</Text>} />
          <Row icon="phone-portrait-outline" iconColor={Colors.bills} label="Platform" right={<Text style={{ color: Colors.textDim, fontSize: 12 }}>Expo / React Native</Text>} last />
        </Section>

        {/* ── Danger ── */}
        <Section title="Data">
          <Row
            icon="trash-outline"
            iconColor={Colors.negative}
            label="Reset All Data"
            onPress={handleReset}
            last
            right={<Ionicons name="chevron-forward" size={14} color={Colors.textDim} />}
          />
        </Section>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 14, gap: 0 },

  pageTitle: { fontSize: 22, fontWeight: '900', color: Colors.textBright, letterSpacing: -0.5, marginBottom: 20 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 2.5, textTransform: 'uppercase', color: Colors.textDim, marginBottom: 6, paddingLeft: 4 },
  sectionCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, overflow: 'hidden' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { fontSize: 14, color: Colors.text },

  iconCircle: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  chip: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
  },

  currencyGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14,
  },
  currencyChip: {
    width: 70, padding: 10,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', gap: 2,
  },

  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 12, borderTopWidth: 1, borderTopColor: Colors.border,
  },

  balInput: {
    color: Colors.income, fontSize: 16, fontWeight: '800',
    borderBottomWidth: 1, borderBottomColor: Colors.income,
    minWidth: 80, textAlign: 'right',
    padding: 0,
  },
});
