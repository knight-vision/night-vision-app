import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Colors } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';
import { StatCard } from '../../components/StatCard';
import { SectionCard } from '../../components/SectionCard';

const fmt = (n: number) => n >= 1000000
  ? `¥${(n / 1000000).toFixed(2)}M`
  : n >= 1000 ? `¥${Math.round(n / 1000)}k` : `¥${n.toLocaleString()}`;

export default function ResultsScreen() {
  const { castId, shopId } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!castId || !shopId) return;
    fetch(`${API_BASE}/cast/performance-summary?cast_id=${castId}&shop_id=${shopId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [castId, shopId]);

  const maxSales = data ? Math.max(...data.monthly_sales_trend.map((m: any) => m.total), 1) : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>成績・給与</Text>

        {loading ? (
          <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
        ) : data ? (
          <>
            <View style={styles.statGrid}>
              <StatCard
                label="今月売上"
                value={fmt(data.monthly_sales)}
                sub={data.sales_growth !== null ? `${data.sales_growth >= 0 ? '↑' : '↓'} 前月比 ${data.sales_growth > 0 ? '+' : ''}${data.sales_growth}%` : ''}
                subColor={data.sales_growth !== null && data.sales_growth >= 0 ? Colors.green : Colors.red}
                valueColor={Colors.gold}
              />
              <StatCard label="出勤日数" value={`${data.shift_count}日`} sub="今月確定" />
            </View>
            <View style={[styles.statGrid, { marginTop: 8, marginBottom: 16 }]}>
              <StatCard label="ドリンクバック" value={fmt(data.drink_back)} />
              <StatCard
                label="店内ランキング"
                value={data.shop_rank ? `${data.shop_rank}位` : '-'}
                sub="今月"
                valueColor={data.shop_rank === 1 ? Colors.gold : Colors.text}
              />
            </View>

            {/* 月別売上推移 */}
            <SectionCard title="月別売上推移">
              {data.monthly_sales_trend.map(({ month, total }: any) => (
                <View key={month} style={styles.barRow}>
                  <Text style={styles.barLabel}>{month}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(total / maxSales) * 100}%` }]} />
                  </View>
                  <Text style={styles.barVal}>{fmt(total)}</Text>
                </View>
              ))}
            </SectionCard>

            {/* 給与明細 */}
            <SectionCard title="今月の給与明細">
              <View style={styles.salRow}>
                <Text style={styles.salLabel}>基本給</Text>
                <Text style={styles.salValue}>¥{data.salary.basic_pay.toLocaleString()}</Text>
              </View>
              <View style={styles.salRow}>
                <Text style={styles.salLabel}>売上インセンティブ</Text>
                <Text style={[styles.salValue, { color: Colors.gold }]}>¥{data.salary.incentive.toLocaleString()}</Text>
              </View>
              {data.salary.drink_back > 0 && (
                <View style={styles.salRow}>
                  <Text style={styles.salLabel}>ドリンクバック</Text>
                  <Text style={styles.salValue}>¥{data.salary.drink_back.toLocaleString()}</Text>
                </View>
              )}
              {data.salary.allowances.map((a: any, i: number) => (
                <View key={i} style={styles.salRow}>
                  <Text style={styles.salLabel}>{a.label}</Text>
                  <Text style={styles.salValue}>¥{a.amount.toLocaleString()}</Text>
                </View>
              ))}
              {data.salary.deductions.map((a: any, i: number) => (
                <View key={i} style={styles.salRow}>
                  <Text style={styles.salLabel}>{a.label}</Text>
                  <Text style={[styles.salValue, { color: Colors.red }]}>-¥{Math.abs(a.amount).toLocaleString()}</Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>支給予定額</Text>
                <Text style={styles.totalValue}>¥{data.salary.total.toLocaleString()}</Text>
              </View>
            </SectionCard>
          </>
        ) : (
          <Text style={{ color: Colors.text2, textAlign: 'center', marginTop: 40 }}>データを取得できませんでした</Text>
        )}
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
  barVal:      { fontSize: 10, color: Colors.text2, width: 44, textAlign: 'right' },
  salRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  salLabel:    { fontSize: 12, color: Colors.text2 },
  salValue:    { fontSize: 12, fontWeight: '500', color: Colors.text },
  divider:     { borderTopWidth: 0.5, borderTopColor: Colors.border, marginVertical: 8 },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel:  { fontSize: 14, fontWeight: '500', color: Colors.text2 },
  totalValue:  { fontSize: 14, fontWeight: '500', color: Colors.gold },
});
