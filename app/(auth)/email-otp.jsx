import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../lib/theme';

/**
 * This screen is no longer used for OTP code entry.
 * Email auth now uses Firebase magic links (handled in _layout.jsx).
 * This screen exists as a fallback redirect.
 */
export default function EmailOtp() {
  const router = useRouter();

  useEffect(() => {
    // Redirect back to the email screen
    router.replace('/(auth)/email');
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.blue} />
      <Text style={styles.text}>Redirecting…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', gap: 16 },
  text: { fontSize: 14, color: colors.placeholder },
});
