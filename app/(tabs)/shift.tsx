import { ScrollView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Colors } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';
import { SectionCard } from '../../components/SectionCard';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: '審査中',   color: Colors.gold,   bg: 'rgba(201,168,76,0.1)',  border: 'rgba(201,168,76,0.3)' },
  approved: { label: '承認済み', color: Colors.green,  bg: 'rgba(78,203,138,0.1)',  border: 'rgba(78,203,138,0.3)' },
  rejected: { label: '否認',     color: Colors.red,    bg: 'rgba(224,92,106,0.1)',  border: 'rgba(224,92,106,0.3)' },
};

const CAL_DAYS = ['月','火','水','木','金','土','日'];

export default function ShiftScreen() {
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

  // カレンダー生成
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay + 6) % 7; // 月曜始まり
  const calCells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);

  const confirmedDates = new Set(
    (data?.confirmed_shifts || []).map((s: any) => new Date(s.date).getDate())
  );
  const today = now.getDate();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>シフト</Text>

        {loading ? (
          <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* カレンダー */}
            <SectionCard title={`${year}年${month + 1}月`}>
              <View style={styles.calHeader}>
                {CAL_DAYS.map(d => <Text key={d} style={styles.calDayLabel}>{d}</Text>)}
              </View>
              <View style={styles.calGrid}>
                {calCells.map((day, i) => {
                  const isShift = day && confirmedDates.has(day);
                  const isToday = day === today;
                  return (
                    <View key={i} style={[
                      styles.calCell,
                      isShift && styles.calShift,
                      isToday && styles.calToday,
                      !day && { backgroundColor: 'transparent' },
                    ]}>
                      <Text style={[
                        styles.calNum,
                        isShift && { color: Colors.gold },
                        isToday && { color: Colors.purple },
                        !day && { color: 'transparent' },
                      ]}>{day ?? 0}</Text>
                    </View>
                  );
                })}
              </View>
            </SectionCard>

            {/* シフト希望一覧 */}
            <SectionCard title="シフト希望" actionLabel="＋ 追加">
              {(data?.shift_requests || []).length === 0 ? (
                <Text style={{ color: Colors.text3, fontSize: 12, paddingVertical: 8 }}>シフト希望はありません</Text>
              ) : (
                (data?.shift_requests || []).map((s: any, i: number) => {
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
                })
              )}
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
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bg },
  scroll:      { paddingHorizontal: 16, paddingBottom: 32 },
  screenTitle: { fontSize: 20, fontWeight: '500', color: Colors.text, paddingVertical: 16 },
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
