import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapPin, Utensils, CreditCard } from 'lucide-react-native';
import { BucrLogo } from '../../src/components/ui/BucrLogo';

const { width } = Dimensions.get('window');

const FEATURES = [
  { icon: MapPin,      title: 'Discover',  description: 'Find amazing restaurants in Abuja' },
  { icon: Utensils,    title: 'Reserve',   description: 'Book tables instantly with credits' },
  { icon: CreditCard,  title: 'Earn Back', description: 'Full refund + 3% bonus when you show up' },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <BucrLogo size={38} />
            <Text style={styles.tagline}>Your table, actually waiting.</Text>
          </View>

          {/* Features */}
          <View style={styles.features}>
            {FEATURES.map((feature, index) => (
              <View key={index} style={[styles.featureItem, index < FEATURES.length - 1 && styles.featureItemBorder]}>
                <View style={styles.featureIcon}>
                  <feature.icon size={22} color="#c9a84c" />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.signInButton} onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.createAccountButton} onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.createAccountButtonText}>Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.guestButton} onPress={() => router.replace('/(tabs)')}>
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#070f1e' },
  safeArea:           { flex: 1 },
  content:            { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingVertical: 40 },
  logoContainer:      { alignItems: 'center', marginTop: 40, gap: 12 },
  tagline:            { fontSize: 15, color: 'rgba(245,240,232,0.6)', letterSpacing: 0.3 },
  features: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
  },
  featureItem:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  featureItemBorder:  { borderBottomWidth: 1, borderBottomColor: 'rgba(201,168,76,0.1)' },
  featureIcon: {
    width: 44, height: 44,
    backgroundColor: 'rgba(201,168,76,0.1)',
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  featureText:        { marginLeft: 16, flex: 1 },
  featureTitle:       { fontSize: 15, fontWeight: '600', color: '#f5f0e8', marginBottom: 3 },
  featureDescription: { fontSize: 13, color: 'rgba(245,240,232,0.55)', lineHeight: 18 },
  actions:            { gap: 12 },
  signInButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  signInButtonText:   { fontSize: 16, fontWeight: '700', color: '#070f1e' },
  createAccountButton: {
    backgroundColor: 'transparent',
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(201,168,76,0.5)',
  },
  createAccountButtonText: { fontSize: 16, fontWeight: '600', color: '#f5f0e8' },
  guestButton:        { paddingVertical: 12, alignItems: 'center' },
  guestButtonText:    { fontSize: 14, fontWeight: '500', color: 'rgba(245,240,232,0.45)' },
});
