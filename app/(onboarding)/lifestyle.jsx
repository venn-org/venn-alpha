import { useState } from 'react';
import { Text, View, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingShell from '../../components/OnboardingShell';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

const QUESTIONS = [
  { key: 'drink', label: 'Drinking' },
  { key: 'tobacco', label: 'Tobacco' },
  { key: 'weed', label: 'Cannabis' },
];
const OPTIONS = ['Yes', 'Sometimes', 'No', 'Prefer not to say'];

export default function Lifestyle() {
  const [answers, setAnswers] = useState({});
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const allAnswered = QUESTIONS.every(q => answers[q.key]);

  function setAnswer(key, val) {
    setAnswers(a => ({ ...a, [key]: val }));
  }

  async function handleNext() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { Alert.alert('Session expired', 'Please sign in again.'); router.replace('/(auth)/login'); return; }
    const { error } = await supabase.from('profiles').update({
      drink: answers.drink ?? null,
      tobacco: answers.tobacco ?? null,
      weed: answers.weed ?? null,
    }).eq('id', user.id);
    if (error) { Alert.alert('Save failed', error.message); return; }
    router.push('/(onboarding)/preferences');
  }

  return (
    <OnboardingShell step={6} total={9}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>A bit about your lifestyle</Text>
        <Text style={styles.subtitle}>Visible on profile — helps you find flatmates who match your vibe.</Text>

        {QUESTIONS.map(q => (
          <View key={q.key} style={styles.question}>
            <Text style={styles.qLabel}>{q.label}</Text>
            <View style={styles.chips}>
              {OPTIONS.map(opt => {
                const on = answers[q.key] === opt;
                return (
                  <TouchableOpacity key={opt} style={[styles.chip, on && styles.chipOn]} onPress={() => setAnswer(q.key, opt)} activeOpacity={0.8}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.footerInner}>
          <Text style={styles.visible}>✓  Visible on profile</Text>
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <LinearGradient colors={allAnswered ? [colors.blue, colors.violet] : ['#C8CAD2', '#C8CAD2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextGrad}>
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
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 28 },
  question: { marginBottom: 24, borderBottomWidth: 1, borderColor: colors.mist, paddingBottom: 20 },
  qLabel: { fontSize: 15, fontWeight: '600', color: colors.ink, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 50, borderWidth: 1.5, borderColor: colors.mist, backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontSize: 14, fontWeight: '500', color: colors.slate },
  chipTextOn: { color: '#fff' },
  footer: { borderTopWidth: 1, borderColor: colors.mist, paddingTop: 16, paddingHorizontal: 28 },
  footerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  visible: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  nextBtn: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  nextGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nextArrow: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
