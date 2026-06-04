import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { setupNotificationListeners } from '../lib/notifications';

export default function RootLayout() {
  useEffect(() => {
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

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
