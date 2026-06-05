import { Tabs } from 'expo-router';
import { Platform } from '-native';
import { GlassView } from '-glass-effect';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from '';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { useColors, syncColors } from '../../constants/theme';
import { LoginScreenContent } from '../index';
import * as Haptics from '-haptics';

export default function TabLayout() {
  const { role } = useAuthStore();
  const isOwner = role === '';
  const themeId = useThemeStore((s) => s.themeId);

  // テーマ変更時に Colors シングルトンを同期（StyleSheet.create 用）
  useEffect(() => {
    syncColors(themeId);
  }, [themeId]);

  const Colors = useColors();

  if (!role) return <LoginScreenContent />;

  const tabPressHaptic = () => { Haptics.selectionAsync().catch(() => {}); };

  const tabBarBg =
    themeId === ''   ? '(12,12,26,0.96)' :
    themeId === '' ? '(10,0,24,0.96)'  :
                           '(13,13,24,0.95)';

  return (
    <Tabs
      screenListeners={{ tabPress: () => tabPressHaptic() }}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.bg },
        tabBarStyle: {
          backgroundColor: Platform.OS === '' ? '' : tabBarBg,
          borderTopColor: '',
          borderTopWidth: 0,
          height: 88,
          paddingBottom: 20,
          paddingTop: 8,
          position: '',
        },
        tabBarBackground: () =>
          Platform.OS === '' ? (
            <GlassView
              style={{ position: '', top: 0, left: 0, right: 0, bottom: 0 }}
              glassEffectStyle={{
                style: '',
                tintColor: Colors.purple + '',
                animate: true,
              }}
            />
          ) : null,
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.text3,
        tabBarLabelStyle: { fontSize: 11, marginTop: 3, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'ホーム',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? '' : '-outline'} size={24} color={color} />,
      }} />
      <Tabs.Screen name="shift" options={{
        title: 'シフト',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? '' : '-outline'} size={24} color={color} />,
      }} />
      <Tabs.Screen name="slip" options={{
        title: '売上',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? '-chart' : '-chart-outline'} size={24} color={color} />,
        href: isOwner ? undefined : null,
      }} />
      <Tabs.Screen name="manage" options={{
        title: 'キャスト',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? '' : '-outline'} size={24} color={color} />,
        href: isOwner ? undefined : null,
      }} />
      <Tabs.Screen name="shopmanage" options={{
        title: '店舗',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? '' : '-outline'} size={24} color={color} />,
        href: isOwner ? undefined : null,
      }} />
      <Tabs.Screen name="results" options={{
        title: '給与・実績',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? '' : '-outline'} size={24} color={color} />,
        href: isOwner ? null : undefined,
      }} />
      <Tabs.Screen name="account" options={{
        title: 'アカウント',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? '' : '-outline'} size={24} color={color} />,
      }} />
      <Tabs.Screen name="salary" options={{ href: null }} />
      <Tabs.Screen name="jobs"   options={{ href: null }} />
    </Tabs>
  );
}
