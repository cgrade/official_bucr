import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  Heart,
  Star,
  Share2,
  Bell,
  HelpCircle,
  Settings,
  Moon,
  Sun,
  Smartphone,
  LogOut,
  X,
  CreditCard,
  ShoppingBag,
  Calendar,
} from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../stores/auth.store';

const { width } = Dimensions.get('window');
const MENU_WIDTH = width * 0.85;

interface MenuItem {
  icon: any;
  label: string;
  route?: string;
  action?: () => void;
  divider?: boolean;
}

interface SlideMenuProps {
  visible: boolean;
  onClose: () => void;
}

export const SlideMenu: React.FC<SlideMenuProps> = ({ visible, onClose }) => {
  const translateX = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const { colors, theme, setTheme, isDark } = useTheme();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -MENU_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.action) {
      item.action();
    } else if (item.route) {
      router.push(item.route as any);
      onClose();
    }
  };

  const handleThemeToggle = () => {
    if (theme === 'system') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('system');
    }
  };

  const getThemeIcon = () => {
    if (theme === 'system') return Smartphone;
    if (theme === 'dark') return Moon;
    return Sun;
  };

  const getThemeLabel = () => {
    if (theme === 'system') return 'System';
    if (theme === 'dark') return 'Dark';
    return 'Light';
  };

  const menuItems: MenuItem[] = [
    { icon: User, label: 'Edit Profile', route: '/settings/edit-profile' },
    { icon: Heart, label: 'Favorites', route: '/settings/favorites' },
    { icon: Star, label: 'My Reviews', route: '/settings/reviews' },
    { icon: Calendar, label: 'Bookings', route: '/(tabs)/bookings' },
    { icon: CreditCard, label: 'Wallet', route: '/(tabs)/wallet' },
    { icon: ShoppingBag, label: 'Order History', route: '/settings/orders' },
    { divider: true, icon: null, label: '' },
    { icon: Share2, label: 'Refer Friends', route: '/settings/referral' },
    { icon: Bell, label: 'Notifications', route: '/settings/notifications' },
    { icon: HelpCircle, label: 'Help & Support', route: '/settings/help' },
    { icon: Settings, label: 'Settings', route: '/settings' },
    { divider: true, icon: null, label: '' },
    { icon: LogOut, label: 'Sign Out', action: () => {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: async () => {
          await logout();
          onClose();
          router.replace('/(tabs)');
        }},
      ]);
    }},
  ];

  if (!visible) return null;

  return (
    <>
      {/* Overlay */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayOpacity,
          },
        ]}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Menu */}
      <Animated.View
        style={[
          styles.menuContainer,
          {
            transform: [{ translateX }],
            backgroundColor: colors.surface,
          },
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Theme Toggle */}
          <TouchableOpacity
            style={[styles.themeToggle, { backgroundColor: colors.inputBackground }]}
            onPress={handleThemeToggle}
            activeOpacity={0.7}
          >
            <View style={styles.themeToggleContent}>
              {React.createElement(getThemeIcon(), {
                size: 20,
                color: colors.text,
              })}
              <Text style={[styles.themeToggleText, { color: colors.text }]}>
                {getThemeLabel()} Mode
              </Text>
            </View>
            <View style={[styles.themeIndicator, { backgroundColor: colors.primary }]} />
          </TouchableOpacity>

          {/* Menu Items */}
          <ScrollView style={styles.menuItems} showsVerticalScrollIndicator={false}>
            {menuItems.map((item, index) => {
              if (item.divider) {
                return (
                  <View
                    key={index}
                    style={[styles.divider, { backgroundColor: colors.border }]}
                  />
                );
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => handleMenuItemPress(item)}
                  activeOpacity={0.7}
                >
                  {React.createElement(item.icon, {
                    size: 22,
                    color: item.label === 'Sign Out' ? colors.error : colors.textSecondary,
                  })}
                  <Text
                    style={[
                      styles.menuItemText,
                      {
                        color: item.label === 'Sign Out' ? colors.error : colors.text,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Credits Balance */}
          {user && (
            <View style={[styles.creditsCard, { backgroundColor: colors.tertiary }]}>
              <Text style={[styles.creditsLabel, { color: colors.primaryDark }]}>Wallet Balance</Text>
              <Text style={[styles.creditsAmount, { color: colors.primaryDark }]}>
                {user.creditsBalance || 0} Credits
              </Text>
              <Text style={[styles.creditsValue, { color: 'rgba(7,15,30,0.7)' }]}>
                ≈ ₦{((user.creditsBalance || 0) * 10).toLocaleString()}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 999,
  },
  menuContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: MENU_WIDTH,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
  },
  closeButton: {
    padding: 8,
  },
  themeToggle: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeToggleText: {
    fontSize: 16,
    fontWeight: '500',
  },
  themeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  menuItems: {
    flex: 1,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  creditsCard: {
    margin: 20,
    padding: 18,
    borderRadius: 18,
  },
  creditsLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  creditsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  creditsValue: {
    fontSize: 14,
    marginTop: 2,
  },
});
