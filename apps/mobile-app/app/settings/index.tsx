import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  HelpCircle,
  Info,
  FileText,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/auth.store';
import { useTheme } from '../../src/contexts/ThemeContext';

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

function SettingItem({ icon, label, onPress, danger }: SettingItemProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.settingItem, { borderTopColor: colors.borderLight }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: colors.inputBackground }, danger && { backgroundColor: colors.errorLight }]}>
          {icon}
        </View>
        <Text style={[styles.settingLabel, { color: colors.text }, danger && { color: colors.error }]}>
          {label}
        </Text>
      </View>
      <ChevronRight size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { colors } = useTheme();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
          <SettingItem
            icon={<User size={22} color={colors.textSecondary} />}
            label="Edit Profile"
            onPress={() => router.push('/settings/edit-profile')}
          />
          <SettingItem
            icon={<Shield size={22} color={colors.textSecondary} />}
            label="Privacy & Security"
            onPress={() => router.push('/settings/privacy')}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences</Text>
          <SettingItem
            icon={<Bell size={22} color={colors.textSecondary} />}
            label="Notifications"
            onPress={() => router.push('/settings/notifications')}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
          <SettingItem
            icon={<HelpCircle size={22} color={colors.textSecondary} />}
            label="Help Center"
            onPress={() => router.push('/settings/help')}
          />
          <SettingItem
            icon={<FileText size={22} color={colors.textSecondary} />}
            label="Terms & Conditions"
            onPress={() => router.push('/settings/terms')}
          />
          <SettingItem
            icon={<Shield size={22} color={colors.textSecondary} />}
            label="Privacy Policy"
            onPress={() => router.push('/settings/privacy-policy')}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>About</Text>
          <SettingItem
            icon={<Info size={22} color={colors.textSecondary} />}
            label="App Version"
            onPress={() => {}}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingItem
            icon={<LogOut size={22} color={colors.error} />}
            label="Log Out"
            onPress={handleLogout}
            danger
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerDanger: {},
  settingLabel: {
    fontSize: 16,
  },
  settingLabelDanger: {},
});
