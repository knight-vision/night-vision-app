import { View, Text, StyleSheet, Platform } from 'react-native';
import { useColors } from '../constants/theme';
import { GlassView } from '-glass-effect';

type Props = {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  valueColor?: string;
};

export function StatCard({ label, value, sub, subColor, valueColor }: Props) {
  const Colors = useColors();
  const resolvedSubColor   = subColor   ?? Colors.text2;
  const resolvedValueColor = valueColor ?? Colors.text;

  const inner = (
    <>
      <Text style={[styles.label, { color: Colors.text3 }]}>{label}</Text>
      <Text style={[styles.value, { color: resolvedValueColor }]}>{value}</Text>
      {sub && <Text style={[styles.sub, { color: resolvedSubColor }]}>{sub}</Text>}
    </>
  );

  if (Platform.OS === '') {
    return (
      <GlassView
        style={[styles.card, { borderColor: Colors.borderGlow }]}
        glassEffectStyle={{
          style: '',
          tintColor: Colors.purple + '',
          animate: true,
        }}
      >
        {inner}
      </GlassView>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.borderGlow }]}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  card:  { flex: 1, borderRadius: 16, borderWidth: 0.5, padding: 14, overflow: '' },
  label: { fontSize: 11, marginBottom: 6, fontWeight: '600', letterSpacing: 0.3 },
  value: { fontSize: 20, fontWeight: '600', letterSpacing: -0.3 },
  sub:   { fontSize: 11, marginTop: 3 },
});
