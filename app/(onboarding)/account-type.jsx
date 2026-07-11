import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getCurrentUserId } from '../../lib/auth';

export default function AccountType() {
  const [type, setType] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function handleContinue() {
    if (!type) return;
    setLoading(true);
    const uid = getCurrentUserId();
    if (!user) {
      setLoading(false);
      Alert.alert('Session expired', 'Please sign in again.');
      router.replace('/(auth)/login');
      return;
    }
    const { error } = await supabase.from('profiles').update({ user_type: type }).eq('id', uid);
    if (error) { Alert.alert('Error', error.message); setLoading(false); return; }
    router.push('/(onboarding)/birthday');
    setLoading(false);
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <View style={s.progressTrack}>
          <LinearGradient
            colors={[colors.blue, colors.violet]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.progressFill, { width: '22%' }]}
          />
        </View>
        <Text style={s.stepLabel}>STEP 2 OF 9</Text>
      </View>

      <TouchableOpacity style={s.back} onPress={() => router.back()}>
        <Text style={s.backArrow}>‹</Text>
      </TouchableOpacity>

      <View style={s.body}>
        <Text style={s.title}>What brings you to Venn?</Text>
        <Text style={s.subtitle}>This shapes how your profile appears to others.</Text>

        <TouchableOpacity
          style={[s.card, type === 'seeking' && s.cardActive]}
          onPress={() => setType('seeking')}
          activeOpacity={0.8}
        >
          <View style={[s.cardIcon, type === 'seeking' && s.cardIconActive]}>
            <Text style={{ fontSize: 30 }}>🔍</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardTitle, type === 'seeking' && s.cardTitleActive]}>
              I'm looking for a flat
            </Text>
            <Text style={[s.cardSub, type === 'seeking' && s.cardSubActive]}>
              Your profile appears in others' feeds as a potential flatmate
            </Text>
          </View>
          {type === 'seeking' && (
            <Ionicons name="checkmark-circle" size={22} color={colors.blue} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.card, type === 'owner' && s.cardActive]}
          onPress={() => setType('owner')}
          activeOpacity={0.8}
        >
          <View style={[s.cardIcon, type === 'owner' && s.cardIconActive]}>
            <Text style={{ fontSize: 30 }}>🏠</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardTitle, type === 'owner' && s.cardTitleActive]}>
              I have a flat
            </Text>
            <Text style={[s.cardSub, type === 'owner' && s.cardSubActive]}>
              Your listing appears in Standouts — people send you a Key 🔑 to connect
            </Text>
          </View>
          {type === 'owner' && (
            <Ionicons name="checkmark-circle" size={22} color={colors.blue} />
          )}
        </TouchableOpacity>
      </View>

      <View style={[s.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[s.btn, (!type || loading) && s.btnDisabled]}
          onPress={handleContinue}
          disabled={!type || loading}
          activeOpacity={0.85}
        >
          <Text style={s.btnText}>{loading ? 'Saving…' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  topBar: { paddingHorizontal: 28, paddingTop: 14, gap: 8 },
  progressTrack: { height: 3, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  stepLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: colors.placeholder, letterSpacing: 1.2, textAlign: 'right' },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 16, marginTop: 4 },
  backArrow: { fontSize: 28, color: colors.ink, lineHeight: 32 },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 28 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, letterSpacing: -1, lineHeight: 38, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 32 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    marginBottom: 14, borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardActive: { borderColor: colors.blue, backgroundColor: '#EEF1FF' },
  cardIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center',
  },
  cardIconActive: { backgroundColor: '#fff' },
  cardTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.ink, marginBottom: 4 },
  cardTitleActive: { color: colors.blue },
  cardSub: { fontSize: 13, color: colors.slate, lineHeight: 18 },
  cardSubActive: { color: colors.ink },

  footer: { paddingHorizontal: 28, paddingTop: 12 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
