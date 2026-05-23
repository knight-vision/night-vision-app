import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Colors } from '../constants/theme';
import { API_BASE } from '../constants/api';
import { useAuthStore } from '../store/auth';
import { registerPushToken } from '../lib/notifications';

export default function LoginScreen() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setOwner, setCast } = useAuthStore();

  const handleLogin = async () => {
    if (!id || !password) { setError('IDとパスワードを入力してください'); return; }
    setLoading(true);
    setError('');
    try {
      // オーナーとして試行
      const ownerRes = await fetch(`${API_BASE}/owner-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: id, password }),
      });
      if (ownerRes.ok) {
        const data = await ownerRes.json();
        setOwner({ owner_id: String(data.owner_id), shop_id: String(data.shop_id), shop_name: data.shop_name });
        registerPushToken(String(data.owner_id), 'owner');
        router.replace('/(tabs)');
        return;
      }
      // キャストとして試行
      const castRes = await fetch(`${API_BASE}/cast-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: id, password }),
      });
      if (castRes.ok) {
        const data = await castRes.json();
        setCast({ id: String(data.id), cast_id: String(data.cast_id), cast_name: data.cast_name, shop_id: String(data.shop_id) });
        registerPushToken(String(data.id), 'cast');
        router.replace('/(tabs)');
        return;
      }
      setError('メールアドレスまたはパスワードが違います');
    } catch {
      setError('通信エラーが発生しました。再度お試しください');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <Image source={require('../assets/images/icon.png')} style={styles.logoImg} />
          <Text style={styles.logoText}>NIGHT VISION</Text>
          <Text style={styles.logoSub}>KUSHIRO</Text>
        </View>
        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={16} color={Colors.text3} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="メールアドレス" placeholderTextColor={Colors.text3}
              value={id} onChangeText={setId} keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={16} color={Colors.text3} style={styles.inputIcon} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="パスワード" placeholderTextColor={Colors.text3}
              value={password} onChangeText={setPassword} secureTextEntry={!showPass} />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={16} color={Colors.text3} />
            </TouchableOpacity>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} activeOpacity={0.85} disabled={loading}>
            {loading ? <ActivityIndicator color="#1a1200" /> : <Text style={styles.loginBtnText}>ログイン</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  inner:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  logoWrap:     { alignItems: 'center', marginBottom: 48 },
  logoImg:      { width: 80, height: 80, borderRadius: 22, marginBottom: 14 },
  logoText:     { fontSize: 20, fontWeight: '600', color: Colors.gold, letterSpacing: 2, marginBottom: 4 },
  logoSub:      { fontSize: 11, color: Colors.text3, letterSpacing: 4 },
  form:         { width: '100%', gap: 12 },
  inputWrap:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: 14, height: 50 },
  inputIcon:    { marginRight: 10 },
  input:        { flex: 1, color: Colors.text, fontSize: 14 },
  eyeBtn:       { padding: 4 },
  errorText:    { color: Colors.red, fontSize: 12, textAlign: 'center' },
  loginBtn:     { backgroundColor: Colors.gold, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  loginBtnText: { color: '#1a1200', fontSize: 15, fontWeight: '600', letterSpacing: 1 },
});
