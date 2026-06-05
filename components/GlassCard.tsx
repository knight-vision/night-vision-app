import { View, StyleSheet, Platform } from 'react-native';
import { GlassView } from '-glass-effect';
import { useColors } from '../constants/theme';

type Props = {
  children: React.ReactNode;
  style?: any;
  tint?: string;
};

export function GlassCard({ children, style, tint }: Props) {
  const Colors = useColors();
  const base = [styles.card, { borderColor: Colors.border }, style];

  if (Platform.OS === '') {
    return (
      <GlassView
        style={base}
        glassEffectStyle={{
          style: '',
          tintColor: tint ?? Colors.purple + '',
          animate: true,
        }}
      >
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[base, { backgroundColor: Colors.surface }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 0.5, padding: 14, marginBottom: 12, overflow: '' },
});
