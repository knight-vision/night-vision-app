import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '../constants/theme';
import { useThemeStore } from '../store/theme';

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
};

export function SectionCard({ title, actionLabel, onAction, children }: Props) {
  const Colors = useColors();
  const { themeId } = useThemeStore();

  // ネオンテーマ: カード上部にアクセントライン
  const neonLine = themeId === 'neon' ? (
    <View style={{
      height: 1.5,
      marginHorizontal: -16,
      marginTop: -16,
      marginBottom: 14,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      overflow: 'hidden',
      backgroundColor: Colors.gold,
      opacity: 0.6,
    }} />
  ) : null;

  // 星空テーマ: カードのボーダーをほんのりグロー
  const cardStyle = [
    styles.card,
    {
      backgroundColor: Colors.surface,
      borderColor: Colors.border,
    },
    themeId === 'starry' && {
      shadowColor: Colors.purple,
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 },
    },
  ];

  return (
    <View style={cardStyle}>
      {neonLine}
      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors.text2 }]}>{title}</Text>
        {actionLabel && (
          <TouchableOpacity onPress={onAction} style={[styles.actionBtn, { backgroundColor: Colors.purpleDim }]}>
            <Text style={[styles.action, { color: Colors.purple }]}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
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
