import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: { name: string; title: string; icon: IoniconsName; activeIcon: IoniconsName }[] = [
  { name: 'index',    title: 'ホーム',   icon: 'home-outline',      activeIcon: 'home' },
  { name: 'shift',    title: 'シフト',   icon: 'calendar-outline',  activeIcon: 'calendar' },
  { name: 'results',  title: '成績',     icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { name: 'account',  title: 'アカウント', icon: 'person-outline',  activeIcon: 'person' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#13131a',
          borderTopColor: 'rgba(180,160,255,0.12)',
          borderTopWidth: 0.5,
          height: 80,
          paddingBottom: 16,
        },
        tabBarActiveTintColor: '#c9a84c',
        tabBarInactiveTintColor: '#5a5868',
        tabBarLabelStyle: { fontSize: 10, marginTop: 2 },
      }}
    >
      {TAB_CONFIG.map(({ name, title, icon, activeIcon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? activeIcon : icon} size={22} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
