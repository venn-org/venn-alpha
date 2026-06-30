import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { HankenGrotesk_400Regular, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });

  useEffect(() => {
    const fallback = setTimeout(() => setReady(true), 3000);

    supabase.auth.getSession().then(({ data }) => {
      const s = data?.session ?? null;
      setSession(s);
      if (!s) {
        clearTimeout(fallback);
        setReady(true);
        return;
      }
      supabase.from('profiles')
        .select('onboarding_done')
        .eq('id', s.user.id)
        .single()
        .then(({ data: p }) => {
          setProfileComplete(!!p?.onboarding_done);
          clearTimeout(fallback);
          setReady(true);
        })
        .catch(() => setReady(true));
    }).catch(() => {
      clearTimeout(fallback);
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (s) {
        const { data: p } = await supabase.from('profiles').select('onboarding_done').eq('id', s.user.id).single();
        setProfileComplete(!!p?.onboarding_done);
        setSession(s);
      } else {
        setSession(null);
        setProfileComplete(false);
      }
    });

    return () => { subscription.unsubscribe(); clearTimeout(fallback); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inTabs = segments[0] === '(tabs)';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    if (profileComplete) {
      if (!inTabs) router.replace('/(tabs)/feed');
      return;
    }

    // profileComplete is false in state — but if the user just finished onboarding
    // and navigated to tabs, the DB may already have onboarding_done=true.
    // Re-check before bouncing them back.
    if (inTabs) {
      supabase.from('profiles').select('onboarding_done').eq('id', session.user.id).single().then(({ data: p }) => {
        if (p?.onboarding_done) {
          setProfileComplete(true);
        } else {
          router.replace('/(onboarding)/name');
        }
      });
    } else if (!inOnboarding) {
      router.replace('/(onboarding)/name');
    }
  }, [ready, session, profileComplete, segments]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      {!ready && (
        <View style={s.splash}>
          <View style={s.logoWrap}>
            <View style={[s.circle, { backgroundColor: '#335CFF', left: 0 }]} />
            <View style={[s.circle, { backgroundColor: '#8A5BFF', right: 0, opacity: 0.9 }]} />
          </View>
          <Text style={s.text}>Venn</Text>
        </View>
      )}
    </>
  );
}

const s = StyleSheet.create({
  splash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 14 },
  logoWrap: { width: 68, height: 44, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 44, height: 44, borderRadius: 22 },
  text: { fontSize: 26, fontWeight: '700', color: '#14161B', letterSpacing: -0.5 },
});
