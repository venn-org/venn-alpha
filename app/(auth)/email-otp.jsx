import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

export default function EmailOtp() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  // Resend cooldown — a code was just sent to reach this screen, and spamming
  // resend runs straight into Supabase's rate limit with a cryptic error.
  const [cooldown, setCooldown] = useState(30);
  const inputs = useRef([]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email, mode } = useLocalSearchParams();

  const slideY  = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const shakeX  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: false }),
      Animated.spring(slideY,  { toValue: 0, friction: 9, tension: 55, useNativeDriver: false }),
    ]).start();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function shake() {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue:  10, duration: 50, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue:  -8, duration: 50, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue:   8, duration: 50, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue:   0, duration: 40, useNativeDriver: false }),
    ]).start();
  }

  function handleChange(val, idx) {
    const cleaned = val.replace(/\D/g, '');
    const next = [...otp];
    if (cleaned.length > 1) {
      // Pasted or autofilled multi-digit code — distribute across the boxes.
      for (let i = 0; i < cleaned.length && idx + i < 6; i++) next[idx + i] = cleaned[i];
      setOtp(next);
      inputs.current[Math.min(idx + cleaned.length, 5)]?.focus();
      return;
    }
    next[idx] = cleaned;
    setOtp(next);
    if (cleaned && idx < 5) inputs.current[idx + 1]?.focus();
  }

  function handleKeyPress(e, idx) {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  }

  async function handleVerify() {
    setLoading(true);
    const token = otp.join('');
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) {
      shake();
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }
    // Navigate directly instead of relying solely on _layout's auth-state
    // listener to redirect — that listener can race with this screen and
    // leave the user stuck here until a manual reload.
    const uid = data?.session?.user?.id;
    if (uid) {
      const { data: p, error: profileError } = await supabase.from('profiles').select('onboarding_done').eq('id', uid).single();
      if (profileError) {
        Alert.alert('Could not load profile', profileError.message);
      } else {
        router.replace(p?.onboarding_done ? '/(tabs)/feed' : '/(onboarding)/name');
      }
    }
    setLoading(false);
  }

  async function handleResend() {
    if (cooldown > 0) return;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: mode !== 'signin' },
    });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setCooldown(30);
      Alert.alert('Code resent', `A new code was sent to ${email}.`);
    }
  }

  const complete = otp.every(d => d !== '');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.body, { opacity, transform: [{ translateY: slideY }] }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoWrap}>
            <View style={[styles.circle, { backgroundColor: colors.blue, left: 0 }]} />
            <View style={[styles.circle, { backgroundColor: colors.violet, right: 0, opacity: 0.9 }]} />
          </View>
        </View>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.subtitle}>Sent to {email}</Text>

        <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeX }] }]}>
          {otp.map((d, i) => (
            <TextInput
              key={i}
              ref={r => inputs.current[i] = r}
              style={[styles.otpBox, d && styles.otpBoxFilled]}
              value={d}
              onChangeText={v => handleChange(v, i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              selectTextOnFocus
              autoFocus={i === 0}
            />
          ))}
        </Animated.View>

        <TouchableOpacity onPress={handleResend} disabled={cooldown > 0}>
          <Text style={[styles.resend, cooldown > 0 && { color: colors.placeholder }]}>
            {cooldown > 0 ? `RESEND CODE IN ${cooldown}S` : 'RESEND CODE'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.btn, !complete && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={!complete || loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtn}>
            <Text style={styles.btnText}>{loading ? 'Verifying…' : 'Verify & sign in'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 16, marginTop: 14 },
  backArrow: { fontSize: 28, color: colors.ink, lineHeight: 32 },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  logoRow: { marginBottom: 24 },
  logoWrap: { width: 32, height: 20, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 20, height: 20, borderRadius: 10 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26, color: colors.ink, letterSpacing: -0.8, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.placeholder, marginBottom: 32 },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 24 },
  otpBox: { width: 36, height: 52, borderRadius: 10, backgroundColor: colors.inputBg, borderWidth: 2, borderColor: 'transparent', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, textAlign: 'center', color: colors.ink },
  otpBoxFilled: { borderColor: colors.blue, backgroundColor: '#fff' },
  resend: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, letterSpacing: 1.2, color: colors.blue, textAlign: 'center' },
  footer: { paddingHorizontal: 28, paddingTop: 12 },
  btn: { borderRadius: 50, overflow: 'hidden' },
  btnDisabled: { opacity: 0.32 },
  gradientBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 50 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
