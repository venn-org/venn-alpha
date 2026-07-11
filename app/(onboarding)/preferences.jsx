import { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingShell from '../../components/OnboardingShell';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getCurrentUserId } from '../../lib/auth';
import { toDb } from '../../lib/enums';

const AREAS = ['Bandra', 'Andheri', 'Powai', 'Malad', 'Goregaon', 'Thane', 'Navi Mumbai', 'Pune', 'Dadar', 'Kurla', 'Lower Parel', 'Worli'];
const BUDGETS = ['₹5k–10k', '₹10k–20k', '₹20k–35k', '₹35k–50k', '₹50k+'];
const FLAT_TYPES = ['1 BHK', '2 BHK', '3 BHK', '4 BHK+', 'Studio', 'PG / Room'];

export default function Preferences() {
  const [userType, setUserType] = useState(null);
  const [areas, setAreas] = useState([]);
  const [budget, setBudget] = useState(null);
  const [flatType, setFlatType] = useState(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    async function loadUserType() {
      const uid = getCurrentUserId();
      if (!uid) return;
      const { data } = await supabase.from('profiles').select('user_type').eq('id', uid).single();
      setUserType(data?.user_type ?? 'seeking');
    }
    loadUserType();
  }, []);

  function toggleArea(a) {
    setAreas(s => s.includes(a) ? s.filter(x => x !== a) : [...s, a]);
  }

  async function handleContinue() {
    const uid = getCurrentUserId();
    if (!uid) { Alert.alert('Session expired', 'Please sign in again.'); router.replace('/(auth)/login'); return; }
    
    // Map the UI budget string back to the DB enum.
    // e.g. "₹10k–20k" -> "10k_20k"
    const dbBudget = budget ? toDb('pref_budget', budget) : null;
    
    // Map the UI flat_type string back to the DB enum.
    // e.g. "1 BHK" -> "1_bhk"
    const dbFlatType = flatType ? toDb('flat_type', flatType) : null;

    const updates = {
      preferred_areas: areas.length > 0 ? areas : null,
      budget: dbBudget,
    };
    
    if (userType === 'owner' && dbFlatType) updates.flat_type = dbFlatType;
    
    const { error } = await supabase.from('profiles').update(updates).eq('id', uid);
    if (error) { Alert.alert('Save failed', error.message); return; }
    
    router.push('/(onboarding)/photos');
  }

  const canContinue = userType === 'owner'
    ? areas.length > 0 && budget && flatType
    : areas.length > 0 || !!budget;

  const isOwner = userType === 'owner';

  return (
    <OnboardingShell step={7} total={9}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {isOwner ? (
          <>
            <Text style={styles.title}>Tell us about your flat</Text>
            <Text style={styles.subtitle}>Help people find you in Standouts.</Text>

            <Text style={styles.sectionLabel}>WHERE IS YOUR FLAT?</Text>
            <View style={styles.chips}>
              {AREAS.map(a => {
                const on = areas.includes(a);
                return (
                  <TouchableOpacity
                    key={a}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => toggleArea(a)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{a}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>MONTHLY RENT (per person)</Text>
            <View style={styles.chips}>
              {BUDGETS.map(b => {
                const on = budget === b;
                return (
                  <TouchableOpacity
                    key={b}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setBudget(b)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{b}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>FLAT TYPE</Text>
            <View style={styles.chips}>
              {FLAT_TYPES.map(t => {
                const on = flatType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setFlatType(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Where are you looking?</Text>
            <Text style={styles.subtitle}>Pick the areas you're open to. You can change this later.</Text>

            <View style={styles.chips}>
              {AREAS.map(a => {
                const on = areas.includes(a);
                return (
                  <TouchableOpacity
                    key={a}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => toggleArea(a)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{a}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.subtitle, { marginTop: 32 }]}>What's your monthly budget?</Text>
            <View style={styles.chips}>
              {BUDGETS.map(b => {
                const on = budget === b;
                return (
                  <TouchableOpacity
                    key={b}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setBudget(b)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{b}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.btn, !canContinue && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(onboarding)/photos')}>
          <Text style={styles.skip}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, color: colors.ink, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 16 },
  sectionLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: colors.slate, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 50, borderWidth: 1.5, borderColor: colors.mist, backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontSize: 14, fontWeight: '500', color: colors.slate },
  chipTextOn: { color: '#fff' },
  footer: { paddingHorizontal: 28, paddingTop: 12, gap: 12 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skip: { fontSize: 14, color: colors.slate, textAlign: 'center' },
});
