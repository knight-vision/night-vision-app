import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/auth';
import { API_BASE } from '../../constants/api';

// ── パスワード変更モーダル ─────────────────────────────────────
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

// ── メールアドレス変更モーダル ─────────────────────────────────
function ChangeEmailModal({ visible, onClose, userId, role, currentEmail }: {
  visible: boolean; onClose: () => void; userId: string; role: string; currentEmail?: string;
}) {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!newEmail || !password) { Alert.alert('エラー', 'すべて入力してください'); return; }
    if (!newEmail.includes('@')) { Alert.alert('エラー', '正しいメールアドレスを入力してください'); return; }
    setLoading(true);
    try {
      const endpoint = role === 'owner' ? `${API_BASE}/owner-account-update` : `${API_BASE}/cast-account-update`;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, current_password: password, new_email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('エラー', data.error || '変更に失敗しました'); return; }
      Alert.alert('変更しました', `メールアドレスを ${newEmail} に変更しました`);
      setNewEmail(''); setPassword('');
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
          <Text style={modal.title}>メールアドレス変更</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={modal.body}>
          {currentEmail && <Text style={[modal.label, { marginBottom: 12 }]}>現在: {currentEmail}</Text>}
          <Text style={modal.label}>新しいメールアドレス</Text>
          <TextInput style={modal.input} placeholder="新しいメールアドレス"
            placeholderTextColor={Colors.text3} value={newEmail} onChangeText={setNewEmail}
            keyboardType="email-address" autoCapitalize="none" />
          <Text style={modal.label}>現在のパスワード（確認）</Text>
          <TextInput style={modal.input} secureTextEntry placeholder="パスワードを入力"
            placeholderTextColor={Colors.text3} value={password} onChangeText={setPassword} />
          <TouchableOpacity style={modal.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#1a1200" /> : <Text style={modal.submitText}>変更する</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── メイン ────────────────────────────────────────────────────
export default function AccountScreen() {
  const { name, role, shopName, userId, logout, email } = useAuthStore();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  // 通知設定（AsyncStorageで永続化）
  const [notifyApproved, setNotifyApproved] = useState(true);
  const [notifyConfirmed, setNotifyConfirmed] = useState(true);

  const handleLogout = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: () => { logout(); router.replace('/'); } },
    ]);
  };

  const roleLabel = role === 'owner' ? 'オーナー' : 'キャスト';
  const roleColor = role === 'owner' ? Colors.gold : Colors.purple;
  const roleBg    = role === 'owner' ? Colors.goldDim : Colors.purpleDim;

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
        <ChangeEmailModal
          visible={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          userId={userId || ''}
          role={role || ''}
          currentEmail={email}
        />

        {/* プロフィール */}
        <View style={styles.profileCard}>
          <View style={[styles.profileAvatar, { borderColor: roleColor, backgroundColor: roleBg }]}>
            <Text style={[styles.profileAvatarText, { color: roleColor }]}>{name?.[0] || '?'}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{name}</Text>
            {email && <Text style={styles.profileEmail}>{email}</Text>}
            {shopName && role === 'owner' && <Text style={styles.shopName}>{shopName}</Text>}
            <View style={[styles.roleBadge, { backgroundColor: roleBg, borderColor: roleColor + '60' }]}>
              <Text style={[styles.roleBadgeText, { color: roleColor }]}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {/* アカウント設定 */}
        <View style={styles.menuGroup}>
          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0.5, borderBottomColor: Colors.border }]}
            onPress={() => setShowPasswordModal(true)}>
            <View style={styles.menuIconWrap}><Ionicons name="lock-closed-outline" size={18} color={Colors.purple} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>パスワード変更</Text>
              <Text style={styles.menuSub}>セキュリティ設定</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Colors.text3} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowEmailModal(true)}>
            <View style={styles.menuIconWrap}><Ionicons name="mail-outline" size={18} color={Colors.purple} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>メールアドレス変更</Text>
              <Text style={styles.menuSub}>{email || 'メールアドレスを設定'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Colors.text3} />
          </TouchableOpacity>
        </View>

        {/* 通知設定 */}
        <View style={styles.menuGroup}>
          <View style={[styles.menuItem, { borderBottomWidth: 0.5, borderBottomColor: Colors.border }]}>
            <View style={styles.menuIconWrap}><Ionicons name="notifications-outline" size={18} color={Colors.purple} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>シフト承認時の通知</Text>
              <Text style={styles.menuSub}>承認・否認された時に通知</Text>
            </View>
            <Switch
              value={notifyApproved}
              onValueChange={setNotifyApproved}
              trackColor={{ false: Colors.surface2, true: Colors.goldDim }}
              thumbColor={notifyApproved ? Colors.gold : Colors.text3}
            />
          </View>
          <View style={styles.menuItem}>
            <View style={styles.menuIconWrap}><Ionicons name="calendar-outline" size={18} color={Colors.purple} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>シフト確定時の通知</Text>
              <Text style={styles.menuSub}>シフトが確定された時に通知</Text>
            </View>
            <Switch
              value={notifyConfirmed}
              onValueChange={setNotifyConfirmed}
              trackColor={{ false: Colors.surface2, true: Colors.goldDim }}
              thumbColor={notifyConfirmed ? Colors.gold : Colors.text3}
            />
          </View>
        </View>

        {/* その他 */}
        <View style={styles.menuGroup}>
          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0.5, borderBottomColor: Colors.border }]}
            onPress={() => Alert.alert('お問い合わせ', 'kushiro.night.vision@gmail.com\nまでご連絡ください')}>
            <View style={styles.menuIconWrap}><Ionicons name="help-circle-outline" size={18} color={Colors.purple} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>ヘルプ・お問い合わせ</Text>
              <Text style={styles.menuSub}>サポートへ連絡</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Colors.text3} />
          </TouchableOpacity>
          <View style={styles.menuItem}>
            <View style={styles.menuIconWrap}><Ionicons name="information-circle-outline" size={18} color={Colors.purple} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>アプリバージョン</Text>
              <Text style={styles.menuSub}>v1.0.0</Text>
            </View>
          </View>
        </View>

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
  profileEmail:      { fontSize: 11, color: Colors.text3, marginBottom: 2 },
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
