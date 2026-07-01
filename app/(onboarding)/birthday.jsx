import { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import OnboardingShell from '../../components/OnboardingShell';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

export default function Birthday() {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  function validate() {
    const d = parseInt(day), m = parseInt(month), y = parseInt(year);
    if (!d || !m || !y || y < 1900) { setError('Please enter a valid date.'); return false; }
    if (d < 1 || d > 31 || m < 1 || m > 12) { setError('Please enter a valid date.'); return false; }
    const today = new Date();
    const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const birthDate = new Date(y, m - 1, d);
    if (birthDate > eighteenYearsAgo) { setError('You must be at least 18 years old.'); return false; }
    setError('');
    return true;
  }

  async function handleContinue() {
    if (!validate()) return;
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('profiles').update({ birthday: iso }).eq('id', user.id);
    if (error) { Alert.alert('Save failed', error.message); return; }
    router.push('/(onboarding)/pronouns');
  }

  const valid = day.length >= 1 && month.length >= 1 && year.length === 4;

  return (
    <OnboardingShell
      step={3} total={9}
      footer={
        <TouchableOpacity
          style={[styles.btn, !valid && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!valid}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>
      }
    >
      <Text style={styles.title}>When's your birthday?</Text>
      <Text style={styles.subtitle}>We'll only show your age on your profile.</Text>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>DAY</Text>
          <TextInput style={styles.numInput} placeholder="DD" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={2} value={day} onChangeText={setDay} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>MONTH</Text>
          <TextInput style={styles.numInput} placeholder="MM" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={2} value={month} onChangeText={setMonth} />
        </View>
        <View style={[styles.field, { flex: 1.4 }]}>
          <Text style={styles.label}>YEAR</Text>
          <TextInput style={styles.numInput} placeholder="YYYY" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={4} value={year} onChangeText={setYear} />
        </View>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, letterSpacing: -1, lineHeight: 38, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 40 },
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
  label: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: colors.slate, marginBottom: 6 },
  numInput: { backgroundColor: colors.inputBg, borderRadius: 14, padding: 17, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, textAlign: 'center', color: colors.ink, borderWidth: 2, borderColor: 'transparent' },
  error: { fontSize: 12, color: colors.error, marginTop: 8 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
