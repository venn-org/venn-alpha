import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Animated, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../lib/theme';
import { sendPhoneOtp, setupRecaptcha, canSendPhoneOtp, isValidIndianPhone } from '../../lib/auth';

export default function Phone() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [spamWarning, setSpamWarning] = useState('');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams();

  const slideY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: false }),
      Animated.spring(slideY,  { toValue: 0, friction: 9, tension: 55, useNativeDriver: false }),
    ]).start();
  }, []);

  // Set up invisible reCAPTCHA on web (required by Firebase phone auth)
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Slight delay to ensure the button element is in the DOM
      const t = setTimeout(() => setupRecaptcha('phone-send-btn'), 500);
      return () => clearTimeout(t);
    }
  }, []);

  // Live spam-check feedback as the user types
  useEffect(() => {
    if (phone.length === 10 && isValidIndianPhone(phone)) {
      const check = canSendPhoneOtp(phone);
      setSpamWarning(check.allowed ? '' : check.reason);
    } else {
      setSpamWarning('');
    }
  }, [phone]);

  async function handleContinue() {
    setLoading(true);
    setSpamWarning('');
    try {
      const confirmationResult = await sendPhoneOtp(phone);
      // Pass the confirmation result to the OTP screen via global
      // (expo-router params can't hold objects)
      globalThis.__vennPhoneConfirmation = confirmationResult;
      router.push(`/(auth)/phone-otp?phone=${phone}&mode=${mode ?? ''}`);
    } catch (e) {
      const msg = e.message || 'Something went wrong. Check your connection.';
      if (msg.includes('Too many') || msg.includes('wait')) {
        setSpamWarning(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.statusBar}>
        <Text style={styles.step}>STEP 1 OF 5</Text>
      </View>
      <View style={styles.progressTrack}>
        <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: '20%' }]} />
      </View>

      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.body, { opacity, transform: [{ translateY: slideY }] }]}>
        <Text style={styles.title}>What's your phone number?</Text>
        <Text style={styles.subtitle}>We only use this to verify it's you. It won't appear on your profile.</Text>

        <View style={styles.inputRow}>
          <View style={styles.countryCode}>
            <Text style={styles.flag}>🇮🇳</Text>
            <Text style={styles.dialCode}>+91</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Phone number"
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={v => setPhone(v.replace(/\D/g, ''))}
            autoFocus
          />
        </View>

        {spamWarning ? (
          <Text style={styles.warningText}>{spamWarning}</Text>
        ) : (
          <Text style={styles.hint}>Venn will send you a verification code. Standard rates may apply.</Text>
        )}

        {/* Spam protection info */}
        <View style={styles.protectionRow}>
          <Text style={styles.protectionIcon}>🛡️</Text>
          <Text style={styles.protectionText}>Protected by reCAPTCHA · Max 5 codes per day</Text>
        </View>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          id="phone-send-btn"
          nativeID="phone-send-btn"
          style={[styles.btn, (phone.length < 10 || !!spamWarning) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={phone.length < 10 || loading || !!spamWarning}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{loading ? 'Sending…' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  statusBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 28, paddingTop: 14 },
  step: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: colors.placeholder, letterSpacing: 1.2 },
  progressTrack: { height: 3, backgroundColor: 'rgba(0,0,0,0.08)', marginHorizontal: 28, marginTop: 14, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 16, marginTop: 4 },
  backArrow: { fontSize: 28, color: colors.ink, lineHeight: 32 },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, letterSpacing: -1, lineHeight: 38, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 32 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 },
  countryCode: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.inputBg, borderRadius: 14, paddingHorizontal: 14, height: 56 },
  flag: { fontSize: 20 },
  dialCode: { fontSize: 16, fontWeight: '500', color: colors.ink },
  input: { flex: 1, backgroundColor: colors.inputBg, borderRadius: 14, paddingHorizontal: 18, height: 56, fontSize: 16, color: colors.ink, borderWidth: 2, borderColor: 'transparent' },
  hint: { fontSize: 12, color: colors.placeholder, textAlign: 'center', marginTop: 8 },
  warningText: { fontSize: 13, color: colors.error, textAlign: 'center', marginTop: 8, fontWeight: '500' },
  protectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, opacity: 0.6 },
  protectionIcon: { fontSize: 12 },
  protectionText: { fontSize: 11, color: colors.placeholder },
  footer: { paddingHorizontal: 28, paddingTop: 12 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
