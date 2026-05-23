import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '../store/auth';

export default function RootLayout() {
  const { role } = useAuthStore();

  useEffect(() => {
    if (role === null) {
      router.replace('/');
    }
  }, [role]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0f' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
