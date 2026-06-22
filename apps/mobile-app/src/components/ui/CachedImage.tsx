import React from 'react';
import { Image, ImageProps } from 'expo-image';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { config } from '../../lib/config';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string | null | undefined;
  fallback?: React.ReactNode;
  containerStyle?: ViewStyle;
}

// Blurhash placeholder for loading state
const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export function CachedImage({
  uri,
  fallback,
  containerStyle,
  style,
  ...props
}: CachedImageProps) {
  const { colors } = useTheme();

  if (!uri) {
    return fallback ? (
      <View style={[styles.fallbackContainer, containerStyle]}>
        {fallback}
      </View>
    ) : null;
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      placeholder={blurhash}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
      {...props}
    />
  );
}

interface VendorImageProps {
  logo?: string | null;
  coverImage?: string | null;
  businessName: string;
  size?: number;
  style?: ViewStyle;
}

export function VendorImage({
  logo,
  coverImage,
  businessName,
  size = 48,
  style,
}: VendorImageProps) {
  const { colors } = useTheme();
  const imageUri = logo || coverImage;
  const fullUri = imageUri
    ? imageUri.startsWith('http')
      ? imageUri
      : `${config.apiUrl}${imageUri}`
    : null;

  if (!fullUri) {
    return (
      <View
        style={[
          styles.placeholder,
          { width: size, height: size, backgroundColor: colors.border },
          style,
        ]}
      >
        <View style={[styles.placeholderText, { backgroundColor: colors.primary }]}>
          <View style={styles.initial}>
            <Image
              source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(businessName)}&background=3B82F6&color=fff&size=${size * 2}` }}
              style={{ width: size, height: size }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <CachedImage
      uri={fullUri}
      style={[{ width: size, height: size, borderRadius: size * 0.2 }, style]}
    />
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholderText: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    width: '100%',
    height: '100%',
  },
});
