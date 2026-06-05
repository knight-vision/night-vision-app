import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { useColors, syncColors } from '../../constants/theme';
import { LoginScreenContent } from '../index';
import * as Haptics from 'expo-haptics';

export default function TabLayout() {
  const { role } = useAuthStore();
  const isOwner = role === 'owner';
  const themeId = useThemeStore((s) => s.themeId);

  // テーマ変更時に Colors シングルトンを同期（StyleSheet.create 用）
  useEffect(() => {
    syncColors(themeId);
  }, [themeId]);

  const Colors = useColors();

  if (!role) return <LoginScreenContent />;

  const tabPressHaptic = () => { Haptics.selectionAsync().catch(() => {}); };

  const tabBarBg =
    themeId === 'neon'   ? 'rgba(12,12,26,0.96)' :
    themeId === 'starry' ? 'rgba(10,0,24,0.96)'  :
                           'rgba(13,13,24,0.95)';

  return (
    <Tabs
      screenListeners={{ tabPress: () => tabPressHaptic() }}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.bg },
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : tabBarBg,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          height: 88,
          paddingBottom: 20,
          paddingTop: 8,
          position: 'absolute',
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <GlassView
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              glassEffectStyle={{
                style: 'regular',
                tintColor: Colors.purple + '',
                animate: true,
              }}
            />
          ) : null,
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.text3,
        tabBarLabelStyle: { fontSize: 11, marginTop: 3, fontWeight: '' },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'ホーム',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />,
      }} />
      <Tabs.Screen name="shift" options={{
        title: 'シフト',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />,
      }} />
      <Tabs.Screen name="slip" options={{
        title: '売上',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={24} color={color} />,
        href: isOwner ? undefined : null,
      }} />
      <Tabs.Screen name="manage" options={{
        title: 'キャスト',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />,
        href: isOwner ? undefined : null,
      }} />
      <Tabs.Screen name="shopmanage" options={{
        title: '店舗',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'storefront' : 'storefront-outline'} size={24} color={color} />,
        href: isOwner ? undefined : null,
      }} />
      <Tabs.Screen name="results" options={{
        title: '給与・実績',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={24} color={color} />,
        href: isOwner ? null : undefined,
      }} />
      <Tabs.Screen name="account" options={{
        title: 'アカウント',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />,
      }} />
      <Tabs.Screen name="salary" options={{ href: null }} />
      <Tabs.Screen name="jobs"   options={{ href: null }} />
    </Tabs>
  );
}
