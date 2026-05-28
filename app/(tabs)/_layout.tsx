import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/theme';

export default function TabLayout() {
  const { role } = useAuthStore();

  useEffect(() => {
    if (!role) {
      setTimeout(() => router.replace('/'), 50);
    }
  }, [role]);

  if (!role) return null;

  const isOwner = role === 'owner';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.bg },
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
          title: '売上',
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color} />,
        }} />
      )}
      {isOwner && (
        <Tabs.Screen name="manage" options={{
          title: 'キャスト',
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />,
        }} />
      )}
      {isOwner && (
        <Tabs.Screen name="shopmanage" options={{
          title: '店舗',
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'storefront' : 'storefront-outline'} size={22} color={color} />,
        }} />
      )}
      <Tabs.Screen name="results" options={{
        title: '給与・実績',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={22} color={color} />,
        href: isOwner ? null : undefined,
      }} />
      <Tabs.Screen name="account" options={{
        title: 'アカウント',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />,
      }} />

      {/* 非表示（サブカテゴリ化したタブ） */}
      <Tabs.Screen name="salary"   options={{ href: null }} />
      <Tabs.Screen name="jobs"     options={{ href: null }} />
      {!isOwner && <Tabs.Screen name="slip"      options={{ href: null }} />}
      {!isOwner && <Tabs.Screen name="manage"    options={{ href: null }} />}
      {!isOwner && <Tabs.Screen name="shopmanage" options={{ href: null }} />}
    </Tabs>
  );
}
