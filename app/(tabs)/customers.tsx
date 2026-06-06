import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth';
import { useColors } from '../../constants/theme';
import { CustomerSection } from './manage';

export default function CustomersScreen() {
  const Colors = useColors();
  const { castId, shopId } = useAuthStore();

  if (!castId || !shopId) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg }]} edges={['top']}>
        <Text style={[styles.title, { color: Colors.text }]}>顧客管理</Text>
        <Text style={{ color: Colors.text3, textAlign: 'center', marginTop: 40 }}>ログイン情報を取得できませんでした</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} style={{ backgroundColor: 'transparent' }}>
        <Text style={[styles.title, { color: Colors.text }]}>顧客管理</Text>
        <CustomerSection shopId={shopId} castId={castId} hideAddCastFilter />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 108 },
  title:  { fontSize: 20, fontWeight: '500', paddingVertical: 16 },
});
