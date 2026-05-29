import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/theme';

export default function TabLayout() {
  const { role, loggedOut } = useAuthStore();
  const isOwner = role === 'owner';

  useEffect(() => {
    if (loggedOut || !role) {
      router.replace('/');
    }
  }, [loggedOut, role]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.bg },
        tabBarStyle: {
          backgroundColor: 'rgba(13,13,24,0.92)',
          borderTopColor: Colors.border,
          borderTopWidth: 0.5,
          height: 88,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.text3,
        tabBarLabelStyle: { fontSize: 11, marginTop: 3, fontWeight: '500' },
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
      <Tabs.Screen name="salary"  options={{ href: null }} />
      <Tabs.Screen name="jobs"    options={{ href: null }} />
    </Tabs>
  );
}
