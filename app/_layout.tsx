import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { setupNotificationListeners } from '../lib/notifications';
import { useThemeStore } from '../store/theme';
import { THEMES } from '../constants/theme';

export default function RootLayout() {
  const themeId = useThemeStore((s) => s.themeId);
  const bgColor = THEMES[themeId].bg;
  useEffect(() => {
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bgColor } }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
