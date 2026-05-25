import { Slot, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore } from '../store/auth';

export default function RootLayout() {
  const { role } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    const inTabsGroup = segments[0] === '(tabs)';
    if (!role && inTabsGroup) {
      router.replace('/');
    } else if (role && !inTabsGroup && segments[0] !== undefined) {
      router.replace('/(tabs)');
    }
  }, [role, segments]);

  return (
    <>
      <Slot />
      <StatusBar style="light" />
    </>
  );
}
