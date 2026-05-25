import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/theme';

export default function TabLayout() {
  const { role } = useAuthStore();

  useEffect(() => {
    if (!role) router.replace('/');
  }, [role]);

  if (!role) return null;

  const isOwner = role === 'owner';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 0.5,
          height: 80,
          paddingBottom: 16,
        },
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.text3,
        tabBarLabelStyle: { fontSize: 10, marginTop: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'ホーム',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />,
      }} />
      <Tabs.Screen name="shift" options={{
        title: 'シフト',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />,
      }} />
      {isOwner && (
        <Tabs.Screen name="slip" options={{
          title: '伝票',
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />,
        }} />
      )}
      {isOwner && (
        <Tabs.Screen name="manage" options={{
          title: '管理',
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />,
        }} />
      )}
      <Tabs.Screen name="results" options={{
        title: '成績',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color} />,
      }} />
      <Tabs.Screen name="account" options={{
        title: 'アカウント',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />,
      }} />
      {/* キャスト専用 - オーナーには非表示 */}
      {!isOwner && (
        <Tabs.Screen name="slip" options={{ href: null }} />
      )}
      {!isOwner && (
        <Tabs.Screen name="manage" options={{ href: null }} />
      )}
    </Tabs>
  );
}
