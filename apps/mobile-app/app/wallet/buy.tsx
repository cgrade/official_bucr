import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, CreditCard } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { creditsApi } from '../../src/lib/api';
import { formatMoney } from '../../src/lib/currency';
import { useAuthStore } from '../../src/stores/auth.store';
import { useTheme } from '../../src/contexts/ThemeContext';

// 1 credit = ₦10; purchase price = ₦10 × 1.06 = ₦10.60 per credit
const CREDIT_VALUE_NGN = 10;
const CREDIT_PURCHASE_PRICE_NGN = 10.6; // 6% spread

const CREDIT_PACKAGES = [
  { credits: 50,  price: Math.ceil(50  * CREDIT_PURCHASE_PRICE_NGN), popular: false },
  { credits: 100, price: Math.ceil(100 * CREDIT_PURCHASE_PRICE_NGN), popular: true  },
  { credits: 200, price: Math.ceil(200 * CREDIT_PURCHASE_PRICE_NGN), popular: false },
  { credits: 500, price: Math.ceil(500 * CREDIT_PURCHASE_PRICE_NGN), popular: false },
];

export default function BuyCreditsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { refreshBalance } = useAuthStore();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(100);

  const purchaseMutation = useMutation({
    mutationFn: (credits: number) => creditsApi.initializePurchase(credits),
    onSuccess: async (data) => {
      if (data.authorizationUrl) {
        const supported = await Linking.canOpenURL(data.authorizationUrl);
        if (supported) {
          await Linking.openURL(data.authorizationUrl);
          setTimeout(() => {
            refreshBalance();
          }, 5000);
        } else {
          Alert.alert('Error', 'Cannot open payment page');
        }
      }
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to initialize purchase';
      Alert.alert('Error', msg);
    },
  });

  const handlePurchase = () => {
    if (!selectedPackage) {
      Alert.alert('Select Package', 'Please select a credit package');
      return;
    }
    purchaseMutation.mutate(selectedPackage);
  };

  const selectedPrice = CREDIT_PACKAGES.find(p => p.credits === selectedPackage)?.price || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Buy Credits</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.inputBackground }]}>
          <CreditCard size={24} color={colors.tertiary} />
          <View style={styles.infoText}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Bucr Credits</Text>
            <Text style={[styles.infoSubtitle, { color: colors.textSecondary }]}>1 credit = {formatMoney(CREDIT_VALUE_NGN)} value • ₦{CREDIT_PURCHASE_PRICE_NGN.toFixed(2)} to buy</Text>
          </View>
        </View>

        {/* Packages */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Package</Text>
        <View style={styles.packages}>
          {CREDIT_PACKAGES.map((pkg) => (
            <TouchableOpacity
              key={pkg.credits}
              style={[
                styles.packageCard,
                { backgroundColor: colors.inputBackground, borderColor: colors.border },
                selectedPackage === pkg.credits && { borderColor: colors.tertiary, backgroundColor: colors.tertiaryLight },
              ]}
              onPress={() => setSelectedPackage(pkg.credits)}
            >
              {pkg.popular && (
                <View style={[styles.popularBadge, { backgroundColor: colors.tertiary }]}>
                  <Text style={[styles.popularText, { color: colors.primaryDark }]}>Popular</Text>
                </View>
              )}
              <Text style={[styles.packageCredits, { color: colors.text }]}>{pkg.credits} credits</Text>
              <Text style={[styles.packagePrice, { color: colors.tertiary }]}>₦{pkg.price.toLocaleString()}</Text>
              <Text style={[styles.packageValue, { color: colors.textMuted }]}>{formatMoney(pkg.credits * CREDIT_VALUE_NGN)} value</Text>
              {selectedPackage === pkg.credits && (
                <View style={[styles.checkMark, { backgroundColor: colors.tertiary }]}>
                  <Check size={16} color={colors.primaryDark} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* How it works */}
        <View style={[styles.howItWorks, { backgroundColor: colors.card }]}>
          <Text style={[styles.howItWorksTitle, { color: colors.text }]}>How credits work</Text>
          <Text style={[styles.howItWorksItem, { color: colors.textSecondary }]}>✓ Use credits to book reservations</Text>
          <Text style={[styles.howItWorksItem, { color: colors.textSecondary }]}>✓ Credits refunded + 3% bonus when you check in</Text>
          <Text style={[styles.howItWorksItem, { color: colors.textSecondary }]}>✓ Credits valid for 90 days</Text>
          <Text style={[styles.howItWorksItem, { color: colors.textSecondary }]}>✓ Secure payment via Paystack</Text>
        </View>
      </ScrollView>

      {/* Purchase Button */}
      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.footerInfo}>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.footerPrice, { color: colors.text }]}>₦{selectedPrice.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.purchaseButton, { backgroundColor: colors.tertiary }, purchaseMutation.isPending && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchaseMutation.isPending || !selectedPackage}
        >
          {purchaseMutation.isPending ? (
            <ActivityIndicator color="#070f1e" />
          ) : (
            <Text style={styles.purchaseButtonText}>Continue to Payment</Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  packages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  packageCard: {
    width: '48%',
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  packageCardSelected: {},
  popularBadge: {
    position: 'absolute',
    top: -10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#070f1e',
  },
  packageCredits: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  packageValue: {
    fontSize: 12,
    marginTop: 2,
  },
  checkMark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howItWorks: {
    padding: 16,
    borderRadius: 16,
  },
  howItWorksTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  howItWorksItem: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  footerLabel: {
    fontSize: 14,
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: '700',
  },
  purchaseButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#070f1e',
  },
});
