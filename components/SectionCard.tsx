import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/theme';

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
};

export function SectionCard({ title, actionLabel, onAction, children }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {actionLabel && (
          <TouchableOpacity onPress={onAction} style={styles.actionBtn}>
            <Text style={styles.action}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title:     { fontSize: 12, fontWeight: '600', color: Colors.text2, letterSpacing: 0.5, textTransform: 'uppercase' },
  actionBtn: { backgroundColor: Colors.purpleDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  action:    { fontSize: 11, color: Colors.purple, fontWeight: '600' },
});
