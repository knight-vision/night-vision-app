import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function LoginScreen() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = () => {
    // TODO: implement auth
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logoImg}
          />
          <Text style={styles.logoText}>NIGHT VISION</Text>
          <Text style={styles.logoSub}>KUSHIRO</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={16} color="#5a5868" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="電話番号 / ID"
              placeholderTextColor="#5a5868"
              value={id}
              onChangeText={setId}
              keyboardType="default"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={16} color="#5a5868" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="パスワード"
              placeholderTextColor="#5a5868"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={16} color="#5a5868" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} activeOpacity={0.85}>
            <Text style={styles.loginBtnText}>ログイン</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>パスワードを忘れた方</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  logoWrap: { alignItems: 'center', marginBottom: 48 },
  logoImg: { width: 80, height: 80, borderRadius: 22, marginBottom: 14 },
  logoText: { fontSize: 20, fontWeight: '600', color: '#c9a84c', letterSpacing: 2, marginBottom: 4 },
  logoSub: { fontSize: 11, color: '#5a5868', letterSpacing: 4 },
  form: { width: '100%', gap: 12 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131a',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(180,160,255,0.12)',
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#f0eef8', fontSize: 14 },
  eyeBtn: { padding: 4 },
  loginBtn: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginBtnText: { color: '#1a1200', fontSize: 15, fontWeight: '600', letterSpacing: 1 },
  forgotBtn: { alignItems: 'center', paddingVertical: 8 },
  forgotText: { color: '#9b7fe8', fontSize: 13 },
});
