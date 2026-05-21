import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { StatCard } from '../../components/StatCard';
import { SectionCard } from '../../components/SectionCard';

const SALARY_ITEMS = [
  { label: '基本給',           value: '¥120,000',  color: Colors.text },
  { label: '売上インセンティブ', value: '¥84,000',   color: Colors.gold },
  { label: 'ドリンクバック',    value: '¥32,400',   color: Colors.text },
  { label: '交通費',           value: '¥12,000',   color: Colors.text },
  { label: '控除（社保等）',    value: '-¥18,200',  color: Colors.red },
];

const MONTHLY = [
  { month: '1月', pct: 62, val: '¥310k' },
  { month: '2月', pct: 55, val: '¥280k' },
  { month: '3月', pct: 70, val: '¥350k' },
  { month: '4月', pct: 78, val: '¥390k' },
  { month: '5月', pct: 84, val: '¥420k' },
];

export default function ResultsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>成績・給与</Text>

        <View style={styles.statGrid}>
          <StatCard label="今月売上" value="¥420k" sub="↑ 前月比 +8%" subColor={Colors.green} valueColor={Colors.gold} />
          <StatCard label="出勤日数" value="14日" sub="今月予定" />
        </View>
        <View style={[styles.statGrid, { marginTop: 8, marginBottom: 16 }]}>
          <StatCard label="ドリンクバック" value="¥32.4k" sub="↑ +3件" subColor={Colors.green} />
          <StatCard label="店内ランキング" value="1位" sub="今月" valueColor={Colors.gold} />
        </View>

        {/* Monthly trend */}
        <SectionCard title="月別売上推移">
          {MONTHLY.map(({ month, pct, val }) => (
            <View key={month} style={styles.barRow}>
              <Text style={styles.barLabel}>{month}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.barVal}>{val}</Text>
            </View>
          ))}
        </SectionCard>

        {/* Salary slip */}
        <SectionCard title="今月の給与明細">
          {SALARY_ITEMS.map(({ label, value, color }) => (
            <View key={label} style={styles.salRow}>
              <Text style={styles.salLabel}>{label}</Text>
              <Text style={[styles.salValue, { color }]}>{value}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>支給予定額</Text>
            <Text style={styles.totalValue}>¥230,200</Text>
          </View>
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bg },
  scroll:      { paddingHorizontal: 16, paddingBottom: 32 },
  screenTitle: { fontSize: 20, fontWeight: '500', color: Colors.text, paddingVertical: 16 },
  statGrid:    { flexDirection: 'row', gap: 8 },
  barRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  barLabel:    { fontSize: 10, color: Colors.text3, width: 28 },
  barTrack:    { flex: 1, height: 6, backgroundColor: Colors.surface2, borderRadius: 3, overflow: 'hidden' },
  barFill:     { height: '100%', backgroundColor: Colors.gold, borderRadius: 3 },
  barVal:      { fontSize: 10, color: Colors.text2, width: 40, textAlign: 'right' },
  salRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  salLabel:    { fontSize: 12, color: Colors.text2 },
  salValue:    { fontSize: 12, fontWeight: '500' },
  divider:     { borderTopWidth: 0.5, borderTopColor: Colors.border, marginVertical: 8 },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel:  { fontSize: 14, fontWeight: '500', color: Colors.text2 },
  totalValue:  { fontSize: 14, fontWeight: '500', color: Colors.gold },
});
