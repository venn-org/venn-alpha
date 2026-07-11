import { useState } from 'react';
import { ImageBackground, View, Text, TouchableOpacity, StyleSheet, Switch, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { subscribeToPush } from '../../lib/push';
import { colors } from '../../lib/theme';
import { getCurrentUserId } from '../../lib/auth';

export default function Notifications() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function finish() {
    setLoading(true);
    const uid = getCurrentUserId();
    if (!uid) {
      setLoading(false);
      Alert.alert('Session expired', 'Please sign in again.');
      router.replace('/(auth)/login');
      return;
    }
    const { error } = await supabase.from('profiles').update({ onboarding_done: true }).eq('id', uid);
    if (error) { Alert.alert('Save failed', error.message); setLoading(false); return; }
    // Best-effort — a denied permission or unsupported browser shouldn't block onboarding.
    if (enabled) subscribeToPush(uid);
    router.replace('/(tabs)/feed');
  }

  return (
    <View style={styles.frame}>
      <ImageBackground source={require('../../assets/notif-bg.jpeg')} style={styles.bg} imageStyle={styles.bgImage} resizeMode="cover">
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.88)']} style={styles.overlay} />

        <View style={[styles.content, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 }]}>
          <View style={styles.top}>
            <Text style={styles.title}>Don't miss when someone wants to connect</Text>
            <Text style={styles.subtitle}>Enable notifications to stay on top of your matches and messages.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.notifIcon}>
                <Text style={{ fontSize: 20 }}>💙</Text>
              </View>
              <View>
                <Text style={styles.cardTitle}>Match notifications</Text>
                <Text style={styles.cardSub}>Get notified when you match</Text>
              </View>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: colors.mist, true: colors.blue }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={finish} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtn}>
              <Text style={styles.btnText}>{loading ? 'Finishing…' : 'Continue'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  bgImage: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', top: '25%', left: 0, right: 0, bottom: 0 },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between' },
  top: { gap: 12 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: '#fff', letterSpacing: -1, lineHeight: 38 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 22 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  notifIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF1FF', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  cardSub: { fontSize: 13, color: colors.slate, marginTop: 2 },
  btn: { borderRadius: 50, overflow: 'hidden' },
  btnDisabled: { opacity: 0.6 },
  gradientBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 50 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
