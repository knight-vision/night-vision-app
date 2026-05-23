import { ScrollView, View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Colors } from '../../constants/theme';
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
  cast_ranking: { cast_id: string; name: string; total: number }[];
  week_sales: { day: string; date: string; total: number }[];
}

const fmt = (n: number) => n >= 1000000
  ? `¥${(n / 1000000).toFixed(2)}M`
  : n >= 1000 ? `¥${Math.round(n / 1000)}k` : `¥${n}`;

export default function HomeScreen() {
  const { shopId, shopName, name, role } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    fetch(`${API_BASE}/owner/dashboard-summary?shop_id=${shopId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [shopId]);

  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image source={require('../../assets/images/icon.png')} style={styles.logoImg} />
            <View>
              <Text style={styles.logoText}>NIGHT VISION</Text>
              <Text style={styles.logoSub}>KUSHIRO</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {data?.pending_shift_count ? (
              <View style={styles.notifDot}>
                <Text style={styles.notifNum}>{data.pending_shift_count}</Text>
              </View>
            ) : null}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name?.[0] || 'O'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.greeting}>
          <Text style={styles.greetName}>おはようございます、{name}</Text>
          <Text style={styles.greetSub}>{today}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.gold} />
          </View>
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
              <StatCard label="本日出勤" value={`${data.today_staff_count}名`} sub="確定シフト" />
            </View>
            <View style={[styles.statGrid, { marginTop: 8, marginBottom: 16 }]}>
              <StatCard label="客単価" value={fmt(data.avg_spend)} />
              <StatCard
                label="シフト承認待ち"
                value={`${data.pending_shift_count}件`}
                sub={data.pending_shift_count > 0 ? '要対応' : ''}
                valueColor={data.pending_shift_count > 0 ? Colors.gold : Colors.text}
              />
            </View>

            {/* キャスト売上ランキング */}
            {data.cast_ranking.length > 0 && (
              <SectionCard title="今月キャスト売上ランキング" actionLabel="全員表示">
                {data.cast_ranking.map((c, i) => (
                  <View key={c.cast_id} style={[styles.castRow, i === data.cast_ranking.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={[styles.castAvatar, { backgroundColor: i === 0 ? Colors.goldDim : Colors.purpleDim }]}>
                      <Text style={[styles.castAvatarText, { color: i === 0 ? Colors.gold : Colors.purple }]}>
                        {c.name[0]}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.castName}>{c.name}</Text>
                      <Text style={styles.castRole}>{i === 0 ? 'No.1 キャスト' : 'キャスト'}</Text>
                    </View>
                    <Text style={[styles.castSales, { color: i === 0 ? Colors.gold : Colors.text }]}>
                      {fmt(c.total)}
                    </Text>
                  </View>
                ))}
              </SectionCard>
            )}

            {/* 週次売上バーチャート */}
            <SectionCard title="今週の日別売上">
              {data.week_sales.map(({ day, total }) => {
                const max = Math.max(...data.week_sales.map(s => s.total), 1);
                const pct = max > 0 ? (total / max) * 100 : 0;
                return (
                  <View key={day} style={styles.barRow}>
                    <Text style={styles.barDay}>{day}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%`, opacity: total === 0 ? 0.2 : 1 }]} />
                    </View>
                    <Text style={[styles.barVal, total === 0 && { opacity: 0.4 }]}>
                      {total > 0 ? fmt(total) : '—'}
                    </Text>
                  </View>
                );
              })}
            </SectionCard>
          </>
        ) : (
          <View style={styles.loadingWrap}>
            <Text style={{ color: Colors.text2 }}>データを取得できませんでした</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: Colors.bg },
  scroll:         { paddingHorizontal: 16, paddingBottom: 32 },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  logoRow:        { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logoImg:        { width: 34, height: 34, borderRadius: 10 },
  logoText:       { fontSize: 13, fontWeight: '500', color: Colors.gold, letterSpacing: 1 },
  logoSub:        { fontSize: 9, color: Colors.text3, letterSpacing: 3, marginTop: 1 },
  headerRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifDot:       { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.purpleDim, borderWidth: 0.5, borderColor: Colors.purple, justifyContent: 'center', alignItems: 'center' },
  notifNum:       { fontSize: 9, color: Colors.purple },
  avatar:         { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, justifyContent: 'center', alignItems: 'center' },
  avatarText:     { fontSize: 11, color: Colors.gold, fontWeight: '500' },
  greeting:       { marginBottom: 16 },
  greetName:      { fontSize: 16, fontWeight: '500', color: Colors.text },
  greetSub:       { fontSize: 11, color: Colors.text2, marginTop: 2 },
  statGrid:       { flexDirection: 'row', gap: 8 },
  loadingWrap:    { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  castRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  castAvatar:     { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  castAvatarText: { fontSize: 12, fontWeight: '500' },
  castName:       { fontSize: 12, fontWeight: '500', color: Colors.text },
  castRole:       { fontSize: 10, color: Colors.text3 },
  castSales:      { fontSize: 12, fontWeight: '500' },
  barRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  barDay:         { fontSize: 10, color: Colors.text3, width: 18 },
  barTrack:       { flex: 1, height: 6, backgroundColor: Colors.surface2, borderRadius: 3, overflow: 'hidden' },
  barFill:        { height: '100%', backgroundColor: Colors.gold, borderRadius: 3 },
  barVal:         { fontSize: 10, color: Colors.text2, width: 40, textAlign: 'right' },
});
