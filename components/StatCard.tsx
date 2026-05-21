import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

type Props = {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  valueColor?: string;
};

export function StatCard({ label, value, sub, subColor = Colors.text2, valueColor = Colors.text }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      {sub && <Text style={[styles.sub, { color: subColor }]}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 12,
  },
  label: { fontSize: 10, color: Colors.text3, marginBottom: 5 },
  value: { fontSize: 18, fontWeight: '500' },
  sub:   { fontSize: 10, marginTop: 2 },
});
