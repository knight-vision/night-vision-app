import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { SectionCard } from '../../components/SectionCard';
import { ShiftRow } from '../../components/ShiftRow';

const MY_SHIFTS = [
  { name: '5/24（土）', time: '20:00〜翌3:00', status: 'pending'  as const },
  { name: '5/26（月）', time: '休日希望',        status: 'approved' as const },
  { name: '5/28（水）', time: '19:00〜翌2:00', status: 'approved' as const },
];

const CAL_DAYS = ['月','火','水','木','金','土','日'];
const CAL_CELLS = [
  null, 1, 2, 3, 4, 5, 6,
  7, 8, 9, 10, 11, 12, 13,
  14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27,
];
const SHIFT_DAYS = new Set([1, 3, 7, 9, 12, 15, 17, 21, 24]);
const TODAY = 22;

export default function ShiftScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>シフト</Text>

        {/* Calendar */}
        <SectionCard title="今月のシフトカレンダー">
          <View style={styles.calHeader}>
            {CAL_DAYS.map(d => <Text key={d} style={styles.calDayLabel}>{d}</Text>)}
          </View>
          <View style={styles.calGrid}>
            {CAL_CELLS.map((day, i) => {
              const isShift = day && SHIFT_DAYS.has(day);
              const isToday = day === TODAY;
              return (
                <View
                  key={i}
                  style={[
                    styles.calCell,
                    isShift && styles.calShift,
                    isToday && styles.calToday,
                    !day && { backgroundColor: 'transparent' },
                  ]}
                >
                  <Text style={[
                    styles.calNum,
                    isShift && { color: Colors.gold },
                    isToday && { color: Colors.purple },
                    !day && { color: 'transparent' },
                  ]}>
                    {day ?? 0}
                  </Text>
                </View>
              );
            })}
          </View>
        </SectionCard>

        {/* My Shifts */}
        <SectionCard title="シフト希望" actionLabel="＋ 追加">
          {MY_SHIFTS.map((s, i) => (
            <View key={i} style={i === MY_SHIFTS.length - 1 ? { borderBottomWidth: 0 } : {}}>
              <ShiftRow name={s.name} time={s.time} status={s.status} />
            </View>
          ))}
        </SectionCard>

        {/* Legend */}
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
  legend:      { flexDirection: 'row', gap: 16, paddingHorizontal: 4 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 10, height: 10, borderRadius: 2, borderWidth: 0.5 },
  legendText:  { fontSize: 11, color: Colors.text3 },
});
