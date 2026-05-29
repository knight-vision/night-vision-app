import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Colors } from '../constants/theme';
import { API_BASE } from '../constants/api';
import { useAuthStore } from '../store/auth';
import { registerPushToken } from '../lib/notifications';

type LoginType = 'owner' | 'cast' | null;

function LoginModal({ type, visible, onClose }: {
  type: LoginType;
  visible: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setOwner, setCast } = useAuthStore();

  const isOwner = type === 'owner';
  const title = isOwner ? '店舗管理者ログイン' : 'キャストログイン';
  const endpoint = isOwner ? `${API_BASE}/owner-login` : `${API_BASE}/cast-login`;

  const handleLogin = async () => {
    if (!email || !password) { setError('メールアドレスとパスワードを入力してください'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'ログインに失敗しました'); return; }

      if (isOwner) {
        setOwner({ owner_id: String(data.owner_id), shop_id: String(data.shop_id), shop_name: data.shop_name });
        registerPushToken(String(data.owner_id), 'owner');
      } else {
        setCast({ id: String(data.id), cast_id: String(data.cast_id), cast_name: data.cast_name, shop_id: String(data.shop_id) });
        registerPushToken(String(data.id), 'cast');
      }
      onClose();
      router.replace('/(tabs)');
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail(''); setPassword(''); setError(''); setShowPass(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={modal.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={modal.header}>
          <TouchableOpacity onPress={handleClose} style={modal.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.text2} />
          </TouchableOpacity>
          <Text style={modal.title}>{title}</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={modal.body}>
          <View style={[modal.badge, { backgroundColor: isOwner ? Colors.goldDim : Colors.purpleDim }]}>
            <Ionicons
              name={isOwner ? 'business-outline' : 'person-outline'}
              size={16}
              color={isOwner ? Colors.gold : Colors.purple}
            />
            <Text style={[modal.badgeText, { color: isOwner ? Colors.gold : Colors.purple }]}>
              {isOwner ? '店舗管理者' : 'キャスト'}
            </Text>
          </View>

          <View style={modal.inputWrap}>
            <Ionicons name="mail-outline" size={16} color={Colors.text3} style={modal.inputIcon} />
            <TextInput
              style={modal.input}
              placeholder="メールアドレス"
              placeholderTextColor={Colors.text3}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
          </View>

          <View style={modal.inputWrap}>
            <Ionicons name="lock-closed-outline" size={16} color={Colors.text3} style={modal.inputIcon} />
            <TextInput
              style={[modal.input, { flex: 1 }]}
              placeholder="パスワード"
              placeholderTextColor={Colors.text3}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={modal.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={16} color={Colors.text3} />
            </TouchableOpacity>
          </View>

          {error ? <Text style={modal.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[modal.loginBtn, { backgroundColor: isOwner ? Colors.gold : Colors.purple }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={[modal.loginBtnText, { color: isOwner ? '#1a1200' : '#fff' }]}>ログイン</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function LoginScreen() {
  const [modalType, setModalType] = useState<LoginType>(null);
  const { role } = useAuthStore();

  // ログイン済みならタブへ（初回起動時のみ）
  useEffect(() => {
    if (role) {
      router.replace('/(tabs)');
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image source={require('../assets/images/icon.png')} style={styles.logoImg} />
          <Text style={styles.logoText}>NIGHT VISION</Text>
        </View>

        {/* Login buttons */}
        <View style={styles.btnGroup}>
          <TouchableOpacity
            style={styles.ownerBtn}
            onPress={() => setModalType('owner')}
            activeOpacity={0.85}
          >
            <Ionicons name="business-outline" size={20} color="#1a1200" />
            <Text style={styles.ownerBtnText}>店舗管理者としてログイン</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.castBtn}
            onPress={() => setModalType('cast')}
            activeOpacity={0.85}
          >
            <Ionicons name="person-outline" size={20} color="#fff" />
            <Text style={styles.castBtnText}>キャストとしてログイン</Text>
          </TouchableOpacity>
        </View>
      </View>

      <LoginModal
        type={modalType}
        visible={modalType !== null}
        onClose={() => setModalType(null)}
      />
    </View>
  );
}

const modal = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  closeBtn:   { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:      { fontSize: 16, fontWeight: '500', color: Colors.text },
  body:       { padding: 24, gap: 14 },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  badgeText:  { fontSize: 13, fontWeight: '500' },
  inputWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: 14, height: 50 },
  inputIcon:  { marginRight: 10 },
  input:      { flex: 1, color: Colors.text, fontSize: 14 },
  eyeBtn:     { padding: 4 },
  errorText:  { color: Colors.red, fontSize: 12, textAlign: 'center' },
  loginBtn:   { borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  loginBtnText: { fontSize: 15, fontWeight: '600', letterSpacing: 1 },
});

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  inner:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  logoWrap:     { alignItems: 'center', marginBottom: 56 },
  logoImg:      { width: 90, height: 90, borderRadius: 24, marginBottom: 16 },
  logoText:     { fontSize: 22, fontWeight: '600', color: Colors.gold, letterSpacing: 3 },
  btnGroup:     { width: '100%', gap: 14 },
  ownerBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.gold, borderRadius: 14, height: 54 },
  ownerBtnText: { fontSize: 15, fontWeight: '600', color: '#1a1200', letterSpacing: 0.5 },
  castBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.purple, borderRadius: 14, height: 54 },
  castBtnText:  { fontSize: 15, fontWeight: '600', color: '#fff', letterSpacing: 0.5 },
});
