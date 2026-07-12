import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <View style={[styles.circle, { backgroundColor: '#335CFF', left: 0 }]} />
        <View style={[styles.circle, { backgroundColor: '#8A5BFF', right: 0, opacity: 0.9 }]} />
      </View>
      <Text style={styles.text}>Venn</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 14 },
  logoWrap: { width: 68, height: 44, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 44, height: 44, borderRadius: 22 },
  text: { fontSize: 26, fontWeight: '700', color: '#14161B', letterSpacing: -0.5 },
});
