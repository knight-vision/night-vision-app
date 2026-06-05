import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useColors } from '../constants/theme';
import { GlassView } from 'expo-glass-effect';

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
};

export function SectionCard({ title, actionLabel, onAction, children }: Props) {
  const Colors = useColors();

  const header = (
    <View style={styles.header}>
      <Text style={[styles.title, { color: Colors.text2 }]}>{title}</Text>
      {actionLabel && (
        <TouchableOpacity onPress={onAction} style={[styles.actionBtn, { backgroundColor: Colors.purpleDim }]}>
          <Text style={[styles.action, { color: Colors.purple }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // iOS 26以上: GlassView / それ以外: 従来のグラスモーフィズム
  if (Platform.OS === 'ios') {
    return (
      <GlassView
        style={[styles.card, { borderColor: Colors.border }]}
        glassEffectStyle={{
          style: 'regular',
          tintColor: Colors.purple + '15',
          animate: true,
        }}
      >
        {header}
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
      {header}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title:     { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  actionBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  action:    { fontSize: 11, fontWeight: '600' },
});
