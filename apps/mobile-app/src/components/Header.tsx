import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../stores/auth.store';
import { BucrLogo } from './ui/BucrLogo';

interface HeaderProps {
  onMenuPress?: () => void;
  onProfilePress?: () => void;
  variant?: 'default' | 'transparent';
}

export const Header: React.FC<HeaderProps> = ({ onMenuPress, variant = 'default' }) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const isTransparent = variant === 'transparent';

  return (
    <View style={[styles.container, !isTransparent && { backgroundColor: colors.headerBackground }]}>
      <BucrLogo size={32} />

      <TouchableOpacity onPress={onMenuPress} style={styles.avatarButton} activeOpacity={0.7}>
        <View style={[styles.avatar, { backgroundColor: colors.tertiary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryDark }]}>
            {user?.name?.charAt(0)?.toUpperCase() || 'G'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  avatarButton: { padding: 2 },
  avatar: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700' },
});
