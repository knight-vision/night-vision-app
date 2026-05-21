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
          <TouchableOpacity onPress={onAction}>
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
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 13,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title:  { fontSize: 11, fontWeight: '500', color: Colors.text2 },
  action: { fontSize: 10, color: Colors.purple },
});
