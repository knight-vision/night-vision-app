import { ScrollView, View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { StatCard } from '../../components/StatCard';
import { SectionCard } from '../../components/SectionCard';

const CAST_RANKING = [
  { name: '桜 -Sakura-', role: 'No.1 キャスト', sales: '¥420k', color: Colors.gold, bg: Colors.goldDim },
  { name: '月 -Tsuki-',  role: 'キャスト',      sales: '¥385k', color: Colors.purple, bg: Colors.purpleDim },
  { name: '凛 -Rin-',    role: 'キャスト',      sales: '¥312k', color: Colors.teal,   bg: 'rgba(61,207,184,0.1)' },
];

const BAR_DATA = [
  { day: '月', pct: 55, val: '¥42k' },
  { day: '火', pct: 72, val: '¥58k' },
  { day: '水', pct: 48, val: '¥36k' },
  { day: '木', pct: 85, val: '¥68k' },
  { day: '金', pct: 0,  val: '—' },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image source={require('../../assets/images/icon.png')} style={styles.logoImg} />
            <View>
              <Text style={styles.logoText}>NIGHT VISION</Text>
              <Text style={styles.logoSub}>KUSHIRO</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.notifDot}>
              <Text style={styles.notifNum}>3</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>O</Text>
            </View>
          </View>
        </View>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetName}>おはようございます、田中オーナー</Text>
          <Text style={styles.greetSub}>2025年5月22日（木）　釧路店</Text>
        </View>

        {/* Stats */}
        <View style={styles.statGrid}>
          <StatCard label="今月売上" value="¥2.84M" sub="↑ 前月比 +12%" subColor={Colors.green} valueColor={Colors.gold} />
          <StatCard label="本日出勤" value="8名" sub="定員12名" />
        </View>
        <View style={[styles.statGrid, { marginTop: 8 }]}>
          <StatCard label="客単価" value="¥18.4k" sub="↑ +5.2%" subColor={Colors.green} />
          <StatCard label="シフト承認待ち" value="5件" sub="要対応" valueColor={Colors.gold} />
        </View>

        {/* Ranking */}
        <View style={{ marginTop: 16 }}>
          <SectionCard title="今月キャスト売上ランキング" actionLabel="全員表示">
            {CAST_RANKING.map((c, i) => (
              <View key={c.name} style={[styles.castRow, i === CAST_RANKING.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[styles.castAvatar, { backgroundColor: c.bg }]}>
                  <Text style={[styles.castAvatarText, { color: c.color }]}>{c.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.castName}>{c.name}</Text>
                  <Text style={styles.castRole}>{c.role}</Text>
                </View>
                <Text style={[styles.castSales, { color: i === 0 ? Colors.gold : Colors.text }]}>{c.sales}</Text>
              </View>
            ))}
          </SectionCard>

          {/* Bar chart */}
          <SectionCard title="今週の日別売上">
            {BAR_DATA.map(({ day, pct, val }) => (
              <View key={day} style={styles.barRow}>
                <Text style={styles.barDay}>{day}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%`, opacity: pct === 0 ? 0.3 : 1 }]} />
                </View>
                <Text style={[styles.barVal, pct === 0 && { opacity: 0.4 }]}>{val}</Text>
              </View>
            ))}
          </SectionCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  logoRow:  { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logoImg:  { width: 34, height: 34, borderRadius: 10 },
  logoText: { fontSize: 13, fontWeight: '500', color: Colors.gold, letterSpacing: 1 },
  logoSub:  { fontSize: 9,  color: Colors.text3, letterSpacing: 3, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.purpleDim, borderWidth: 0.5, borderColor: Colors.purple, justifyContent: 'center', alignItems: 'center' },
  notifNum: { fontSize: 9, color: Colors.purple },
  avatar:   { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 11, color: Colors.gold, fontWeight: '500' },
  greeting:  { marginBottom: 16 },
  greetName: { fontSize: 16, fontWeight: '500', color: Colors.text },
  greetSub:  { fontSize: 11, color: Colors.text2, marginTop: 2 },
  statGrid:  { flexDirection: 'row', gap: 8 },
  castRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  castAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  castAvatarText: { fontSize: 12, fontWeight: '500' },
  castName:  { fontSize: 12, fontWeight: '500', color: Colors.text },
  castRole:  { fontSize: 10, color: Colors.text3 },
  castSales: { fontSize: 12, fontWeight: '500' },
  barRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  barDay:    { fontSize: 10, color: Colors.text3, width: 18 },
  barTrack:  { flex: 1, height: 6, backgroundColor: Colors.surface2, borderRadius: 3, overflow: 'hidden' },
  barFill:   { height: '100%', backgroundColor: Colors.gold, borderRadius: 3 },
  barVal:    { fontSize: 10, color: Colors.text2, width: 36, textAlign: 'right' },
});
