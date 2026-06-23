import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, CheckSquare, Square, Check, X } from 'lucide-react-native';
import { BucrLogo } from '../../src/components/ui/BucrLogo';
import { useAuthStore } from '../../src/stores/auth.store';
import { useTheme } from '../../src/contexts/ThemeContext';

// Mirrors the backend validators exactly so users never get a server rejection
// they couldn't see coming.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Country drives the phone format + the default display currency. The credit
// base stays ₦10 (NGN) everywhere — currency here is presentation only.
const COUNTRY_OPTIONS = [
  { name: 'Nigeria', dialCode: '+234', regex: /^(\+234|0)[789][01]\d{8}$/, placeholder: '0801 234 5678', currencyCode: 'NGN', symbol: '₦' },
  { name: 'Ghana',   dialCode: '+233', regex: /^(\+233|0)[235]\d{8}$/,     placeholder: '024 123 4567',  currencyCode: 'GHS', symbol: 'GH₵' },
  { name: 'Kenya',   dialCode: '+254', regex: /^(\+254|0)[17]\d{8}$/,      placeholder: '0712 345 678',  currencyCode: 'KES', symbol: 'KSh' },
];

type FieldKey = 'name' | 'email' | 'phone' | 'password' | 'confirm';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const { colors } = useTheme();

  const [country, setCountry] = useState('Nigeria');
  const countryCfg = COUNTRY_OPTIONS.find((c) => c.name === country) ?? COUNTRY_OPTIONS[0];
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    name: false, email: false, phone: false, password: false, confirm: false,
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Live password requirement checks ────────────────────────────────────
  const pwChecks = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  }), [password]);
  const pwScore = Object.values(pwChecks).filter(Boolean).length;
  const pwStrength =
    pwScore <= 1 ? { label: 'Weak', color: colors.error, pct: 0.25 }
    : pwScore === 2 ? { label: 'Fair', color: colors.warning, pct: 0.5 }
    : pwScore === 3 ? { label: 'Good', color: colors.warning, pct: 0.75 }
    : { label: 'Strong', color: colors.success, pct: 1 };

  // ── Per-field validation ────────────────────────────────────────────────
  const errors: Partial<Record<FieldKey, string>> = {};
  if (!name.trim()) errors.name = 'Enter your full name';
  else if (name.trim().length < 2) errors.name = 'Name is too short';
  if (!email.trim()) errors.email = 'Enter your email';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!phone.trim()) errors.phone = 'Enter your phone number';
  else if (!countryCfg.regex.test(phone.trim().replace(/\s/g, ''))) errors.phone = `Enter a valid ${country} number (e.g. ${countryCfg.placeholder.replace(/\s/g, '')})`;
  if (pwScore < 4) errors.password = 'Password does not meet all requirements';
  if (!confirm) errors.confirm = 'Re-enter your password';
  else if (confirm !== password) errors.confirm = 'Passwords do not match';

  const isValid = Object.keys(errors).length === 0 && consentGiven;

  const markTouched = (f: FieldKey) => setTouched((t) => ({ ...t, [f]: true }));
  const showErr = (f: FieldKey) => touched[f] && errors[f];

  const handleRegister = async () => {
    setTouched({ name: true, email: true, phone: true, password: true, confirm: true });
    setSubmitError(null);
    if (!consentGiven) {
      setSubmitError('Please agree to the Terms of Service and Privacy Policy to continue');
      return;
    }
    if (Object.keys(errors).length > 0) return;

    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim().replace(/\s/g, ''),
        password,
        country,
      });
      router.replace('/onboarding' as any);
    } catch (err: any) {
      setSubmitError(err.message || 'Registration failed. Please try again.');
    }
  };

  const borderFor = (f: FieldKey) =>
    showErr(f) ? colors.error : colors.border;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.brandRow}>
            <BucrLogo size={34} />
          </View>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Create your account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Join Bucr to book tables that are actually waiting for you.
            </Text>
          </View>

          {submitError && (
            <View style={[styles.errorContainer, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{submitError}</Text>
            </View>
          )}

          <View style={styles.form}>
            {/* Country — drives phone format + display currency */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Country</Text>
              <View style={styles.countryRow}>
                {COUNTRY_OPTIONS.map((c) => {
                  const active = country === c.name;
                  return (
                    <TouchableOpacity
                      key={c.name}
                      style={[
                        styles.countryChip,
                        { borderColor: active ? colors.tertiary : colors.border, backgroundColor: active ? colors.tertiaryLight : colors.inputBackground },
                      ]}
                      onPress={() => setCountry(c.name)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.countryChipText, { color: active ? colors.tertiary : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.countryHint, { color: colors.textMuted }]}>
                Sets your phone format · prices shown in {countryCfg.symbol} {countryCfg.currencyCode}
              </Text>
            </View>

            {/* Name */}
            <Field label="Full Name" error={showErr('name') ? errors.name : undefined} colors={colors}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: borderFor('name'), color: colors.text }]}
                placeholder="John Doe"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
                onBlur={() => markTouched('name')}
              />
            </Field>

            {/* Email */}
            <Field label="Email" error={showErr('email') ? errors.email : undefined} colors={colors}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: borderFor('email'), color: colors.text }]}
                placeholder="your@email.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                onBlur={() => markTouched('email')}
              />
            </Field>

            {/* Phone — format follows the chosen country */}
            <Field label="Phone Number" error={showErr('phone') ? errors.phone : undefined} colors={colors}>
              <View style={styles.phoneRow}>
                <View style={[styles.dialCode, { backgroundColor: colors.inputBackground, borderColor: borderFor('phone') }]}>
                  <Text style={[styles.dialCodeText, { color: colors.tertiary }]}>{countryCfg.dialCode}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput, { backgroundColor: colors.inputBackground, borderColor: borderFor('phone'), color: colors.text }]}
                  placeholder={countryCfg.placeholder}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  onBlur={() => markTouched('phone')}
                />
              </View>
            </Field>

            {/* Password */}
            <Field label="Password" error={undefined} colors={colors}>
              <View style={[styles.passwordContainer, { backgroundColor: colors.inputBackground, borderColor: borderFor('password') }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder="Create a strong password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onBlur={() => markTouched('password')}
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
                </TouchableOpacity>
              </View>

              {/* Strength meter */}
              {password.length > 0 && (
                <View style={styles.strengthWrap}>
                  <View style={[styles.strengthTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.strengthFill, { width: `${pwStrength.pct * 100}%`, backgroundColor: pwStrength.color }]} />
                  </View>
                  <Text style={[styles.strengthLabel, { color: pwStrength.color }]}>{pwStrength.label}</Text>
                </View>
              )}

              {/* Requirements checklist */}
              {(touched.password || password.length > 0) && (
                <View style={styles.reqList}>
                  <Req ok={pwChecks.length} text="At least 8 characters" colors={colors} />
                  <Req ok={pwChecks.upper} text="One uppercase letter" colors={colors} />
                  <Req ok={pwChecks.lower} text="One lowercase letter" colors={colors} />
                  <Req ok={pwChecks.number} text="One number" colors={colors} />
                </View>
              )}
            </Field>

            {/* Confirm password */}
            <Field label="Confirm Password" error={showErr('confirm') ? errors.confirm : undefined} colors={colors}>
              <View style={[styles.passwordContainer, { backgroundColor: colors.inputBackground, borderColor: borderFor('confirm') }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder="Re-enter your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showConfirm}
                  value={confirm}
                  onChangeText={setConfirm}
                  onBlur={() => markTouched('confirm')}
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
                </TouchableOpacity>
              </View>
            </Field>
          </View>

          {/* NDPA consent */}
          <TouchableOpacity style={styles.consentRow} onPress={() => setConsentGiven(!consentGiven)} activeOpacity={0.7}>
            {consentGiven ? <CheckSquare size={20} color={colors.tertiary} /> : <Square size={20} color={colors.border} />}
            <Text style={[styles.consentText, { color: colors.textMuted }]}>
              I agree to Bucr's{' '}
              <Text style={{ color: colors.tertiary }} onPress={() => router.push('/settings/terms')}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={{ color: colors.tertiary }} onPress={() => router.push('/settings/privacy-policy')}>Privacy Policy</Text>
              . I understand my data is processed per the Nigeria Data Protection Act 2023.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: isValid ? colors.tertiary : colors.border }, isLoading && styles.submitButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading || !isValid}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primaryDark} />
            ) : (
              <Text style={[styles.submitButtonText, { color: isValid ? colors.primaryDark : colors.textMuted }]}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={[styles.loginLink, { color: colors.tertiary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, error, colors, children }: { label: string; error?: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      {children}
      {error ? <Text style={[styles.fieldError, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

function Req({ ok, text, colors }: { ok: boolean; text: string; colors: any }) {
  return (
    <View style={styles.reqRow}>
      {ok ? <Check size={14} color={colors.success} /> : <X size={14} color={colors.textMuted} />}
      <Text style={[styles.reqText, { color: ok ? colors.success : colors.textMuted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24 },
  backButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  brandRow: { alignItems: 'center', marginBottom: 20 },
  header: { marginBottom: 28 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  errorContainer: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20 },
  errorText: { fontSize: 14, textAlign: 'center' },
  form: { marginBottom: 12 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  fieldError: { fontSize: 12, marginTop: 6 },
  countryRow: { flexDirection: 'row', gap: 8 },
  countryChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  countryChipText: { fontSize: 14 },
  countryHint: { fontSize: 11, marginTop: 8 },
  phoneRow: { flexDirection: 'row', gap: 8 },
  dialCode: { justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1, borderRadius: 14 },
  dialCodeText: { fontSize: 15, fontWeight: '600' },
  phoneInput: { flex: 1 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14 },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  eyeButton: { padding: 14 },
  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  strengthTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  strengthFill: { height: 6, borderRadius: 3 },
  strengthLabel: { fontSize: 12, fontWeight: '600', width: 52, textAlign: 'right' },
  reqList: { marginTop: 10, gap: 6 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqText: { fontSize: 12 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20, marginTop: 8 },
  consentText: { flex: 1, fontSize: 12, lineHeight: 18 },
  submitButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: '600' },
});
