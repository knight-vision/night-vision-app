import { ScrollView, View, Text, StyleSheet, ActivityIndicator, FlatList, Dimensions } from 'react-native';
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

// ── 週間シフト表（横スクロール・洗練デザイン） ──────────────
const DAY_COL_WIDTH = 88;
const DAY_COL_GAP = 6;

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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={wt.scrollContent}
    >
      {weekDates.map((date, idx) => {
        const { dm, w, dow } = shortDate(date);
        const dayShifts = allConfirmed
          .filter((s: any) => s.date === date)
          .sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || ''));
        const isToday = date === todayStr;
        const isSun = dow === 0;
        const isSat = dow === 6;
        const dayColor = isSun ? '#f08098' : isSat ? '#a8c4f0' : Colors.text2;

        return (
          <PunyTouchable key={date} scaleTo={0.96} haptic="light"
            onPress={() => onDayPress?.(date)}
            style={wt.dayCol}>
            {/* ヘッダー */}
            <View style={[wt.dayHeader, isToday && wt.dayHeaderToday]}>
              <Text style={[wt.dayOfWeek, { color: isToday ? Colors.gold : dayColor }]}>{w}</Text>
              <Text style={[wt.dayNum, isToday && { color: Colors.gold }]}>{dm}</Text>
              {isToday && <View style={wt.todayDot} />}
            </View>
            {/* シフトリスト */}
            <View style={[wt.dayBody, isToday && wt.dayBodyToday]}>
              {dayShifts.length === 0 ? (
                <Text style={wt.emptyMark}>—</Text>
              ) : (
                dayShifts.slice(0, 4).map((s: any) => {
                  const ci = casts.findIndex((c: any) => String(c.id) === String(s.cast_id));
                  const color = ci >= 0 ? CAST_COLORS[ci % CAST_COLORS.length] : Colors.gold;
                  const castName = casts.find((c: any) => String(c.id) === String(s.cast_id))?.name || s.casts?.name || '?';
                  const isMe = highlightCastId && String(s.cast_id) === highlightCastId;
                  return (
                    <View key={s.id} style={[
                      wt.shiftChip,
                      { borderColor: color + '80', backgroundColor: color + '18' },
                      isMe && { borderColor: color, borderWidth: 1.5, backgroundColor: color + '28' },
                    ]}>
                      <View style={[wt.chipDot, { backgroundColor: color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[wt.chipName, { color }]} numberOfLines={1}>
                          {castName.slice(0, 4)}
                        </Text>
                        <Text style={wt.chipTime} numberOfLines={1}>
                          {(s.start_time || '').slice(0, 5)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
              {dayShifts.length > 4 && (
                <Text style={wt.moreText}>+{dayShifts.length - 4}人</Text>
              )}
            </View>
          </PunyTouchable>
        );
      })}
    </ScrollView>
  );
}

// ── オーナー版 ────────────────────────────────────────────────
function OwnerHome() {
  const { shopId } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  // 月ごとのシフトキャッシュ: "YYYY-M" => shift[]
  const [shiftCache, setShiftCache] = useState<Record<string, any[]>>({});
  const [casts, setCasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [weekBase, setWeekBase] = useState(now);
  const weekDates = getWeekDates(weekBase);
  const y = weekBase.getFullYear();
  const m = weekBase.getMonth() + 1;
  const cacheKey = `${y}-${m}`;
  const allConfirmed = shiftCache[cacheKey] ?? [];

  // 初回のみ: ダッシュボード・キャスト・当月シフト
  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    const iy = now.getFullYear(), im = now.getMonth() + 1;
    const key = `${iy}-${im}`;
    Promise.all([
      fetch(`${API_BASE}/owner/dashboard-summary?shop_id=${shopId}`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${iy}&month=${im}`).then(r => r.json()).catch(() => ({})),
      fetch(`${API_BASE}/casts?shop_id=${shopId}`).then(r => r.json()).catch(() => []),
    ]).then(([d, sd, cd]) => {
      setData(d);
      const shifts = Array.isArray(sd) ? sd : (sd?.confirmed || []);
      setShiftCache({ [key]: shifts });
      setCasts(Array.isArray(cd) ? cd : []);
    }).finally(() => setLoading(false));
  }, [shopId]);

  // 週移動で月が変わった場合のみ追加フェッチ（ローディングなし）
  useEffect(() => {
    if (!shopId || shiftCache[cacheKey] !== undefined) return;
    fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${y}&month=${m}`)
      .then(r => r.json())
      .then(sd => {
        const shifts = Array.isArray(sd) ? sd : (sd?.confirmed || []);
        setShiftCache(prev => ({ ...prev, [cacheKey]: shifts }));
      }).catch(() => {
        setShiftCache(prev => ({ ...prev, [cacheKey]: [] }));
      });
  }, [shopId, cacheKey]);

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
  // 月ごとのシフトキャッシュ: "YYYY-M" => shift[]
  const [shiftCache, setShiftCache] = useState<Record<string, any[]>>({});
  const [casts, setCasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const weekDates = getWeekDates(weekBase);
  const y = weekBase.getFullYear();
  const m = weekBase.getMonth() + 1;
  const cacheKey = `${y}-${m}`;
  const allConfirmed = shiftCache[cacheKey] ?? [];

  // 初回のみ: キャスト一覧・当月シフト
  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    const iy = now.getFullYear(), im = now.getMonth() + 1;
    const key = `${iy}-${im}`;
    Promise.all([
      fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${iy}&month=${im}`),
      fetch(`${API_BASE}/casts?shop_id=${shopId}`),
    ]).then(async ([r1, r2]) => {
      const d1 = await r1.json();
      const shifts = Array.isArray(d1) ? d1 : (d1?.confirmed || []);
      setShiftCache({ [key]: shifts });
      const d2 = await r2.json();
      setCasts(Array.isArray(d2) ? d2 : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [shopId]);

  // 週移動で月が変わった場合のみ追加フェッチ（ローディングなし）
  useEffect(() => {
    if (!shopId || shiftCache[cacheKey] !== undefined) return;
    fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${y}&month=${m}`)
      .then(r => r.json())
      .then(sd => {
        const shifts = Array.isArray(sd) ? sd : (sd?.confirmed || []);
        setShiftCache(prev => ({ ...prev, [cacheKey]: shifts }));
      }).catch(() => {
        setShiftCache(prev => ({ ...prev, [cacheKey]: [] }));
      });
  }, [shopId, cacheKey]);

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
  weekNav:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 2 },
  weekNavBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.2)' },
  weekNavText:   { fontSize: 12, color: Colors.text2, fontWeight: '600', letterSpacing: 0.3 },
  weekRange:     { fontSize: 13, color: Colors.text, fontWeight: '700', letterSpacing: 0.5 },

  // 横スクロールコンテナ
  scrollContent: { flexDirection: 'row', gap: DAY_COL_GAP, paddingBottom: 4, paddingHorizontal: 2 },

  // 各日カラム
  dayCol:        { width: DAY_COL_WIDTH },

  // 日付ヘッダー
  dayHeader:     { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 10, marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.12)' },
  dayHeaderToday:{ backgroundColor: 'rgba(232,180,200,0.14)', borderColor: 'rgba(232,180,200,0.5)' },
  dayOfWeek:     { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  dayNum:        { fontSize: 16, color: Colors.text, fontWeight: '800', marginTop: 2, letterSpacing: -0.5 },
  todayDot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.gold, marginTop: 4 },

  // シフト表示エリア
  dayBody:       { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 5, gap: 5, minHeight: 80, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.08)', alignItems: 'center' },
  dayBodyToday:  { borderColor: 'rgba(232,180,200,0.2)' },

  emptyMark:     { fontSize: 16, color: 'rgba(255,255,255,0.12)', marginTop: 14, fontWeight: '300' },

  // シフトチップ（横スクロール版・縦長）
  shiftChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, width: '100%', paddingVertical: 5, paddingHorizontal: 6, borderRadius: 8, borderWidth: 0.5 },
  chipDot:       { width: 4, height: 4, borderRadius: 2, flexShrink: 0 },
  chipName:      { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  chipTime:      { fontSize: 9, color: Colors.text3, fontWeight: '500', marginTop: 1 },
  moreText:      { fontSize: 9, color: Colors.text3, fontWeight: '500', marginTop: 2 },
});
