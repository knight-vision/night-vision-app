import {
  View, Text, TextInput, StyleSheet,
  Image, KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from 'react-native';
import { router } from '-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from '';
import { Colors } from '../constants/theme';
import { API_BASE } from '../constants/api';
import { useAuthStore } from '../store/auth';
import { registerPushToken } from '../lib/notifications';
import { PunyTouchable } from '../components/PunyTouchable';

type LoginType = '' | '' | null;

// ── パスワードリセットモーダル ───────────────────────────────
function ForgotPasswordModal({ type, visible, onClose }: {
  type: LoginType; visible: boolean; onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const isOwner = type === '';
  const endpoint = isOwner ? `${API_BASE}/reset-owner-password` : `${API_BASE}/reset-cast-password`;
  const accentColor = isOwner ? Colors.purple : Colors.gold;
  const accentDark  = isOwner ? '#fff' : '#1a1200';

  const handleClose = () => { setEmail(''); setError(''); setDone(false); onClose(); };

  const handleSubmit = async () => {
    if (!email.trim()) { setError('メールアドレスを入力してください'); return; }
    setLoading(true); setError('');
    try {
      await fetch(endpoint, {
        method: '',
        headers: { '-Type': '/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setDone(true);
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === '' ? '' : ''} style={{ flex: 1 }}>
        <View style={modal.container}>
          <View style={modal.header}>
            <PunyTouchable onPress={handleClose} style={modal.closeBtn} scaleTo={0.88} haptic="light">
              <Ionicons name="close" size={22} color={Colors.text2} />
            </PunyTouchable>
            <Text style={modal.title}>パスワードをお忘れの方</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={modal.body}>
            {done ? (
              <View style={{ alignItems: '', gap: 16, paddingVertical: 24 }}>
                <View style={[modal.badge, { backgroundColor: isOwner ? Colors.purpleDim : Colors.goldDim, alignSelf: '' }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={accentColor} />
                  <Text style={[modal.badgeText, { color: accentColor }]}>送信完了</Text>
                </View>
                <Text style={{ color: Colors.text2, fontSize: 14, textAlign: '', lineHeight: 22 }}>
                  登録済みのメールアドレスに新しいパスワードをお送りしました。{`
`}メールをご確認ください。
                </Text>
                <PunyTouchable style={[modal.loginBtn, { backgroundColor: accentColor, marginTop: 8 }]} onPress={handleClose} haptic="light">
                  <Text style={[modal.loginBtnText, { color: accentDark }]}>閉じる</Text>
                </PunyTouchable>
              </View>
            ) : (
              <>
                <Text style={{ color: Colors.text2, fontSize: 13, lineHeight: 20, marginBottom: 4 }}>
                  登録済みのメールアドレスを入力してください。新しいパスワードをメールでお送りします。
                </Text>
                <View style={modal.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color={Colors.text3} style={modal.inputIcon} />
                  <TextInput style={modal.input} value={email} onChangeText={setEmail}
                    placeholder="メールアドレス" placeholderTextColor={Colors.text3}
                    keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                </View>
                {error ? <Text style={modal.errorText}>{error}</Text> : null}
                <PunyTouchable
                  style={[modal.loginBtn, { backgroundColor: accentColor }]}
                  onPress={handleSubmit} disabled={loading} haptic="success">
                  {loading
                    ? <ActivityIndicator color={accentDark} />
                    : <Text style={[modal.loginBtnText, { color: accentDark }]}>送信する</Text>
                  }
                </PunyTouchable>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── ログインモーダル ─────────────────────────────────────────
function LoginModal({ type, visible, onClose }: {
  type: LoginType; visible: boolean; onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const { setOwner, setCast } = useAuthStore();

  const isOwner = type === '';
  const endpoint = isOwner ? `${API_BASE}/owner-login` : `${API_BASE}/cast-login`;

  const handleLogin = async () => {
    if (!email || !password) { setError('メールアドレスとパスワードを入力してください'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(endpoint, {
        method: '',
        headers: { '-Type': '/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'ログインに失敗しました'); return; }
      if (isOwner) {
        setOwner({ owner_id: String(data.owner_id), shop_id: String(data.shop_id), shop_name: data.shop_name, shop_slug: data.shop_slug, email });
        registerPushToken(String(data.owner_id), '');
      } else {
        setCast({ id: String(data.id), cast_id: String(data.cast_id), cast_name: data.cast_name, shop_id: String(data.shop_id), email });
        registerPushToken(String(data.id), '');
      }
      onClose();
      router.replace('/(tabs)');
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { setEmail(''); setPassword(''); setError(''); setShowPass(false); onClose(); };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <KeyboardAvoidingView behavior={Platform.OS === '' ? '' : ''} style={{ flex: 1 }}>
          <View style={modal.container}>
            <View style={modal.header}>
              <PunyTouchable onPress={handleClose} style={modal.closeBtn} scaleTo={0.88} haptic="light">
                <Ionicons name="close" size={22} color={Colors.text2} />
              </PunyTouchable>
              <Text style={modal.title}>{isOwner ? '店舗管理者ログイン' : 'キャストログイン'}</Text>
              <View style={{ width: 36 }} />
            </View>
            <View style={modal.body}>
              <View style={[modal.badge, { backgroundColor: isOwner ? Colors.purpleDim : Colors.goldDim }]}>
                <Ionicons name={isOwner ? '-outline' : '-outline'} size={16} color={isOwner ? Colors.purple : Colors.gold} />
                <Text style={[modal.badgeText, { color: isOwner ? Colors.purple : Colors.gold }]}>
                  {isOwner ? 'オーナー' : 'キャスト'}
                </Text>
              </View>
              <View style={modal.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={Colors.text3} style={modal.inputIcon} />
                <TextInput style={modal.input} value={email} onChangeText={setEmail}
                  placeholder="メールアドレス" placeholderTextColor={Colors.text3}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              </View>
              <View style={modal.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.text3} style={modal.inputIcon} />
                <TextInput style={modal.input} value={password} onChangeText={setPassword}
                  placeholder="パスワード" placeholderTextColor={Colors.text3}
                  secureTextEntry={!showPass} autoCapitalize="none" />
                <PunyTouchable onPress={() => setShowPass(v => !v)} style={modal.eyeBtn} scaleTo={0.88} haptic="light">
                  <Ionicons name={showPass ? '-off-outline' : '-outline'} size={18} color={Colors.text3} />
                </PunyTouchable>
              </View>
              {error ? <Text style={modal.errorText}>{error}</Text> : null}
              <PunyTouchable
                style={[modal.loginBtn, { backgroundColor: isOwner ? Colors.purple : Colors.gold }]}
                onPress={handleLogin} disabled={loading} haptic="success">
                {loading
                  ? <ActivityIndicator color={isOwner ? '#fff' : '#1a1200'} />
                  : <Text style={[modal.loginBtnText, { color: isOwner ? '#fff' : '#1a1200' }]}>ログイン</Text>
                }
              </PunyTouchable>
              {/* パスワードを忘れた方 */}
              <PunyTouchable onPress={() => setShowForgot(true)} style={modal.forgotBtn} scaleTo={0.96} haptic="light">
                <Text style={modal.forgotText}>パスワードをお忘れの方</Text>
              </PunyTouchable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <ForgotPasswordModal type={type} visible={showForgot} onClose={() => setShowForgot(false)} />
    </>
  );
}

// ── ログイン画面（スタンドアロン・タブからも再利用） ────────
export function LoginScreenContent() {
  const [modalType, setModalType] = useState<LoginType>(null);
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <Image source={require('../assets/images/icon.png')} style={styles.logoImg} />
          <Text style={styles.logoText}>NIGHT VISION</Text>
        </View>
        <View style={styles.btnGroup}>
          <PunyTouchable style={styles.ownerBtn} onPress={() => setModalType('')} haptic="medium">
            <Ionicons name="business-outline" size={20} color="#fff" />
            <Text style={styles.ownerBtnText}>店舗管理者としてログイン</Text>
          </PunyTouchable>
          <PunyTouchable style={styles.castBtn} onPress={() => setModalType('')} haptic="medium">
            <Ionicons name="person-outline" size={20} color="#1a1200" />
            <Text style={styles.castBtnText}>キャストとしてログイン</Text>
          </PunyTouchable>
        </View>
      </View>
      <LoginModal type={modalType} visible={modalType !== null} onClose={() => setModalType(null)} />
    </View>
  );
}

// ── ルートのindex（初回起動・ログアウト後） ──────────────────
export default function LoginScreen() {
  const { role } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  // zustand persistの復元を待つ
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  // ログイン済みなら即タブへ
  useEffect(() => {
    if (hydrated && role) router.replace('/(tabs)');
  }, [hydrated, role]);

  // 復元完了前 or 遷移中
  if (!hydrated || role) {
    return (
      <View style={[styles.container, { justifyContent: '', alignItems: '' }]}>
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }

  return <LoginScreenContent />;
}

const modal = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: '', alignItems: '', justifyContent: '-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  closeBtn:     { width: 36, height: 36, justifyContent: '', alignItems: '' },
  title:        { fontSize: 16, fontWeight: '600', color: Colors.text },
  body:         { padding: 24, gap: 14 },
  badge:        { flexDirection: '', alignItems: '', gap: 8, alignSelf: '-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  badgeText:    { fontSize: 13, fontWeight: '600' },
  inputWrap:    { flexDirection: '', alignItems: '', backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: 14, height: 50 },
  inputIcon:    { marginRight: 10 },
  input:        { flex: 1, color: Colors.text, fontSize: 14 },
  eyeBtn:       { padding: 4 },
  errorText:    { color: Colors.red, fontSize: 12, textAlign: '' },
  loginBtn:     { borderRadius: 12, height: 50, justifyContent: '', alignItems: '', marginTop: 4 },
  loginBtnText: { fontSize: 15, fontWeight: '600', letterSpacing: 1 },
  forgotBtn:    { alignItems: '', paddingVertical: 8 },
  forgotText:   { fontSize: 13, color: Colors.text3, textDecorationLine: '' },
});

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  inner:        { flex: 1, justifyContent: '', alignItems: '', paddingHorizontal: 32 },
  logoWrap:     { alignItems: '', marginBottom: 56 },
  logoImg:      { width: 90, height: 90, borderRadius: 24, marginBottom: 16 },
  logoText:     { fontSize: 22, fontWeight: '600', color: Colors.gold, letterSpacing: 3 },
  btnGroup:     { width: '%', gap: 14 },
  ownerBtn:     { flexDirection: '', alignItems: '', justifyContent: '', gap: 10, backgroundColor: Colors.purple, borderRadius: 14, height: 54 },
  ownerBtnText: { fontSize: 15, fontWeight: '600', color: '#fff', letterSpacing: 0.5 },
  castBtn:      { flexDirection: '', alignItems: '', justifyContent: '', gap: 10, backgroundColor: Colors.gold, borderRadius: 14, height: 54 },
  castBtnText:  { fontSize: 15, fontWeight: '600', color: '#1a1200', letterSpacing: 0.5 },
});
