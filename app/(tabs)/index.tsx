import { ScrollView, View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Colors, fmtYen } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';
import { StatCard } from '../../components/StatCard';
import { SectionCard } from '../../components/SectionCard';

interface DashboardData {
  monthly_sales: number;
  sales_growth: number | null;
  avg_spend: number;
  today_staff_count: number;
  pending_shift_count: number;
  cast_ranking: { cast_id: number; name: string; total: number }[];
  week_sales: { day: string; total: number }[];
}

export default function HomeScreen() {
  const { role, shopId, castId } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!shopId) return;
    fetch(`${API_BASE}/owner/dashboard-summary?shop_id=${shopId}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shopId]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.screenTitle}>ホーム</Text>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
        ) : data ? (
          <>
            <View style={styles.statGrid}>
              {/* 今月売上 → タップで売上タブへ */}
              <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/(tabs)/slip')}>
                <StatCard label="今月売上" value={fmtYen(data.monthly_sales)}
                  sub={data.sales_growth !== null ? `${data.sales_growth >= 0 ? '↑' : '↓'} 前月比 ${data.sales_growth > 0 ? '+' : ''}${data.sales_growth}%` : ''}
                  subColor={(data.sales_growth ?? 0) >= 0 ? Colors.green : Colors.red}
                  valueColor={Colors.gold} />
              </TouchableOpacity>
              {/* 本日出勤 → タップでシフトタブへ */}
              <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/(tabs)/shift')}>
                <StatCard label="本日出勤" value={`${data.today_staff_count}名`} sub="確定シフト確認 →" subColor={Colors.gold} />
              </TouchableOpacity>
            </View>
            <View style={[styles.statGrid, { marginTop: 8, marginBottom: 16 }]}>
              {/* 承認待ち → タップでシフトタブへ */}
              <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/(tabs)/shift')}>
                <StatCard label="シフト承認待ち" value={`${data.pending_shift_count}件`}
                  sub={data.pending_shift_count > 0 ? '要対応 →' : ''}
                  valueColor={data.pending_shift_count > 0 ? Colors.gold : Colors.text} />
              </TouchableOpacity>
            </View>

            {data.cast_ranking.length > 0 && (
              <SectionCard title="今月キャスト売上ランキング" actionLabel="全員表示"
                onAction={() => router.push('/(tabs)/manage')}>
                {data.cast_ranking.map((c, i) => (
                  <View key={c.cast_id} style={[styles.castRow, i === data.cast_ranking.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={[styles.castAvatar, { backgroundColor: i === 0 ? Colors.goldDim : Colors.purpleDim }]}>
                      <Text style={[styles.castAvatarText, { color: i === 0 ? Colors.gold : Colors.purple }]}>{c.name[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.castName}>{c.name}</Text>
                      <Text style={styles.castRole}>{i === 0 ? 'No.1 キャスト' : 'キャスト'}</Text>
                    </View>
                    <Text style={[styles.castSales, { color: i === 0 ? Colors.gold : Colors.text }]}>{fmtYen(c.total)}</Text>
                  </View>
                ))}
              </SectionCard>
            )}

            <SectionCard title="今週の日別売上">
              {data.week_sales.map(({ day, total }) => {
                const max = Math.max(...data.week_sales.map(s => s.total), 1);
                const pct = max > 0 ? (total / max) * 100 : 0;
                return (
                  <View key={day} style={styles.barRow}>
                    <Text style={styles.barDay}>{day}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%` as any, opacity: total === 0 ? 0.2 : 1 }]} />
                    </View>
                    <Text style={[styles.barVal, total === 0 && { opacity: 0.4 }]}>{total > 0 ? fmtYen(total) : '—'}</Text>
                  </View>
                );
              })}
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
  safe:         { flex: 1, backgroundColor: Colors.bg },
  screenTitle:  { fontSize: 20, fontWeight: '500', color: Colors.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  scroll:       { paddingHorizontal: 16, paddingBottom: 40 },
  statGrid:     { flexDirection: 'row', gap: 10 },
  castRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  castAvatar:   { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  castAvatarText:{ fontSize: 14, fontWeight: '600' },
  castName:     { fontSize: 14, fontWeight: '500', color: Colors.text },
  castRole:     { fontSize: 11, color: Colors.text3, marginTop: 1 },
  castSales:    { fontSize: 14, fontWeight: '600' },
  barRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  barDay:       { width: 24, fontSize: 11, color: Colors.text2, textAlign: 'center' },
  barTrack:     { flex: 1, height: 6, backgroundColor: Colors.surface2, borderRadius: 3, overflow: 'hidden' },
  barFill:      { height: '100%', backgroundColor: Colors.gold, borderRadius: 3 },
  barVal:       { width: 72, fontSize: 11, color: Colors.text2, textAlign: 'right' },
});
