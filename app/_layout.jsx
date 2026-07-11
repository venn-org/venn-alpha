import '../lib/alert'; // patches react-native-web's no-op Alert.alert — must load before any screen
import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { HankenGrotesk_400Regular, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { ensureProfile, completeEmailLink } from '../lib/auth';
import { registerServiceWorker } from '../lib/push';
import MatchCelebration from '../components/MatchCelebration';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null); // Firebase user (or null)
  const [profileComplete, setProfileComplete] = useState(false);
  const [incomingMatch, setIncomingMatch] = useState(null);
  const segments = useSegments();
  const router = useRouter();
  const initialised = useRef(false);

  useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });

  // Register early (not gated on session) so the service worker is active
  // and can receive pushes even before/between subscribe calls.
  useEffect(() => {
    if (Platform.OS === 'web') registerServiceWorker();
  }, []);

  // Handle email sign-in links on web (user clicked magic link in their inbox)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (url) {
      completeEmailLink(url).catch(() => { /* not a sign-in link, ignore */ });
    }
  }, []);

  // Firebase auth state listener — replaces supabase.auth.onAuthStateChange
  useEffect(() => {
    const fallback = setTimeout(() => setReady(true), 3000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Ensure profile row exists in Supabase
        await ensureProfile();

        // Check onboarding status
        const { data: p } = await supabase
          .from('profiles')
          .select('onboarding_done')
          .eq('id', firebaseUser.uid)
          .single();
        setProfileComplete(!!p?.onboarding_done);
      } else {
        setUser(null);
        setProfileComplete(false);
      }

      if (!initialised.current) {
        clearTimeout(fallback);
        setReady(true);
        initialised.current = true;
      }
    });

    return () => { unsubscribe(); clearTimeout(fallback); };
  }, []);

  // Realtime: show match celebration when someone likes us back
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    const channel = supabase
      .channel(`match-notify-${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'likes', filter: `to_user_id=eq.${uid}` },
        async (payload) => {
          const fromId = payload.new.from_user_id;
          // Only show celebration if we had previously liked them too (mutual)
          const { data: prevLike } = await supabase
            .from('likes').select('id').eq('from_user_id', uid).eq('to_user_id', fromId).maybeSingle();
          if (!prevLike) return;

          const { data: p } = await supabase
            .from('profiles').select('name, photos').eq('id', fromId).single();
          if (!p) return;

          const u1 = uid < fromId ? uid : fromId;
          const u2 = uid < fromId ? fromId : uid;
          const { data: match } = await supabase
            .from('matches').select('id').eq('user1_id', u1).eq('user2_id', u2).maybeSingle();

          setIncomingMatch({
            name: p.name,
            photo: p.photos?.[0] ?? null,
            matchId: match?.id ?? null,
            userId: fromId,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Heartbeat: keep profiles.last_active_at fresh while the app is open,
  // so other users can see an accurate "Active now" / "Active Xm ago" status.
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    async function ping() {
      await supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', uid);
    }
    ping();
    const interval = setInterval(ping, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!ready) return;
    if (segments.length === 0 || !segments[0]) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inTabs = segments[0] === '(tabs)';

    if (!user) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    if (profileComplete || global.onboardingDone) {
      if (!profileComplete) setProfileComplete(true);
      if (!inTabs) router.replace('/(tabs)/feed');
      return;
    }

    if (inTabs) {
      supabase.from('profiles').select('onboarding_done').eq('id', user.uid).single()
        .then(({ data: p }) => {
          if (p?.onboarding_done) {
            setProfileComplete(true);
          } else {
            router.replace('/(onboarding)/name');
          }
        })
        .catch(() => {});
    } else if (!inOnboarding) {
      router.replace('/(onboarding)/name');
    }
  }, [ready, user, profileComplete, segments]);

  return (
    <>
      {Platform.OS === 'web' && <SpeedInsights />}
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      </Stack>
      {!ready && (
        <View style={s.splash}>
          <View style={s.logoWrap}>
            <View style={[s.circle, { backgroundColor: '#335CFF', left: 0 }]} />
            <View style={[s.circle, { backgroundColor: '#8A5BFF', right: 0, opacity: 0.9 }]} />
          </View>
          <Text style={s.text}>Venn</Text>
        </View>
      )}
      <MatchCelebration
        visible={incomingMatch !== null}
        matchedName={incomingMatch?.name}
        matchedPhoto={incomingMatch?.photo}
        onChat={() => {
          const d = incomingMatch;
          setIncomingMatch(null);
          router.push({ pathname: '/(tabs)/chat', params: { name: d.name, photo: d.photo ?? '', matchId: d.matchId, prefill: `Hey ${d.name}! Really excited to match with you on Venn 👋 Still looking for a flatmate?` } });
        }}
        onDismiss={() => setIncomingMatch(null)}
      />
    </>
  );
}

const s = StyleSheet.create({
  splash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 14 },
  logoWrap: { width: 68, height: 44, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 44, height: 44, borderRadius: 22 },
  text: { fontSize: 26, fontWeight: '700', color: '#14161B', letterSpacing: -0.5 },
});
