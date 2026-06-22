import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Trash2, ChevronRight, Lock, Bell } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, usersApi } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/auth.store';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function EditProfileScreen() {
  const router      = useRouter();
  const { colors }  = useTheme();
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [name,     setName]     = useState(user?.name  || '');
  const [phone,    setPhone]    = useState(user?.phone || '');
  const [email]                 = useState(user?.email || '');
  const [avatar,   setAvatar]   = useState(user?.avatar || null);
  const [uploading, setUploading] = useState(false);

  const updateProfile = useMutation({
    mutationFn: (data: { name?: string; phone?: string }) => authApi.updateProfile(data),
    onSuccess: (response) => {
      if (response.success && response.data) {
        updateUser(response.data);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Saved', 'Your profile has been updated.');
        router.back();
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update profile');
    },
  });

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    if (phone && !/^\+?[1-9]\d{9,14}$/.test(phone.replace(/\s/g, ''))) {
      Alert.alert('Error', 'Please enter a valid phone number'); return;
    }
    updateProfile.mutate({ name: name.trim(), phone: phone.trim() || undefined });
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your photo library to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) doUpload(result.assets[0].uri);
  };

  const doUpload = async (uri: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', { uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
      const result = await usersApi.uploadAvatarUri(formData);
      if (result?.success && result?.data) {
        setAvatar(result.data.avatar);
        updateUser(result.data);
        queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert('Upload failed', 'Could not update profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const confirmRemove = () => {
    Alert.alert('Remove Photo', 'Remove your profile picture?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await usersApi.deleteAvatar();
            setAvatar(null);
            updateUser({ ...user, avatar: undefined });
            queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
          } catch { Alert.alert('Error', 'Failed to remove profile picture'); }
        },
      },
    ]);
  };

  function SectionRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.borderLight }]}
        onPress={onPress} activeOpacity={0.7}
      >
        <View style={[styles.rowIcon, { backgroundColor: colors.inputBackground }]}>{icon}</View>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        <ChevronRight size={16} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={updateProfile.isPending}>
          {updateProfile.isPending
            ? <ActivityIndicator size="small" color={colors.tertiary} />
            : <Text style={[styles.saveText, { color: colors.tertiary }]}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Avatar card */}
        <View style={[styles.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.avatarWrap}>
            {avatar
              ? <Image source={{ uri: avatar }} style={styles.avatarImg} />
              : (
                <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.avatarInitial, { color: colors.textOnPrimary }]}>
                    {name ? name.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}
            {uploading && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.avatarBtns}>
            <TouchableOpacity
              style={[styles.avatarBtn, { backgroundColor: colors.tertiary }]}
              onPress={pickImage} disabled={uploading}
            >
              <Camera size={15} color={colors.primaryDark} />
              <Text style={[styles.avatarBtnTxt, { color: colors.primaryDark }]}>Change Photo</Text>
            </TouchableOpacity>
            {avatar && (
              <TouchableOpacity
                style={[styles.avatarBtn, { backgroundColor: colors.errorLight }]}
                onPress={confirmRemove} disabled={uploading}
              >
                <Trash2 size={15} color={colors.error} />
                <Text style={[styles.avatarBtnTxt, { color: colors.error }]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Personal Info */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Personal Information</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.field, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Name</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text }]}
              value={name} onChangeText={setName}
              placeholder="Your full name" placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={[styles.field, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Phone</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text }]}
              value={phone} onChangeText={setPhone}
              placeholder="+234 800 000 0000" placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Email</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.textMuted }]}
              value={email} editable={false} placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.fieldHint, { color: colors.textMuted }]}>Email cannot be changed</Text>
          </View>
        </View>

        {/* Account Security */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Account Security</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionRow
            icon={<Lock size={15} color={colors.tertiary} />}
            label="Change Password"
            onPress={() => router.push('/settings/change-password' as any)}
          />
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Preferences</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionRow
            icon={<Bell size={15} color={colors.tertiary} />}
            label="Notification Settings"
            onPress={() => router.push('/settings/notifications')}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.hairlineWidth;
const styles = StyleSheet.create({
  container:     { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn:       { padding: 4 },
  title:         { fontSize: 17, fontWeight: '600' },
  saveText:      { fontSize: 16, fontWeight: '700' },
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1.2, marginBottom: 8, marginLeft: 4, marginTop: 20,
  },
  card:          { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },

  // Avatar
  avatarCard: {
    borderRadius: 20, borderWidth: 1,
    paddingVertical: 24, alignItems: 'center', gap: 16,
  },
  avatarWrap:    { position: 'relative' },
  avatarImg:     { width: 96, height: 96, borderRadius: 48 },
  avatarFallback:{
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 34, fontWeight: '700' },
  avatarOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 48, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBtns:    { flexDirection: 'row', gap: 10 },
  avatarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  avatarBtnTxt:  { fontSize: 13, fontWeight: '600' },

  // Fields
  field: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: S,
  },
  fieldLabel:    { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  fieldInput:    { fontSize: 15, paddingVertical: 0 },
  fieldHint:     { fontSize: 11, marginTop: 4 },

  // Section rows
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: S, gap: 12,
  },
  rowIcon:       { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel:      { flex: 1, fontSize: 15, fontWeight: '500' },
});
