import { useState } from 'react';
import { Text, View, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingShell from '../../components/OnboardingShell';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

const OPTIONS = ['she', 'her', 'hers', 'he', 'him', 'his', 'they', 'them'];

export default function Pronouns() {
  const [selected, setSelected] = useState([]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function toggle(opt) {
    setSelected(s => s.includes(opt) ? s.filter(x => x !== opt) : s.length < 4 ? [...s, opt] : s);
  }

  async function handleNext() {
    if (selected.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Session expired', 'Please sign in again.'); router.replace('/(auth)/login'); return; }
      const { error } = await supabase.from('profiles').update({ pronouns: selected }).eq('id', user.id);
      if (error) { Alert.alert('Save failed', error.message); return; }
    }
    router.push('/(onboarding)/gender');
  }

  return (
    <OnboardingShell step={4} total={9}>
      <Text style={styles.title}>What are your pronouns?</Text>
      <Text style={styles.subtitle}>Optional. Pick up to four that feel right.</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {OPTIONS.map(opt => {
          const on = selected.includes(opt);
          return (
            <TouchableOpacity key={opt} style={[styles.row, on && styles.rowOn]} onPress={() => toggle(opt)} activeOpacity={0.8}>
              <Text style={styles.rowLabel}>{opt}</Text>
              <View style={[styles.check, on && styles.checkOn]}>
                {on && <Text style={styles.checkMark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.footerInner}>
          <Text style={styles.visible}>✓  Visible on profile</Text>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextGrad}>
              <Text style={styles.nextArrow}>→</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, color: colors.ink, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 24 },
  row: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 10, borderWidth: 2, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowOn: { borderColor: colors.blue, backgroundColor: '#EEF1FF' },
  rowLabel: { fontSize: 17, color: colors.ink },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#C8CAD2', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  footer: { borderTopWidth: 1, borderColor: colors.mist, paddingTop: 16, paddingHorizontal: 28 },
  footerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  visible: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  nextBtn: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  nextGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nextArrow: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
