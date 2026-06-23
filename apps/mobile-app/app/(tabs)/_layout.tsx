import { Tabs } from 'expo-router';
import { Home, Search, CalendarDays, Wallet } from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/auth.store';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function TabLayout() {
  const { isAuthenticated } = useAuthStore();
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tertiary,   // gold for active tab
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopWidth: isDark ? 0 : 1,
          borderTopColor: colors.border,
          paddingTop: 8,
          paddingBottom: 28,
          height: 88,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          letterSpacing: 0.2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
        }}
      />
      {/* Events & Orders removed from the app for launch. */}
      <Tabs.Screen name="profile"  options={{ href: null }} />
    </Tabs>
  );
}
