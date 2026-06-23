'use client';
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Alert, ActivityIndicator, Platform, ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  CreditCard, Heart, Star, Bell, HelpCircle,
  LogOut, ChevronRight, Camera, Gift,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/stores/auth.store';
import { useTheme } from '../../src/contexts/ThemeContext';
import { usersApi } from '../../src/lib/api';
import { config } from '../../src/lib/config';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarUri(avatar: string, cacheBuster?: number) {
  const base = avatar.startsWith('http') ? avatar : `${config.apiUrl}${avatar}`;
  // Append timestamp to bust React Native's Image cache after upload
  return cacheBuster ? `${base}?t=${cacheBuster}` : base;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}
function MenuItem({ icon, label, value, onPress, danger }: MenuItemProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemIcon}>{icon}</View>
      <Text style={[styles.menuItemLabel, { color: danger ? colors.error : colors.text }]}>{label}</Text>
      <View style={styles.menuItemRight}>
        {value && <Text style={[styles.menuItemValue, { color: colors.textMuted }]}>{value}</Text>}
        {!danger && <ChevronRight size={16} color={colors.textMuted} />}
      </View>
    </TouchableOpacity>
  );
}

function GuestView({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.guestContainer}>
      <View style={[styles.guestIcon, { backgroundColor: colors.inputBackground }]}>
        <CreditCard size={40} color={colors.textMuted} />
      </View>
      <Text style={[styles.guestTitle, { color: colors.text }]}>Sign in to view your profile</Text>
      <Text style={[styles.guestSubtitle, { color: colors.textMuted }]}>
        Track bookings, manage credits, and earn rewards
      </Text>
      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.tertiary }]} onPress={onLogin}>
        <Text style={[styles.primaryBtnText, { color: colors.primaryDark }]}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.border }]} onPress={onRegister}>
        <Text style={[styles.outlineBtnText, { color: colors.text }]}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, isAuthenticated, logout, updateUser } = useAuthStore();
  const [uploading,  setUploading]  = useState(false);
  const [avatarKey,  setAvatarKey]  = useState(Date.now()); // bumped after upload to bust image cache

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        </View>
        <GuestView
          onLogin={() => router.push('/(auth)/login')}
          onRegister={() => router.push('/(auth)/register')}
        />
      </SafeAreaView>
    );
  }

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your photo library to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await doUpload(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow camera access to take a profile photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await doUpload(result.assets[0].uri);
    }
  };

  const doUpload = async (uri: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', { uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
      const result = await usersApi.uploadAvatarUri(formData);
      if (result?.success && result?.data) {
        updateUser(result.data);
        const newKey = Date.now();
        setAvatarKey(newKey);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (result) {
        // Upload reached server but returned non-success
        Alert.alert('Upload issue', result?.message || 'Profile picture could not be saved. Try again.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Network error — check your connection and try again.';
      Alert.alert('Upload failed', msg);
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    try {
      await usersApi.deleteAvatar();
      updateUser({ ...user, avatar: undefined });
      setAvatarKey(Date.now());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Could not remove profile picture.');
    }
  };

  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'ios') {
      const options = ['Take Photo', 'Choose from Library', ...(user.avatar ? ['Remove Photo'] : []), 'Cancel'];
      const destructiveIndex = user.avatar ? options.indexOf('Remove Photo') : -1;
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.indexOf('Cancel'), destructiveButtonIndex: destructiveIndex },
        (idx) => {
          if (options[idx] === 'Take Photo')           takePhoto();
          else if (options[idx] === 'Choose from Library') pickFromLibrary();
          else if (options[idx] === 'Remove Photo')    confirmRemove();
        }
      );
    } else {
      // Android: use Alert as a menu
      const buttons: any[] = [
        { text: 'Take Photo',            onPress: takePhoto },
        { text: 'Choose from Library',   onPress: pickFromLibrary },
        ...(user.avatar ? [{ text: 'Remove Photo', style: 'destructive', onPress: confirmRemove }] : []),
        { text: 'Cancel', style: 'cancel' },
      ];
      Alert.alert('Profile Photo', 'Choose an option', buttons);
    }
  };

  const confirmRemove = () => {
    Alert.alert('Remove Photo', 'Remove your profile picture?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: removeAvatar },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/welcome'); } },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        </View>

        {/* User card */}
        <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Tappable avatar */}
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8} style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              {user.avatar ? (
                <Image
                  key={avatarKey}
                  source={{ uri: getAvatarUri(user.avatar, avatarKey), cache: 'reload' }}
                  style={styles.avatarImg}
                  onError={() => {
                    // Image failed to load — fall back to initials by clearing local avatar reference
                    // (doesn't clear the store — just prevents broken image icon)
                  }}
                />
              ) : (
                <Text style={[styles.avatarInitials, { color: colors.textOnPrimary }]}>
                  {getInitials(user.name || 'U')}
                </Text>
              )}
            </View>

            {/* Camera overlay badge */}
            <View style={[styles.cameraBadge, { backgroundColor: colors.tertiary }]}>
              {uploading
                ? <ActivityIndicator size="small" color={colors.primaryDark} />
                : <Camera size={12} color={colors.primaryDark} />}
            </View>
          </TouchableOpacity>

          <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user.email}</Text>

          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.tertiary }]}
            onPress={() => router.push('/settings/edit-profile')}
          >
            <Text style={[styles.editBtnText, { color: colors.primaryDark }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Menu */}
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon={<CreditCard size={20} color={colors.tertiary} />}
            label="My Credits" value={`${user.creditsBalance || 0} credits`}
            onPress={() => router.push('/(tabs)/wallet')} />
          <MenuItem icon={<Heart size={20} color={colors.error} />}
            label="Favorites" onPress={() => router.push('/settings/favorites')} />
          <MenuItem icon={<Star size={20} color={colors.warning} />}
            label="My Reviews" onPress={() => router.push('/settings/reviews')} />
          <MenuItem icon={<Gift size={20} color={colors.tertiary} />}
            label="Referrals" onPress={() => router.push('/settings/referral')} />
        </View>

        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon={<Bell size={20} color={colors.text} />}
            label="Notifications" onPress={() => router.push('/settings/notifications')} />
          <MenuItem icon={<HelpCircle size={20} color={colors.text} />}
            label="Help & Support" onPress={() => router.push('/settings/help')} />
        </View>

        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon={<LogOut size={20} color={colors.error} />}
            label="Sign Out" onPress={handleLogout} danger />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
  },
  title:         { fontSize: 22, fontWeight: '700' },

  // Guest
  guestContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  guestIcon:      { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  guestTitle:     { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  guestSubtitle:  { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  primaryBtn: {
    width: '100%', paddingVertical: 15, borderRadius: 14,
    alignItems: 'center', marginTop: 8,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700' },
  outlineBtn: {
    width: '100%', paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', borderWidth: 1,
  },
  outlineBtnText: { fontSize: 15, fontWeight: '600' },

  // User card
  userCard: {
    alignItems: 'center', paddingVertical: 24,
    marginHorizontal: 16, borderRadius: 20, borderWidth: 1,
  },
  avatarWrap:  { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg:       { width: '100%', height: '100%', borderRadius: 44 },
  avatarInitials:  { fontSize: 30, fontWeight: '700' },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  userName:  { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  userEmail: { fontSize: 13, marginBottom: 16 },
  editBtn:   { paddingHorizontal: 24, paddingVertical: 9, borderRadius: 10 },
  editBtnText: { fontSize: 14, fontWeight: '600' },

  // Menu
  menuCard: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemIcon:  { width: 32, alignItems: 'center' },
  menuItemLabel: { flex: 1, fontSize: 15, fontWeight: '500', marginLeft: 10 },
  menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuItemValue: { fontSize: 13 },
});
