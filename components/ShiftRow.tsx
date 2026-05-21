import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

type Status = 'approved' | 'pending' | 'off';

type Props = {
  name: string;
  time: string;
  status: Status;
};

const STATUS_MAP: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  approved: { label: '承認済み', color: Colors.green,  bg: 'rgba(78,203,138,0.1)',  border: 'rgba(78,203,138,0.3)' },
  pending:  { label: '承認待ち', color: Colors.gold,   bg: 'rgba(201,168,76,0.1)',  border: 'rgba(201,168,76,0.3)' },
  off:      { label: '休み',     color: Colors.text3,  bg: 'rgba(90,88,104,0.2)',   border: Colors.border },
};

export function ShiftRow({ name, time, status }: Props) {
  const s = STATUS_MAP[status];
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }]}>
        <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  name:      { fontSize: 12, fontWeight: '500', color: Colors.text },
  time:      { fontSize: 10, color: Colors.text2, marginTop: 2 },
  badge:     { borderRadius: 10, borderWidth: 0.5, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10 },
});
