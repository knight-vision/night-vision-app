import { ScrollView, View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { PunyTouchable } from '../../components/PunyTouchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Colors, fmtYen } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';
import { StatCard } from '../../components/StatCard';
import { SectionCard } from '../../components/SectionCard';
import { MonthCalendar } from '../../components/MonthCalendar';

interface DashboardData {
  monthly_sales: number;
  sales_growth: number | null;
  avg_spend: number;
  today_staff_count: number;
  pending_shift_count: number;
  cast_ranking: { cast_id: number; name: string; total: number }[];
  week_sales: { day: string; total: number }[];
}

const CAST_COLORS = ['#ff6b9d','#00d4ff','#ffd700','#a855f7','#00e5a0','#ff9500','#00c7be','#ff3b30','#34aadc','#4cd964'];

function getDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtFull(s: string) {
  const d = new Date(s + 'T00:00:00');
  const w = ['日','月','火','水','木','金','土'][d.getDay()];
  return `${d.getMonth()+1}月${d.getDate()}日(${w})`;
}

// ── オーナー版 ────────────────────────────────────────────────
function OwnerHome() {
  const { shopId } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    fetch(`${API_BASE}/owner/dashboard-summary?shop_id=${shopId}`)
      .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [shopId]);

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;
  if (!data) return <Text style={{ color: Colors.text2, textAlign: 'center', marginTop: 40 }}>データを取得できませんでした</Text>;

  return (
    <>
      <View style={styles.statGrid}>
        <PunyTouchable style={{ flex: 1 }} scaleTo={0.96} haptic="light" onPress={() => router.push('/(tabs)/slip')}>
          <StatCard label="今月売上" value={fmtYen(data.monthly_sales)}
            sub={data.sales_growth !== null ? `${data.sales_growth >= 0 ? '↑' : '↓'} 前月比 ${data.sales_growth > 0 ? '+' : ''}${data.sales_growth}%` : ''}
            subColor={(data.sales_growth ?? 0) >= 0 ? Colors.green : Colors.red}
            valueColor={Colors.gold} />
        </PunyTouchable>
        <PunyTouchable style={{ flex: 1 }} scaleTo={0.96} haptic="light" onPress={() => router.push('/(tabs)/shift')}>
          <StatCard label="本日出勤" value={`${data.today_staff_count}名`} sub="確定シフト確認 →" subColor={Colors.gold} />
        </PunyTouchable>
      </View>
      <View style={[styles.statGrid, { marginTop: 8, marginBottom: 16 }]}>
        <PunyTouchable style={{ flex: 1 }} scaleTo={0.96} haptic="light" onPress={() => router.push('/(tabs)/shift')}>
          <StatCard label="シフト承認待ち" value={`${data.pending_shift_count}件`}
            sub={data.pending_shift_count > 0 ? '要対応 →' : ''}
            valueColor={data.pending_shift_count > 0 ? Colors.gold : Colors.text} />
        </PunyTouchable>
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
  );
}

// ── キャスト版 ────────────────────────────────────────────────
function CastHome() {
  const { castId, shopId, name } = useAuthStore();
  const router = useRouter();
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());  // 0-indexed
  const [allConfirmed, setAllConfirmed] = useState<any[]>([]);
  const [casts, setCasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${calYear}&month=${calMonth+1}`),
      fetch(`${API_BASE}/casts?shop_id=${shopId}`),
    ]).then(async ([r1, r2]) => {
      const d1 = await r1.json();
      const confirmed = Array.isArray(d1) ? d1 : (d1?.confirmed || []);
      setAllConfirmed(confirmed);
      const d2 = await r2.json();
      setCasts(Array.isArray(d2) ? d2 : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [shopId, calYear, calMonth]);

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  const myShifts = allConfirmed.filter((s: any) => String(s.cast_id) === castId)
    .sort((a: any, b: any) => a.date.localeCompare(b.date));
  const upcomingMyShifts = myShifts.filter((s: any) => s.date >= getDateStr(now)).slice(0, 5);

  // キャスト別カラーのイベント
  const calendarEvents = allConfirmed.map((s: any) => {
    const ci = casts.findIndex((c: any) => String(c.id) === String(s.cast_id));
    return { date: s.date, color: ci >= 0 ? CAST_COLORS[ci % CAST_COLORS.length] : Colors.gold };
  });

  return (
    <>
      {/* 自分の次の出勤 */}
      <SectionCard title="📅 自分の確定シフト" actionLabel="シフト画面 →" onAction={() => router.push('/(tabs)/shift')}>
        {upcomingMyShifts.length === 0 ? (
          <Text style={styles.empty}>確定済みのシフトはありません</Text>
        ) : upcomingMyShifts.map((s: any) => (
          <PunyTouchable key={s.id} scaleTo={0.97} haptic="light"
            onPress={() => router.push('/(tabs)/results')}>
            <View style={styles.myShiftRow}>
              <View style={styles.myShiftDate}>
                <Text style={styles.myShiftDateText}>{fmtFull(s.date)}</Text>
              </View>
              <Text style={styles.myShiftTime}>{(s.start_time || '').slice(0,5)} 〜 {(s.end_time || '').slice(0,5)}</Text>
              <Text style={styles.myShiftArrow}>›</Text>
            </View>
          </PunyTouchable>
        ))}
      </SectionCard>

      {/* 店舗全体カレンダー */}
      <SectionCard title="🏪 店舗の確定シフト" actionLabel="店舗全体 →" onAction={() => router.push('/(tabs)/shift')}>
        <MonthCalendar
          events={calendarEvents}
          year={calYear}
          month={calMonth}
          onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
          onDayPress={() => router.push('/(tabs)/shift')}
          maxDots={4}
        />
      </SectionCard>
    </>
  );
}

// ── メイン ────────────────────────────────────────────────────
export default function HomeScreen() {
  const { role } = useAuthStore();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.screenTitle}>ホーム</Text>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {role === 'owner' ? <OwnerHome /> : <CastHome />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: Colors.bg },
  screenTitle:    { fontSize: 20, fontWeight: '500', color: Colors.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  scroll:         { paddingHorizontal: 16, paddingBottom: 40 },
  statGrid:       { flexDirection: 'row', gap: 10 },
  castRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  castAvatar:     { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  castAvatarText: { fontSize: 14, fontWeight: '600' },
  castName:       { fontSize: 14, fontWeight: '500', color: Colors.text },
  castRole:       { fontSize: 11, color: Colors.text3, marginTop: 1 },
  castSales:      { fontSize: 14, fontWeight: '600' },
  barRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  barDay:         { width: 24, fontSize: 11, color: Colors.text2, textAlign: 'center' },
  barTrack:       { flex: 1, height: 6, backgroundColor: Colors.surface2, borderRadius: 3, overflow: 'hidden' },
  barFill:        { height: '100%', backgroundColor: Colors.gold, borderRadius: 3 },
  barVal:         { width: 72, fontSize: 11, color: Colors.text2, textAlign: 'right' },

  // キャスト用
  empty:          { fontSize: 12, color: Colors.text3, textAlign: 'center', paddingVertical: 14 },
  myShiftRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  myShiftDate:    { flex: 1.4 },
  myShiftDateText:{ fontSize: 13, color: Colors.text, fontWeight: '600' },
  myShiftTime:    { flex: 1, fontSize: 13, color: Colors.gold, fontWeight: '600', textAlign: 'right' },
  myShiftArrow:   { fontSize: 18, color: Colors.text3, marginLeft: 4 },
});
