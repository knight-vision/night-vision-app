import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useColors } from '../../constants/theme';
import { useAuthStore } from '../../store/auth';
import { API_BASE } from '../../constants/api';
import { PunyTouchable, haptic } from '../../components/PunyTouchable';

// ── パスワード変更モーダル ─────────────────────────────────────
function ChangePasswordModal({ visible, onClose, userId, role }: {
  visible: boolean; onClose: () => void; userId: string; role: string;
}) {
  const Colors = useColors();
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
      <View style={[modal.container, { backgroundColor: Colors.bg }]}>
        <View style={[modal.header, { borderBottomColor: Colors.border }]}>
          <PunyTouchable onPress={onClose} style={modal.closeBtn} scaleTo={0.88} haptic="light">
            <Ionicons name="close" size={22} color={Colors.text2} />
          </TouchableOpacity>
          <Text style={[modal.title, { color: Colors.text }]}>パスワード変更</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={modal.body}>
          <Text style={[modal.label, { color: Colors.text2 }]}>現在のパスワード</Text>
          <TextInput style={[modal.input, { backgroundColor: Colors.surface, borderColor: Colors.border, color: Colors.text }]} secureTextEntry placeholder="現在のパスワード"
            placeholderTextColor={Colors.text3} value={current} onChangeText={setCurrent} />
          <Text style={[modal.label, { color: Colors.text2 }]}>新しいパスワード</Text>
          <TextInput style={[modal.input, { backgroundColor: Colors.surface, borderColor: Colors.border, color: Colors.text }]} secureTextEntry placeholder="6文字以上"
            placeholderTextColor={Colors.text3} value={newPass} onChangeText={setNewPass} />
          <Text style={[modal.label, { color: Colors.text2 }]}>新しいパスワード（確認）</Text>
          <TextInput style={[modal.input, { backgroundColor: Colors.surface, borderColor: Colors.border, color: Colors.text }]} secureTextEntry placeholder="もう一度入力"
            placeholderTextColor={Colors.text3} value={confirm} onChangeText={setConfirm} />
          <PunyTouchable style={[modal.submitBtn, { backgroundColor: Colors.gold }]} onPress={handleSubmit} disabled={loading} haptic="success">
            {loading ? <ActivityIndicator color="#1a1200" /> : <Text style={modal.submitText}>変更する</Text>}
          </PunyTouchable>
        </View>
      </View>
    </Modal>
  );
}

// ── メールアドレス変更モーダル ─────────────────────────────────
function ChangeEmailModal({ visible, onClose, userId, role, currentEmail }: {
  visible: boolean; onClose: () => void; userId: string; role: string; currentEmail?: string;
}) {
  const Colors = useColors();
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
      <View style={[modal.container, { backgroundColor: Colors.bg }]}>
        <View style={[modal.header, { borderBottomColor: Colors.border }]}>
          <PunyTouchable onPress={onClose} style={modal.closeBtn} scaleTo={0.88} haptic="light">
            <Ionicons name="close" size={22} color={Colors.text2} />
          </TouchableOpacity>
          <Text style={[modal.title, { color: Colors.text }]}>メールアドレス変更</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={modal.body}>
          {currentEmail && <Text style={[modal.label, { marginBottom: 12 }]}>現在: {currentEmail}</Text>}
          <Text style={[modal.label, { color: Colors.text2 }]}>新しいメールアドレス</Text>
          <TextInput style={[modal.input, { backgroundColor: Colors.surface, borderColor: Colors.border, color: Colors.text }]} placeholder="新しいメールアドレス"
            placeholderTextColor={Colors.text3} value={newEmail} onChangeText={setNewEmail}
            keyboardType="email-address" autoCapitalize="none" />
          <Text style={[modal.label, { color: Colors.text2 }]}>現在のパスワード（確認）</Text>
          <TextInput style={[modal.input, { backgroundColor: Colors.surface, borderColor: Colors.border, color: Colors.text }]} secureTextEntry placeholder="パスワードを入力"
            placeholderTextColor={Colors.text3} value={password} onChangeText={setPassword} />
          <PunyTouchable style={[modal.submitBtn, { backgroundColor: Colors.gold }]} onPress={handleSubmit} disabled={loading} haptic="success">
            {loading ? <ActivityIndicator color="#1a1200" /> : <Text style={modal.submitText}>変更する</Text>}
          </PunyTouchable>
        </View>
      </View>
    </Modal>
  );
}

// ── メイン ────────────────────────────────────────────────────
export default function AccountScreen() {
  const { name, role, shopName, userId, logout, email } = useAuthStore();
  const Colors = useColors();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  // 通知設定（AsyncStorageで永続化）
  const [notifyApproved, setNotifyApproved] = useState(true);
  const [notifyConfirmed, setNotifyConfirmed] = useState(true);

  const handleLogout = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const roleLabel = role === 'owner' ? 'オーナー' : 'キャスト';
  const roleColor = role === 'owner' ? Colors.gold : Colors.purple;
  const roleBg    = role === 'owner' ? Colors.goldDim : Colors.purpleDim;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.screenTitle, { color: Colors.text }]}>アカウント</Text>

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
        <View style={[styles.profileCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <View style={[styles.profileAvatar, { borderColor: roleColor, backgroundColor: roleBg }]}>
            <Text style={[styles.profileAvatarText, { color: roleColor }]}>{name?.[0] || '?'}</Text>
          </View>
          <View>
            <Text style={[styles.profileName, { color: Colors.text }]}>{name}</Text>
            {email && <Text style={[styles.profileEmail, { color: Colors.text3 }]}>{email}</Text>}
            {shopName && role === 'owner' && <Text style={[styles.shopName, { color: Colors.text3 }]}>{shopName}</Text>}
            <View style={[styles.roleBadge, { backgroundColor: roleBg, borderColor: roleColor + '60' }]}>
              <Text style={[styles.roleBadgeText, { color: roleColor }]}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {/* アカウント設定 */}
        <View style={[styles.menuGroup, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <PunyTouchable style={[styles.menuItem, { borderBottomWidth: 0.5, borderBottomColor: Colors.border }]}
            onPress={() => setShowPasswordModal(true)} scaleTo={0.98} haptic="light">
            <View style={[styles.menuIconWrap, { backgroundColor: Colors.purpleDim }]}><Ionicons name="lock-closed-outline" size={18} color={Colors.purple} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuLabel, { color: Colors.text }]}>パスワード変更</Text>
              <Text style={[styles.menuSub, { color: Colors.text3 }]}>セキュリティ設定</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Colors.text3} />
          </TouchableOpacity>
          <PunyTouchable scaleTo={0.97} haptic="light" style={styles.menuItem} onPress={() => setShowEmailModal(true)}>
            <View style={[styles.menuIconWrap, { backgroundColor: Colors.purpleDim }]}><Ionicons name="mail-outline" size={18} color={Colors.purple} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuLabel, { color: Colors.text }]}>メールアドレス変更</Text>
              <Text style={[styles.menuSub, { color: Colors.text3 }]}>{email || 'メールアドレスを設定'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Colors.text3} />
          </PunyTouchable>
        </View>

        {/* 通知設定 */}
        <View style={[styles.menuGroup, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <View style={[styles.menuItem, { borderBottomWidth: 0.5, borderBottomColor: Colors.border }]}>
            <View style={[styles.menuIconWrap, { backgroundColor: Colors.purpleDim }]}><Ionicons name="notifications-outline" size={18} color={Colors.purple} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuLabel, { color: Colors.text }]}>シフト承認時の通知</Text>
              <Text style={[styles.menuSub, { color: Colors.text3 }]}>承認・否認された時に通知</Text>
            </View>
            <Switch
              value={notifyApproved}
              onValueChange={setNotifyApproved}
              trackColor={{ false: Colors.surface2, true: "#22c55e" }}
              ios_backgroundColor={Colors.surface2}
              thumbColor="#ffffff"
            />
          </View>
          <View style={styles.menuItem}>
            <View style={[styles.menuIconWrap, { backgroundColor: Colors.purpleDim }]}><Ionicons name="calendar-outline" size={18} color={Colors.purple} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuLabel, { color: Colors.text }]}>シフト確定時の通知</Text>
              <Text style={[styles.menuSub, { color: Colors.text3 }]}>シフトが確定された時に通知</Text>
            </View>
            <Switch
              value={notifyConfirmed}
              onValueChange={setNotifyConfirmed}
              trackColor={{ false: Colors.surface2, true: "#22c55e" }}
              ios_backgroundColor={Colors.surface2}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* その他 */}
        <View style={[styles.menuGroup, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <PunyTouchable style={[styles.menuItem, { borderBottomWidth: 0.5, borderBottomColor: Colors.border }]}
            onPress={() => Alert.alert('お問い合わせ', 'kushiro.night.vision@gmail.com\nまでご連絡ください')}>
            <View style={[styles.menuIconWrap, { backgroundColor: Colors.purpleDim }]}><Ionicons name="help-circle-outline" size={18} color={Colors.purple} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuLabel, { color: Colors.text }]}>ヘルプ・お問い合わせ</Text>
              <Text style={[styles.menuSub, { color: Colors.text3 }]}>サポートへ連絡</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Colors.text3} />
          </TouchableOpacity>
          <View style={styles.menuItem}>
            <View style={[styles.menuIconWrap, { backgroundColor: Colors.purpleDim }]}><Ionicons name="information-circle-outline" size={18} color={Colors.purple} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuLabel, { color: Colors.text }]}>アプリバージョン</Text>
              <Text style={[styles.menuSub, { color: Colors.text3 }]}>v1.0.0</Text>
            </View>
          </View>
        </View>

        <PunyTouchable style={[styles.logoutBtn, { backgroundColor: Colors.surface }]} onPress={handleLogout} haptic="warning">
          <Ionicons name="log-out-outline" size={16} color={Colors.red} />
          <Text style={[styles.logoutText, { color: Colors.red }]}>ログアウト</Text>
        </PunyTouchable>
      </ScrollView>
    </SafeAreaView>
  );
}

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d18' },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(200,180,255,0.18)' },
  closeBtn:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:     { fontSize: 16, fontWeight: '500', color: '#f8f4ff' },
  body:      { padding: 20, gap: 8 },
  label:     { fontSize: 12, color: '#b8b0cc', marginTop: 8 },
  input:     { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', padding: 12, color: '#f8f4ff', fontSize: 14 },
  submitBtn: { borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  submitText: { color: '#1a1200', fontSize: 15, fontWeight: '600' },
});

const styles = StyleSheet.create({
  safe:              { flex: 1 },
  scroll:            { paddingHorizontal: 16, paddingBottom: 108 },
  screenTitle:       { fontSize: 20, fontWeight: '500', paddingVertical: 16 },
  profileCard:       { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, borderWidth: 0.5, padding: 16, marginBottom: 20 },
  profileAvatar:     { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { fontSize: 18, fontWeight: '500' },
  profileName:       { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  profileEmail:      { fontSize: 11, marginBottom: 2 },
  shopName:          { fontSize: 11, marginBottom: 5 },
  roleBadge:         { borderRadius: 8, borderWidth: 0.5, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  roleBadgeText:     { fontSize: 10 },
  menuGroup:         { borderRadius: 12, borderWidth: 0.5, marginBottom: 12 },
  menuItem:          { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuIconWrap:      { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  menuLabel:         { fontSize: 13, fontWeight: '500' },
  menuSub:           { fontSize: 11, marginTop: 1 },
  logoutBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(224,92,106,0.25)', padding: 16, marginTop: 8 },
  logoutText:        { fontSize: 14, fontWeight: '500' },
});
