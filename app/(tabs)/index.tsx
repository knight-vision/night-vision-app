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

// 月曜始まりの今週の7日間
function getWeekDates(base: Date): string[] {
  const d = new Date(base);
  const day = d.getDay(); // 0=日
  const offset = day === 0 ? -6 : 1 - day; // 月曜が起点
  d.setDate(d.getDate() + offset);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return getDateStr(x);
  });
}

function shortDate(s: string) {
  const d = new Date(s + 'T00:00:00');
  const w = ['日','月','火','水','木','金','土'][d.getDay()];
  return { dm: `${d.getMonth()+1}/${d.getDate()}`, w, dow: d.getDay() };
}

// ── 週間シフト表（オーナー・キャスト共通） ─────────────────
function WeeklyShiftTable({
  weekDates, allConfirmed, casts, highlightCastId, onDayPress,
}: {
  weekDates: string[];
  allConfirmed: any[];
  casts: any[];
  highlightCastId?: string;
  onDayPress?: (date: string) => void;
}) {
  const todayStr = getDateStr(new Date());
  return (
    <View style={wt.wrap}>
      {weekDates.map(date => {
        const { dm, w, dow } = shortDate(date);
        const dayShifts = allConfirmed
          .filter((s: any) => s.date === date)
          .sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || ''));
        const isToday = date === todayStr;
        return (
          <PunyTouchable key={date} scaleTo={0.98} haptic="light"
            onPress={() => onDayPress?.(date)}>
            <View style={[wt.row, isToday && wt.rowToday]}>
              <View style={wt.dateCol}>
                <Text style={[wt.dayOfWeek, dow === 0 && { color: '#f08098' }, dow === 6 && { color: '#a8c4f0' }, isToday && { color: Colors.gold, fontWeight: '700' }]}>{w}</Text>
                <Text style={[wt.dayNum, isToday && { color: Colors.gold }]}>{dm}</Text>
              </View>
              <View style={wt.shiftsCol}>
                {dayShifts.length === 0 ? (
                  <Text style={wt.emptyText}>—</Text>
                ) : (
                  dayShifts.map((s: any) => {
                    const ci = casts.findIndex((c: any) => String(c.id) === String(s.cast_id));
                    const color = ci >= 0 ? CAST_COLORS[ci % CAST_COLORS.length] : Colors.gold;
                    const castName = casts.find((c: any) => String(c.id) === String(s.cast_id))?.name || s.casts?.name || 'キャスト';
                    const isMe = highlightCastId && String(s.cast_id) === highlightCastId;
                    return (
                      <View key={s.id} style={[wt.shiftChip,
                        { backgroundColor: color + '22', borderColor: color },
                        isMe && { borderWidth: 1.5 },
                      ]}>
                        <View style={[wt.castDot, { backgroundColor: color }]} />
                        <Text style={[wt.castName, { color }]}>
                          {castName}{isMe ? '（自分）' : ''}
                        </Text>
                        <Text style={wt.shiftTime}>
                          {(s.start_time || '').slice(0,5)}〜{(s.end_time || '').slice(0,5)}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          </PunyTouchable>
        );
      })}
    </View>
  );
}

// ── オーナー版 ────────────────────────────────────────────────
function OwnerHome() {
  const { shopId } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [allConfirmed, setAllConfirmed] = useState<any[]>([]);
  const [casts, setCasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [weekBase, setWeekBase] = useState(now);
  const weekDates = getWeekDates(weekBase);

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    const y = weekBase.getFullYear();
    const m = weekBase.getMonth() + 1;
    Promise.all([
      fetch(`${API_BASE}/owner/dashboard-summary?shop_id=${shopId}`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${y}&month=${m}`).then(r => r.json()).catch(() => ({})),
      fetch(`${API_BASE}/casts?shop_id=${shopId}`).then(r => r.json()).catch(() => []),
    ]).then(([d, sd, cd]) => {
      setData(d);
      setAllConfirmed(Array.isArray(sd) ? sd : (sd?.confirmed || []));
      setCasts(Array.isArray(cd) ? cd : []);
    }).finally(() => setLoading(false));
  }, [shopId, weekBase]);

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

      {/* 週間確定シフト */}
      <SectionCard title="🏪 今週の確定シフト" actionLabel="シフト管理 →" onAction={() => router.push('/(tabs)/shift')}>
        <View style={wt.weekNav}>
          <PunyTouchable haptic="light" onPress={() => { const d = new Date(weekBase); d.setDate(d.getDate()-7); setWeekBase(d); }} style={wt.weekNavBtn}>
            <Text style={wt.weekNavText}>‹ 前週</Text>
          </PunyTouchable>
          <Text style={wt.weekRange}>{shortDate(weekDates[0]).dm} 〜 {shortDate(weekDates[6]).dm}</Text>
          <PunyTouchable haptic="light" onPress={() => { const d = new Date(weekBase); d.setDate(d.getDate()+7); setWeekBase(d); }} style={wt.weekNavBtn}>
            <Text style={wt.weekNavText}>次週 ›</Text>
          </PunyTouchable>
        </View>
        <WeeklyShiftTable weekDates={weekDates} allConfirmed={allConfirmed} casts={casts}
          onDayPress={() => router.push('/(tabs)/shift')} />
      </SectionCard>

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
  const { castId, shopId } = useAuthStore();
  const router = useRouter();
  const now = new Date();
  const [weekBase, setWeekBase] = useState(now);
  const [allConfirmed, setAllConfirmed] = useState<any[]>([]);
  const [casts, setCasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const weekDates = getWeekDates(weekBase);
  const y = weekBase.getFullYear();
  const m = weekBase.getMonth() + 1;

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${y}&month=${m}`),
      fetch(`${API_BASE}/casts?shop_id=${shopId}`),
    ]).then(async ([r1, r2]) => {
      const d1 = await r1.json();
      const confirmed = Array.isArray(d1) ? d1 : (d1?.confirmed || []);
      setAllConfirmed(confirmed);
      const d2 = await r2.json();
      setCasts(Array.isArray(d2) ? d2 : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [shopId, y, m]);

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  // 自分の今週シフトのみ
  const myWeekShifts = allConfirmed
    .filter((s: any) => String(s.cast_id) === castId && weekDates.includes(s.date));

  return (
    <>
      {/* 自分の今週シフト（タップで該当日の給与へ） */}
      <SectionCard title="📅 自分の今週シフト" actionLabel="シフト画面 →" onAction={() => router.push('/(tabs)/shift')}>
        <View style={wt.weekNav}>
          <PunyTouchable haptic="light" onPress={() => { const d = new Date(weekBase); d.setDate(d.getDate()-7); setWeekBase(d); }} style={wt.weekNavBtn}>
            <Text style={wt.weekNavText}>‹ 前週</Text>
          </PunyTouchable>
          <Text style={wt.weekRange}>{shortDate(weekDates[0]).dm} 〜 {shortDate(weekDates[6]).dm}</Text>
          <PunyTouchable haptic="light" onPress={() => { const d = new Date(weekBase); d.setDate(d.getDate()+7); setWeekBase(d); }} style={wt.weekNavBtn}>
            <Text style={wt.weekNavText}>次週 ›</Text>
          </PunyTouchable>
        </View>
        <WeeklyShiftTable weekDates={weekDates} allConfirmed={myWeekShifts} casts={casts}
          highlightCastId={castId || undefined}
          onDayPress={(date) => router.push({ pathname: '/(tabs)/results', params: { date } })} />
      </SectionCard>

      {/* 店舗全体の今週シフト */}
      <SectionCard title="🏪 店舗の今週シフト" actionLabel="店舗全体 →" onAction={() => router.push('/(tabs)/shift')}>
        <WeeklyShiftTable weekDates={weekDates} allConfirmed={allConfirmed} casts={casts}
          highlightCastId={castId || undefined}
          onDayPress={() => router.push('/(tabs)/shift')} />
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
});

const wt = StyleSheet.create({
  weekNav:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  weekNavBtn:     { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: Colors.surface2 },
  weekNavText:    { fontSize: 12, color: Colors.text2, fontWeight: '500' },
  weekRange:      { fontSize: 13, color: Colors.text, fontWeight: '600' },

  wrap:           { },
  row:            { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  rowToday:       { backgroundColor: 'rgba(232,180,200,0.06)' },
  dateCol:        { width: 50, alignItems: 'center', paddingTop: 4 },
  dayOfWeek:      { fontSize: 10, color: Colors.text3, fontWeight: '500' },
  dayNum:         { fontSize: 14, color: Colors.text, fontWeight: '700', marginTop: 1 },
  shiftsCol:      { flex: 1, gap: 4, paddingLeft: 4 },
  emptyText:      { fontSize: 12, color: Colors.text3, paddingVertical: 8, paddingLeft: 4 },
  shiftChip:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: 0.5 },
  castDot:        { width: 7, height: 7, borderRadius: 3.5 },
  castName:       { fontSize: 12, fontWeight: '600', flex: 1 },
  shiftTime:      { fontSize: 11, color: Colors.text2, fontWeight: '500' },
});
