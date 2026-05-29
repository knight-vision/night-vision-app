import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth';

export default function RootLayout() {
  const { role } = useAuthStore();
  const prevRole = useRef(role);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
  }, []);

  useEffect(() => {
    // 初回マウント時はスキップ（index.tsxが自分でナビゲートする）
    if (!mounted.current) return;

    // roleがある値からnullに変わった = ログアウト
    if (prevRole.current !== null && role === null) {
      router.replace('/');
    }
    prevRole.current = role;
  }, [role]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0d0d18' } }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
