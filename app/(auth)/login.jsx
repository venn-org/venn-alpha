import { useEffect, useRef, useState } from 'react';
import { Alert, ImageBackground, View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { signInWithGoogle, ensureProfile, isOnboardingComplete } from '../../lib/auth';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const topOpacity = useRef(new Animated.Value(0)).current;
  const topY       = useRef(new Animated.Value(-20)).current;
  const bottomY    = useRef(new Animated.Value(40)).current;
  const bottomOp   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(topOpacity, { toValue: 1, duration: 700, delay: 100, useNativeDriver: false }),
      Animated.spring(topY,       { toValue: 0, friction: 8, tension: 40, delay: 100, useNativeDriver: false }),
      Animated.timing(bottomOp,   { toValue: 1, duration: 600, delay: 500, useNativeDriver: false }),
      Animated.spring(bottomY,    { toValue: 0, friction: 8, tension: 40, delay: 500, useNativeDriver: false }),
    ]).start();
  }, []);

  async function handleGoogleSignIn() {
    if (loading) return;
    setLoading(true);
    try {
      await signInWithGoogle();
      await ensureProfile();
      const done = await isOnboardingComplete();
      router.replace(done ? '/(tabs)/feed' : '/(onboarding)/name');
    } catch (e) {
      Alert.alert('Could not sign in', e.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.frame}>
      <ImageBackground source={require('../../assets/hero.jpeg')} style={styles.bg} imageStyle={styles.bgImage} resizeMode="cover">
        {/* grain effect */}
        <View style={styles.grain} />
        {/* gradients */}
        <View style={styles.topFade} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.72)', 'rgba(0,0,0,0.92)']}
          style={styles.bottomFade}
        />

        {/* top: logo + headline */}
        <Animated.View style={[styles.top, { paddingTop: insets.top + 40 }, { opacity: topOpacity, transform: [{ translateY: topY }] }]}>
          <View style={styles.logoWrap}>
            <View style={[styles.circle, { backgroundColor: colors.blue, left: 0 }]} />
            <View style={[styles.circle, { backgroundColor: colors.violet, right: 0, opacity: 0.92 }]} />
          </View>
          <Text style={styles.appName}>Venn</Text>
          <Text style={styles.headline}>Find where your lives{'\n'}overlap.</Text>
          <Text style={styles.tagline}>The flatmate app designed to be deleted.</Text>
          <Text style={styles.launchNote}>Launching this Sunday 🚀</Text>
        </Animated.View>

        {/* bottom: buttons */}
        <Animated.View style={[styles.bottom, { paddingBottom: insets.bottom + 32 }, { opacity: bottomOp, transform: [{ translateY: bottomY }] }]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtn}>
              <Text style={styles.primaryBtnText}>Create account</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => router.push('/(auth)/signin')}
            activeOpacity={0.85}
          >
            <Text style={styles.ghostBtnText}>Sign in</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.googleBtn, loading && styles.btnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.googleBtnText}>{loading ? 'Signing in…' : '🔵  Continue with Google'}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.legal}>
            By tapping Create account or Sign in, you agree to our{' '}
            <Text style={styles.legalLink}>Terms</Text>. Learn how we process your data in our{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text> and{' '}
            <Text style={styles.legalLink}>Cookies Policy</Text>.
          </Text>
        </Animated.View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  // The explicit height lives on this wrapper, not on ImageBackground itself —
  // ImageBackground (react-native-web) copies width/height straight from its own
  // style onto the inner image layer, and doing that with height set but no
  // matching width breaks the image's fill sizing on some mobile browsers.
  frame: { flex: 1, ...Platform.select({ web: { height: '100dvh', overflow: 'hidden' } }) },
  bg: { flex: 1, backgroundColor: '#000' },
  // Forces the inner image layer to fill its box instead of rendering at its
  // own intrinsic pixel size (which on web can end up narrower than the
  // screen, showing only a cropped-in window of the photo).
  bgImage: { width: '100%', height: '100%' },
  grain: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.06)' },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: '22%', backgroundColor: 'rgba(0,0,0,0.28)' },
  bottomFade: { position: 'absolute', top: '42%', left: 0, right: 0, bottom: 0 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 28, gap: 6, zIndex: 2 },
  logoWrap: { width: 52, height: 34, position: 'relative', marginBottom: 4 },
  circle: { position: 'absolute', top: 0, width: 34, height: 34, borderRadius: 17 },
  appName: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 22, color: '#fff', letterSpacing: -0.4 },
  headline: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 34, color: '#fff', textAlign: 'center', letterSpacing: -1.2, lineHeight: 40, marginTop: 2 },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22 },
  launchNote: { fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', letterSpacing: 0.2, marginTop: 6 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 28, gap: 12, zIndex: 2 },
  primaryBtn: { borderRadius: 50, overflow: 'hidden' },
  gradientBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 50 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  ghostBtn: { borderRadius: 50, paddingVertical: 18, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  ghostBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  googleBtn: { borderRadius: 50, paddingVertical: 16, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  googleBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
  legal: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 16 },
  legalLink: { color: 'rgba(255,255,255,0.55)', textDecorationLine: 'underline' },
});
