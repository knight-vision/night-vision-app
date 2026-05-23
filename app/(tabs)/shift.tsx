import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Colors } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';
import { SectionCard } from '../../components/SectionCard';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: '審査中',   color: Colors.gold,  bg: 'rgba(201,168,76,0.1)',  border: 'rgba(201,168,76,0.3)' },
  approved: { label: '承認済み', color: Colors.green, bg: 'rgba(78,203,138,0.1)',  border: 'rgba(78,203,138,0.3)' },
  rejected: { label: '否認',     color: Colors.red,   bg: 'rgba(224,92,106,0.1)',  border: 'rgba(224,92,106,0.3)' },
};

const CAL_DAYS = ['月','火','水','木','金','土','日'];

// オーナー向け：シフト承認待ち一覧
function OwnerShiftView({ shopId }: { shopId: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [confirmed, setConfirmed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/shift-request?shop_id=${shopId}`).then(r => r.json()),
      fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${year}&month=${month}`).then(r => r.json()),
    ]).then(([req, conf]) => {
      setRequests(Array.isArray(req) ? req : []);
      setConfirmed(Array.isArray(conf) ? conf : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [shopId]);

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  const pending = requests.filter(r => r.status === 'pending');

  return (
    <>
      <SectionCard title={`シフト承認待ち（${pending.length}件）`} actionLabel="一括承認">
        {pending.length === 0 ? (
          <Text style={styles.emptyText}>承認待ちのシフトはありません</Text>
        ) : pending.map((r: any, i: number) => (
          <View key={i} style={[styles.shiftRow, i === pending.length - 1 && { borderBottomWidth: 0 }]}>
            <View>
              <Text style={styles.shiftDay}>{r.cast_name || 'キャスト'}</Text>
              <Text style={styles.shiftTime}>{r.date} {r.start_time}〜{r.end_time}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: 'rgba(201,168,76,0.1)', borderColor: 'rgba(201,168,76,0.3)' }]}>
              <Text style={[styles.badgeText, { color: Colors.gold }]}>承認待ち</Text>
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard title={`今月の確定シフト（${confirmed.length}件）`}>
        {confirmed.length === 0 ? (
          <Text style={styles.emptyText}>確定シフトはありません</Text>
        ) : confirmed.slice(0, 5).map((c: any, i: number) => (
          <View key={i} style={[styles.shiftRow, i === Math.min(confirmed.length, 5) - 1 && { borderBottomWidth: 0 }]}>
            <View>
              <Text style={styles.shiftDay}>{c.cast_name || 'キャスト'}</Text>
              <Text style={styles.shiftTime}>{c.date} {c.start_time}〜{c.end_time}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: 'rgba(78,203,138,0.1)', borderColor: 'rgba(78,203,138,0.3)' }]}>
              <Text style={[styles.badgeText, { color: Colors.green }]}>確定</Text>
            </View>
          </View>
        ))}
      </SectionCard>
    </>
  );
}

// キャスト向け：カレンダー＋希望一覧
function CastShiftView({ castId, shopId }: { castId: string; shopId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/cast/performance-summary?cast_id=${castId}&shop_id=${shopId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [castId, shopId]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay + 6) % 7;
  const calCells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);
  const confirmedDates = new Set((data?.confirmed_shifts || []).map((s: any) => new Date(s.date).getDate()));
  const today = now.getDate();

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  return (
    <>
      <SectionCard title={`${year}年${month + 1}月`}>
        <View style={styles.calHeader}>
          {CAL_DAYS.map(d => <Text key={d} style={styles.calDayLabel}>{d}</Text>)}
        </View>
        <View style={styles.calGrid}>
          {calCells.map((day, i) => (
            <View key={i} style={[
              styles.calCell,
              day && confirmedDates.has(day) && styles.calShift,
              day === today && styles.calToday,
              !day && { backgroundColor: 'transparent' },
            ]}>
              <Text style={[
                styles.calNum,
                day && confirmedDates.has(day) && { color: Colors.gold },
                day === today && { color: Colors.purple },
                !day && { color: 'transparent' },
              ]}>{day ?? 0}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="シフト希望" actionLabel="＋ 追加">
        {(data?.shift_requests || []).length === 0 ? (
          <Text style={styles.emptyText}>シフト希望はありません</Text>
        ) : (data.shift_requests || []).map((s: any, i: number) => {
          const st = STATUS_MAP[s.status] || STATUS_MAP.pending;
          return (
            <View key={i} style={[styles.shiftRow, i === data.shift_requests.length - 1 && { borderBottomWidth: 0 }]}>
              <View>
                <Text style={styles.shiftDay}>{s.date}</Text>
                <Text style={styles.shiftTime}>
                  {s.start_time && s.end_time ? `${s.start_time}〜${s.end_time}` : s.note || '休日希望'}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: st.bg, borderColor: st.border }]}>
                <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>
          );
        })}
      </SectionCard>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.goldDim, borderColor: 'rgba(201,168,76,0.3)' }]} />
          <Text style={styles.legendText}>出勤日</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.purpleDim, borderColor: 'rgba(155,127,232,0.4)' }]} />
          <Text style={styles.legendText}>今日</Text>
        </View>
      </View>
    </>
  );
}

export default function ShiftScreen() {
  const { role, shopId, castId } = useAuthStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>シフト</Text>
        {role === 'owner' && shopId
          ? <OwnerShiftView shopId={shopId} />
          : role === 'cast' && castId && shopId
          ? <CastShiftView castId={castId} shopId={shopId} />
          : <Text style={styles.emptyText}>データを取得できませんでした</Text>
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bg },
  scroll:      { paddingHorizontal: 16, paddingBottom: 32 },
  screenTitle: { fontSize: 20, fontWeight: '500', color: Colors.text, paddingVertical: 16 },
  emptyText:   { color: Colors.text3, fontSize: 12, paddingVertical: 8 },
  calHeader:   { flexDirection: 'row', marginBottom: 6 },
  calDayLabel: { flex: 1, textAlign: 'center', fontSize: 9, color: Colors.text3 },
  calGrid:     { flexDirection: 'row', flexWrap: 'wrap' },
  calCell:     { width: '14.28%', aspectRatio: 1, borderRadius: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface2, marginBottom: 3 },
  calShift:    { backgroundColor: Colors.goldDim, borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.3)' },
  calToday:    { backgroundColor: Colors.purpleDim, borderWidth: 0.5, borderColor: 'rgba(155,127,232,0.4)' },
  calNum:      { fontSize: 10, color: Colors.text3 },
  shiftRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  shiftDay:    { fontSize: 12, fontWeight: '500', color: Colors.text },
  shiftTime:   { fontSize: 10, color: Colors.text2, marginTop: 2 },
  badge:       { borderRadius: 10, borderWidth: 0.5, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:   { fontSize: 10 },
  legend:      { flexDirection: 'row', gap: 16, paddingHorizontal: 4 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 10, height: 10, borderRadius: 2, borderWidth: 0.5 },
  legendText:  { fontSize: 11, color: Colors.text3 },
});
