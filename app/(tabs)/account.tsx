import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/auth';
import { API_BASE } from '../../constants/api';

function ChangePasswordModal({ visible, onClose, userId, role }: {
  visible: boolean; onClose: () => void; userId: string; role: string;
}) {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!current || !newPass) { Alert.alert('エラー', 'すべて入力してください'); return; }
    if (newPass !== confirm) { Alert.alert('エラー', '新しいパスワードが一致しません'); return; }
    if (newPass.length < 6) { Alert.alert('エラー', 'パスワードは6文字以上にしてください'); return; }
    setLoading(true);
    try {
      const endpoint = role === 'owner' ? `${API_BASE}/owner-account-update` : `${API_BASE}/cast-account-update`;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, current_password: current, new_password: newPass }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('エラー', data.error || '変更に失敗しました'); return; }
      Alert.alert('変更しました', 'パスワードを変更しました');
      setCurrent(''); setNewPass(''); setConfirm('');
      onClose();
    } catch { Alert.alert('エラー', '通信エラーが発生しました'); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modal.container}>
        <View style={modal.header}>
          <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.text2} />
          </TouchableOpacity>
          <Text style={modal.title}>パスワード変更</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={modal.body}>
          <Text style={modal.label}>現在のパスワード</Text>
          <TextInput style={modal.input} secureTextEntry placeholder="現在のパスワード"
            placeholderTextColor={Colors.text3} value={current} onChangeText={setCurrent} />
          <Text style={modal.label}>新しいパスワード</Text>
          <TextInput style={modal.input} secureTextEntry placeholder="6文字以上"
            placeholderTextColor={Colors.text3} value={newPass} onChangeText={setNewPass} />
          <Text style={modal.label}>新しいパスワード（確認）</Text>
          <TextInput style={modal.input} secureTextEntry placeholder="もう一度入力"
            placeholderTextColor={Colors.text3} value={confirm} onChangeText={setConfirm} />
          <TouchableOpacity style={modal.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#1a1200" /> : <Text style={modal.submitText}>変更する</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function AccountScreen() {
  const { name, role, shopName, userId, logout } = useAuthStore();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleLogout = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: async () => {
        logout();
        await new Promise(r => setTimeout(r, 100));
        router.replace('/');
      } },
    ]);
  };

  const roleLabel = role === 'owner' ? 'オーナー' : 'キャスト';
  const roleColor = role === 'owner' ? Colors.gold : Colors.purple;
  const roleBg    = role === 'owner' ? Colors.goldDim : Colors.purpleDim;

  const MENU_ITEMS = [
    [
      { icon: 'lock-closed-outline' as const, label: 'パスワード変更', sub: 'セキュリティ設定', onPress: () => setShowPasswordModal(true) },
    ],
    [
      { icon: 'notifications-outline' as const, label: '通知設定', sub: 'プッシュ通知の管理', onPress: () => Alert.alert('通知設定', 'iOSの設定アプリから変更できます') },
      { icon: 'moon-outline' as const, label: 'ダークモード', sub: '常にダーク', onPress: () => {} },
    ],
    [
      { icon: 'help-circle-outline' as const, label: 'ヘルプ・お問い合わせ', sub: 'サポートへ連絡', onPress: () => Alert.alert('お問い合わせ', 'kushiro.night.vision@gmail.com\nまでご連絡ください') },
      { icon: 'information-circle-outline' as const, label: 'アプリバージョン', sub: 'v1.0.0', onPress: () => {} },
    ],
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>アカウント</Text>

        <ChangePasswordModal
          visible={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          userId={userId || ''}
          role={role || ''}
        />

        <View style={styles.profileCard}>
          <View style={[styles.profileAvatar, { borderColor: roleColor, backgroundColor: roleBg }]}>
            <Text style={[styles.profileAvatarText, { color: roleColor }]}>{name?.[0] || '?'}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{name}</Text>
            {shopName && role === 'owner' && <Text style={styles.shopName}>{shopName}</Text>}
            <View style={[styles.roleBadge, { backgroundColor: roleBg, borderColor: roleColor + '60' }]}>
              <Text style={[styles.roleBadgeText, { color: roleColor }]}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {MENU_ITEMS.map((group, gi) => (
          <View key={gi} style={styles.menuGroup}>
            {group.map(({ icon, label, sub, onPress }, i) => (
              <TouchableOpacity
                key={label}
                style={[styles.menuItem, i < group.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: Colors.border }]}
                activeOpacity={0.7}
                onPress={onPress}
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

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={16} color={Colors.red} />
          <Text style={styles.logoutText}>ログアウト</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  closeBtn:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:     { fontSize: 16, fontWeight: '500', color: Colors.text },
  body:      { padding: 20, gap: 8 },
  label:     { fontSize: 12, color: Colors.text2, marginTop: 8 },
  input:     { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14 },
  submitBtn: { backgroundColor: Colors.gold, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  submitText: { color: '#1a1200', fontSize: 15, fontWeight: '600' },
});

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: Colors.bg },
  scroll:            { paddingHorizontal: 16, paddingBottom: 40 },
  screenTitle:       { fontSize: 20, fontWeight: '500', color: Colors.text, paddingVertical: 16 },
  profileCard:       { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 0.5, borderColor: Colors.border, padding: 16, marginBottom: 20 },
  profileAvatar:     { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { fontSize: 18, fontWeight: '500' },
  profileName:       { fontSize: 16, fontWeight: '500', color: Colors.text, marginBottom: 2 },
  shopName:          { fontSize: 11, color: Colors.text3, marginBottom: 5 },
  roleBadge:         { borderRadius: 8, borderWidth: 0.5, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  roleBadgeText:     { fontSize: 10 },
  menuGroup:         { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, marginBottom: 12 },
  menuItem:          { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuIconWrap:      { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.purpleDim, justifyContent: 'center', alignItems: 'center' },
  menuLabel:         { fontSize: 13, color: Colors.text, fontWeight: '500' },
  menuSub:           { fontSize: 11, color: Colors.text3, marginTop: 1 },
  logoutBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(224,92,106,0.25)', padding: 16, marginTop: 8 },
  logoutText:        { fontSize: 14, color: Colors.red, fontWeight: '500' },
});
