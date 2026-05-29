import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore } from '../store/auth';

function AuthGate() {
  const { role } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    const inTabs = segments[0] === '(tabs)';
    if (!role && inTabs) {
      // ログアウトしたらログイン画面へ
      router.replace('/');
    } else if (role && !inTabs) {
      // ログイン済みなのにログイン画面にいたらタブへ
      router.replace('/(tabs)');
    }
  }, [role, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0d0d18' } }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
