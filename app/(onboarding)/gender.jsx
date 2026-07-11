import { useState } from 'react';
import { Text, View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingShell from '../../components/OnboardingShell';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getCurrentUserId } from '../../lib/auth';
import { toDb } from '../../lib/enums';

const OPTIONS = ['Man', 'Woman', 'Non-binary', 'Prefer not to say'];

export default function Gender() {
  const [selected, setSelected] = useState(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function handleNext() {
    if (!selected) return;
    const uid = getCurrentUserId();
    if (!uid) { Alert.alert('Session expired', 'Please sign in again.'); router.replace('/(auth)/login'); return; }
    const { error } = await supabase.from('profiles').update({ gender: toDb('gender', selected) }).eq('id', uid);
    if (error) { Alert.alert('Save failed', error.message); return; }
    router.push('/(onboarding)/lifestyle');
  }

  return (
    <OnboardingShell step={5} total={9}>
      <Text style={styles.title}>Which gender best describes you?</Text>
      <Text style={styles.subtitle}>Choose what describes you best.</Text>

      {OPTIONS.map(opt => {
        const on = selected === opt;
        return (
          <TouchableOpacity key={opt} style={[styles.row, on && styles.rowOn]} onPress={() => setSelected(opt)} activeOpacity={0.8}>
            <Text style={styles.rowLabel}>{opt}</Text>
            <View style={[styles.radio, on && styles.radioOn]}>
              {on && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.footerInner}>
          <Text style={styles.visible}>✓  Visible on profile</Text>
          <TouchableOpacity
            style={[styles.nextBtn, !selected && styles.nextBtnOff]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <LinearGradient colors={selected ? [colors.blue, colors.violet] : ['#C8CAD2', '#C8CAD2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextGrad}>
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
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#C8CAD2', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.blue },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue },
  footer: { borderTopWidth: 1, borderColor: colors.mist, paddingTop: 16, paddingHorizontal: 28, marginTop: 'auto' },
  footerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  visible: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  nextBtn: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  nextGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nextArrow: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
