import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../constants/theme';

type MenuItem = { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; sub: string };

const MENU_ITEMS: MenuItem[][] = [
  [
    { icon: 'person-outline',       label: 'プロフィール編集',    sub: '名前・連絡先の変更' },
    { icon: 'lock-closed-outline',  label: 'パスワード変更',      sub: 'セキュリティ設定' },
  ],
  [
    { icon: 'notifications-outline', label: '通知設定',           sub: 'プッシュ通知の管理' },
    { icon: 'moon-outline',          label: 'ダークモード',        sub: '常にダーク' },
  ],
  [
    { icon: 'help-circle-outline',  label: 'ヘルプ・お問い合わせ', sub: 'サポートへ連絡' },
    { icon: 'information-circle-outline', label: 'アプリバージョン', sub: 'v1.0.0' },
  ],
];

export default function AccountScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>アカウント</Text>

        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>桜</Text>
          </View>
          <View>
            <Text style={styles.profileName}>桜 -Sakura-</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>キャスト</Text>
            </View>
          </View>
        </View>

        {/* Menu groups */}
        {MENU_ITEMS.map((group, gi) => (
          <View key={gi} style={styles.menuGroup}>
            {group.map(({ icon, label, sub }, i) => (
              <TouchableOpacity
                key={label}
                style={[
                  styles.menuItem,
                  i < group.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: Colors.border },
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconWrap}>
                  <Ionicons name={icon} size={18} color={Colors.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>{label}</Text>
                  <Text style={styles.menuSub}>{sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.text3} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/')} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={16} color={Colors.red} />
          <Text style={styles.logoutText}>ログアウト</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bg },
  scroll:      { paddingHorizontal: 16, paddingBottom: 40 },
  screenTitle: { fontSize: 20, fontWeight: '500', color: Colors.text, paddingVertical: 16 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 0.5, borderColor: Colors.border, padding: 16, marginBottom: 20 },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.goldDim, borderWidth: 1.5, borderColor: Colors.gold, justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { fontSize: 18, color: Colors.gold, fontWeight: '500' },
  profileName: { fontSize: 16, fontWeight: '500', color: Colors.text, marginBottom: 5 },
  roleBadge:   { backgroundColor: Colors.purpleDim, borderRadius: 8, borderWidth: 0.5, borderColor: 'rgba(155,127,232,0.35)', paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  roleBadgeText: { fontSize: 10, color: Colors.purple },
  menuGroup:   { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, marginBottom: 12 },
  menuItem:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuIconWrap:{ width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.purpleDim, justifyContent: 'center', alignItems: 'center' },
  menuLabel:   { fontSize: 13, color: Colors.text, fontWeight: '500' },
  menuSub:     { fontSize: 11, color: Colors.text3, marginTop: 1 },
  logoutBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(224,92,106,0.25)', padding: 16, marginTop: 8 },
  logoutText:  { fontSize: 14, color: Colors.red, fontWeight: '500' },
});
