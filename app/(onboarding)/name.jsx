import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getCurrentUserId } from '../../lib/auth';

export default function Name() {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function handleContinue() {
    setLoading(true);
    const uid = getCurrentUserId();
    if (!uid) {
      setLoading(false);
      Alert.alert('Session expired', 'Please sign in again.');
      router.replace('/(auth)/login');
      return;
    }
    const { error } = await supabase.from('profiles').update({
      name: last.trim() ? `${first.trim()} ${last.trim()}` : first.trim(),
    }).eq('id', uid);
    if (error) Alert.alert('Error', error.message);
    else router.push('/(onboarding)/account-type');
    setLoading(false);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.progressTrack}>
          <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: '11%' }]} />
        </View>
        <Text style={styles.stepLabel}>STEP 1 OF 9</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>What's your name?</Text>
        <Text style={styles.subtitle}>Venn doesn't verify names. We count on flatmates to be real with each other.</Text>

        <Text style={styles.label}>FIRST NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="Your first name"
          placeholderTextColor={colors.placeholder}
          value={first}
          onChangeText={setFirst}
          autoFocus
        />

        <Text style={[styles.label, { marginTop: 14 }]}>LAST NAME <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="Your last name"
          placeholderTextColor={colors.placeholder}
          value={last}
          onChangeText={setLast}
        />

        <Text style={styles.hint}>Last name is optional and only shared with confirmed matches.</Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.btn, (!first.trim() || loading) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!first.trim() || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{loading ? 'Saving…' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  topBar: { paddingHorizontal: 28, paddingTop: 14, gap: 8 },
  progressTrack: { height: 3, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  stepLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: colors.placeholder, letterSpacing: 1.2, textAlign: 'right' },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 32 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, letterSpacing: -1, lineHeight: 38, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 32 },
  label: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: colors.slate, marginBottom: 7 },
  optional: { fontFamily: 'System', textTransform: 'none', letterSpacing: 0, color: colors.placeholder, fontSize: 12 },
  input: { backgroundColor: colors.inputBg, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 17, fontSize: 16, color: colors.ink, borderWidth: 2, borderColor: 'transparent', marginBottom: 4 },
  hint: { fontSize: 12, color: colors.placeholder, textAlign: 'center', marginTop: 16 },
  footer: { paddingHorizontal: 28, paddingTop: 12 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
