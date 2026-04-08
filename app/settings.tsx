// app/settings.tsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { useTheme } from '../context/ThemeContext';
import { CURRENCIES, MONTHS, YEARS } from '../constants/theme';
import { fmtC, cvt, toUSD } from '../utils/format';
import { supabase } from '../lib/supabase';

const Section = ({ title, children, colors }: any) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: colors.textDim }]}>{title}</Text>
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  </View>
);

const Row = ({ label, icon, iconColor, right, onPress, last, colors }: any) => (
  <TouchableOpacity
    style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={[styles.iconCircle, { backgroundColor: iconColor + '22' }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
    </View>
    {right}
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const {
    db, liveRates, setCurrency, setMonth, setYear,
    setInitialBalance, persist, fetchRates,
    getCarryForwardBalance, getMonthlyBalance, getOverallBalance,
  } = useStore();
  const { colors, isDark, toggleTheme } = useTheme();
  const { currency, month, year, initialBalance } = db;

  const [editingBal, setEditingBal] = useState(false);
  const [balInput,   setBalInput]   = useState('');

  const fmt    = (v: number) => fmtC(v, currency, liveRates);
  const curSym = (CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]).symbol;
  const dispBal = Number(cvt(initialBalance, currency, liveRates).toFixed(2));

  const today = new Date();
  const todayMonth = today.getMonth();
  const todayYear  = today.getFullYear();

  const handleBalCommit = () => {
    const v = parseFloat(balInput);
    if (!isNaN(v)) setInitialBalance(toUSD(v, currency, liveRates));
    setEditingBal(false);
  };

  const handleJumpToToday = () => {
    setMonth(todayMonth);
    setYear(todayYear);
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
            const today2 = new Date();
            persist({
              ...(SEED_DATA as any),
              month: today2.getMonth(),
              year: today2.getFullYear(),
            });
          },
        },
      ]
    );
  };

  const handleRefreshRates = () => {
    fetchRates();
    Alert.alert('Rates Updated', 'Currency exchange rates have been refreshed.');
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out', style: 'destructive',
          onPress: () => supabase.auth.signOut(),
        },
      ]
    );
  };

  // Balance summaries
  const carryForward   = getCarryForwardBalance(year, month);
  const monthlyNet     = getMonthlyBalance(year, month);
  const overallBalance = getOverallBalance();

  const isCurrentMonth = month === todayMonth && year === todayYear;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.textBright }]}>Settings</Text>

        {/* ── Appearance ── */}
        <Section title="Appearance" colors={colors}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.iconCircle, { backgroundColor: colors.accent + '22' }]}>
                <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={17} color={colors.accent} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.accent + '88' }}
              thumbColor={isDark ? colors.accent : colors.textDim}
            />
          </View>
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.iconCircle, { backgroundColor: colors.income + '22' }]}>
                <Ionicons name="color-palette-outline" size={17} color={colors.income} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Theme</Text>
            </View>
            <Text style={{ color: colors.textDim, fontSize: 13 }}>{isDark ? 'Dark' : 'Light'}</Text>
          </View>
        </Section>

        {/* ── Period ── */}
        <Section title="Period" colors={colors}>
          {/* Current month indicator + jump to today */}
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.iconCircle, { backgroundColor: colors.accent + '22' }]}>
                <Ionicons name="today-outline" size={17} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Viewing Period</Text>
                <Text style={{ fontSize: 11, color: colors.textDim, marginTop: 1 }}>
                  {MONTHS[month]} {year}{isCurrentMonth ? ' (current)' : ''}
                </Text>
              </View>
            </View>
            {!isCurrentMonth && (
              <TouchableOpacity
                style={[styles.chip, { borderColor: colors.accent, backgroundColor: colors.accent + '22' }]}
                onPress={handleJumpToToday}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent }}>Today</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Month picker */}
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.iconCircle, { backgroundColor: colors.accent + '22' }]}>
                <Ionicons name="calendar-outline" size={17} color={colors.accent} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Month</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {MONTHS.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.chip,
                    { borderColor: colors.border },
                    month === i && { backgroundColor: colors.accent + '33', borderColor: colors.accent },
                    i === todayMonth && year === todayYear && month !== i && { borderColor: colors.accent + '55' },
                  ]}
                  onPress={() => setMonth(i)}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: month === i ? colors.accent : colors.textDim }}>
                    {m.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Year picker */}
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.border, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.iconCircle, { backgroundColor: colors.accent + '22' }]}>
                <Ionicons name="time-outline" size={17} color={colors.accent} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Year</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {YEARS.map(y => (
                <TouchableOpacity
                  key={y}
                  style={[
                    styles.chip,
                    { borderColor: colors.border },
                    year === y && { backgroundColor: colors.accent + '33', borderColor: colors.accent },
                    y === todayYear && year !== y && { borderColor: colors.accent + '55' },
                  ]}
                  onPress={() => setYear(y)}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: year === y ? colors.accent : colors.textDim }}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Section>

        {/* ── Currency ── */}
        <Section title="Currency" colors={colors}>
          <View style={[styles.currencyGrid]}>
            {CURRENCIES.map(c => (
              <TouchableOpacity
                key={c.code}
                style={[
                  styles.currencyChip,
                  { borderColor: colors.border },
                  currency === c.code && { backgroundColor: colors.accent + '22', borderColor: colors.accent },
                ]}
                onPress={() => setCurrency(c.code)}
              >
                <Text style={{ fontSize: 15, fontWeight: '800', color: currency === c.code ? colors.accent : colors.text }}>{c.symbol}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: currency === c.code ? colors.accent : colors.textDim }}>{c.code}</Text>
                <Text style={{ fontSize: 9, color: colors.textDim }} numberOfLines={1}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.refreshBtn, { borderTopColor: colors.border }]} onPress={handleRefreshRates}>
            <Ionicons name="refresh-outline" size={15} color={colors.accent} />
            <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '700' }}>Refresh Exchange Rates</Text>
          </TouchableOpacity>
        </Section>

        {/* ── Balance Overview ── */}
        <Section title="Balance Overview" colors={colors}>
          {/* Initial / Seed balance */}
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center', gap: 10 }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.income + '22' }]}>
              <Ionicons name="wallet-outline" size={17} color={colors.income} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Starting Balance</Text>
              <Text style={{ fontSize: 11, color: colors.textDim }}>One-time balance (all-time baseline)</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {editingBal ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: colors.textDim, fontSize: 14 }}>{curSym}</Text>
                  <TextInput
                    value={balInput}
                    onChangeText={setBalInput}
                    keyboardType="decimal-pad"
                    autoFocus
                    onBlur={handleBalCommit}
                    onSubmitEditing={handleBalCommit}
                    style={[styles.balInput, { color: colors.income, borderBottomColor: colors.income }]}
                    returnKeyType="done"
                  />
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => { setBalInput(String(dispBal)); setEditingBal(true); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <Text style={{ fontSize: 17, fontWeight: '800', color: colors.income }}>{fmt(initialBalance)}</Text>
                  <Ionicons name="pencil-outline" size={13} color={colors.textDim} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Carry-forward balance */}
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.iconCircle, { backgroundColor: colors.savings + '22' }]}>
                <Ionicons name="arrow-forward-circle-outline" size={17} color={colors.savings} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Carried Forward</Text>
                <Text style={{ fontSize: 11, color: colors.textDim }}>Balance entering {MONTHS[month]} {year}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: carryForward >= 0 ? colors.positive : colors.negative }}>
              {fmt(carryForward)}
            </Text>
          </View>

          {/* Monthly net */}
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.iconCircle, { backgroundColor: colors.accent + '22' }]}>
                <Ionicons name="trending-up-outline" size={17} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Monthly Net</Text>
                <Text style={{ fontSize: 11, color: colors.textDim }}>{MONTHS[month]} {year} income − spend</Text>
              </View>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: monthlyNet >= 0 ? colors.positive : colors.negative }}>
              {fmt(monthlyNet)}
            </Text>
          </View>

          {/* Overall / net worth */}
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.iconCircle, { backgroundColor: colors.positive + '22' }]}>
                <Ionicons name="diamond-outline" size={17} color={colors.positive} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Overall Balance</Text>
                <Text style={{ fontSize: 11, color: colors.textDim }}>Starting balance + all transactions</Text>
              </View>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: overallBalance >= 0 ? colors.positive : colors.negative }}>
              {fmt(overallBalance)}
            </Text>
          </View>
        </Section>

        {/* ── About ── */}
        <Section title="About" colors={colors}>
          <Row icon="information-circle-outline" iconColor={colors.savings} label="Version" colors={colors}
            right={<Text style={{ color: colors.textDim, fontSize: 13 }}>1.0.0</Text>} />
          <Row icon="phone-portrait-outline" iconColor={colors.bills} label="Platform" colors={colors} last
            right={<Text style={{ color: colors.textDim, fontSize: 13 }}>Expo / React Native</Text>} />
        </Section>

        {/* ── Data ── */}
        <Section title="Data" colors={colors}>
          <Row
            icon="trash-outline"
            iconColor={colors.negative}
            label="Reset All Data"
            onPress={handleReset}
            colors={colors}
            right={<Ionicons name="chevron-forward" size={15} color={colors.textDim} />}
          />
          <Row
            icon="log-out-outline"
            iconColor={colors.accent}
            label="Sign Out"
            onPress={handleSignOut}
            last
            colors={colors}
            right={<Ionicons name="chevron-forward" size={15} color={colors.textDim} />}
          />
        </Section>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 14, gap: 0 },

  pageTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginBottom: 20 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 6, paddingLeft: 4 },
  sectionCard: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  rowLabel: { fontSize: 15 },

  iconCircle: { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },

  chip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },

  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  currencyChip: {
    width: 72, padding: 10,
    borderRadius: 9, borderWidth: 1,
    alignItems: 'center', gap: 3,
  },

  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 12, borderTopWidth: 1,
  },

  balInput: {
    fontSize: 17, fontWeight: '800',
    borderBottomWidth: 1, minWidth: 80, textAlign: 'right', padding: 0,
  },
});