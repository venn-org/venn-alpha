import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../lib/theme';
import { sendEmailLink } from '../../lib/auth';

export default function EmailSignIn() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
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

  async function handleSend() {
    setLoading(true);
    setError('');
    try {
      await sendEmailLink(email);
      setSent(true);
    } catch (e) {
      setError(e.message || 'Something went wrong. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  const valid = email.includes('@') && email.includes('.');

  if (sent) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>

        <View style={styles.sentBody}>
          <View style={styles.logoRow}>
            <View style={styles.logoWrap}>
              <View style={[styles.circle, { backgroundColor: colors.blue, left: 0 }]} />
              <View style={[styles.circle, { backgroundColor: colors.violet, right: 0, opacity: 0.9 }]} />
            </View>
          </View>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.sentSubtitle}>
            We sent a sign-in link to{'\n'}
            <Text style={{ fontWeight: '700', color: colors.ink }}>{email}</Text>
          </Text>
          <Text style={styles.sentHint}>
            Click the link in the email to sign in. You can close this screen — the link will bring you back.
          </Text>

          <TouchableOpacity
            style={[styles.resendBtn, loading && styles.btnDisabled]}
            onPress={handleSend}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.resendBtnText}>{loading ? 'Sending…' : 'Resend link'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        <Text style={styles.title}>What's your email?</Text>
        <Text style={styles.subtitle}>We'll send you a magic link to sign in — no password needed.</Text>

        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor={colors.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          autoFocus
        />
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.btn, !valid && styles.btnDisabled]}
          onPress={handleSend}
          disabled={!valid || loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtn}>
            <Text style={styles.btnText}>{loading ? 'Sending…' : 'Send sign-in link'}</Text>
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
  subtitle: { fontSize: 14, color: colors.placeholder, marginBottom: 28 },
  input: { backgroundColor: colors.inputBg, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 17, fontSize: 16, color: colors.ink, borderWidth: 2, borderColor: 'transparent' },
  footer: { paddingHorizontal: 28, paddingTop: 12 },
  btn: { borderRadius: 50, overflow: 'hidden' },
  btnDisabled: { opacity: 0.32 },
  gradientBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 50 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#e02020', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  // "Check your email" state
  sentBody: { flex: 1, paddingHorizontal: 28, paddingTop: 20, alignItems: 'center', justifyContent: 'center' },
  sentSubtitle: { fontSize: 16, color: colors.slate, textAlign: 'center', lineHeight: 24, marginBottom: 12 },
  sentHint: { fontSize: 13, color: colors.placeholder, textAlign: 'center', lineHeight: 20, marginBottom: 32, paddingHorizontal: 12 },
  resendBtn: { borderRadius: 50, paddingVertical: 14, paddingHorizontal: 36, borderWidth: 1.5, borderColor: colors.mist },
  resendBtnText: { fontSize: 14, fontWeight: '600', color: colors.ink },
});
