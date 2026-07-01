import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getBlockedIds } from '../../lib/blocks';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 48) / 2;

const DEMO_NEW = [
  { id: 'n1', name: 'Kavya', photo: null },
  { id: 'n2', name: 'Ishaan', photo: null },
  { id: 'n3', name: 'Rhea', photo: null },
];

function MatchCard({ match, onPress }) {
  const initials = (match.name ?? '?')[0].toUpperCase();
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={s.photoWrap}>
        {match.photo ? (
          <Image source={{ uri: match.photo }} style={s.photo} resizeMode="cover" />
        ) : (
          <View style={[s.photo, s.photoPlaceholder]}>
            <Text style={s.initials}>{initials}</Text>
          </View>
        )}
      </View>
      <View style={s.cardInfo}>
        <Text style={s.cardName}>{match.name}</Text>
        <Text style={s.cardSub}>New match</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function Matches() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [newMatches, setNewMatches] = useState(DEMO_NEW);
  const [loading, setLoading] = useState(true);
  const [hasUnread] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id;
        if (!uid) return;

        const { data: matchRows } = await supabase
          .from('matches')
          .select('id, created_at, user1_id, user2_id')
          .or(`user1_id.eq.${uid},user2_id.eq.${uid}`);
        if (!matchRows || matchRows.length === 0) {
          setNewMatches([]);
          return;
        }

        const matchIds = matchRows.map(m => m.id);
        const [{ data: msgRows }, blockedIds] = await Promise.all([
          supabase.from('messages').select('match_id').in('match_id', matchIds),
          getBlockedIds(uid),
        ]);
        const messagedIds = new Set((msgRows ?? []).map(m => m.match_id));
        const unmessaged = matchRows.filter(m => {
          if (messagedIds.has(m.id)) return false;
          const otherId = m.user1_id === uid ? m.user2_id : m.user1_id;
          return !blockedIds.has(otherId);
        });

        if (unmessaged.length === 0) {
          setNewMatches([]);
          return;
        }

        const otherIds = unmessaged.map(m => m.user1_id === uid ? m.user2_id : m.user1_id);
        const { data: profileRows } = await supabase
          .from('profiles').select('id, name, photos').in('id', otherIds);
        const profileMap = {};
        profileRows?.forEach(p => { profileMap[p.id] = p; });

        const mapped = unmessaged.map(match => {
          const otherId = match.user1_id === uid ? match.user2_id : match.user1_id;
          const p = profileMap[otherId];
          return {
            id: match.id, name: p?.name ?? '?',
            photo: Array.isArray(p?.photos) ? p.photos[0] ?? null : null,
          };
        });
        setNewMatches(mapped);
      } catch (_) {
        // keep demo data
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function openChat(match) {
    router.push({ pathname: '/(tabs)/chat', params: { name: match.name, matchId: match.id ?? '' } });
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top + 12 }]}>
      <View style={s.topBar}>
        <Text style={s.title}>Matches</Text>
        <TouchableOpacity style={s.bellBtn} activeOpacity={0.8} onPress={() => router.push('/(tabs)/notifications')}>
          <Ionicons name="notifications-outline" size={18} color={colors.ink} />
          {hasUnread && <View style={s.bellDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView style={s.whiteCard} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {loading ? (
          <View style={s.empty}><Text style={s.emptyText}>Loading...</Text></View>
        ) : newMatches.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No new matches yet</Text>
            <Text style={s.emptyText}>Keep swiping — your next match could be right around the corner.</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {newMatches.map(m => (
              <MatchCard key={m.id} match={m} onPress={() => openChat(m)} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.03 * 28 },
  bellBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2, position: 'relative' },
  bellDot: { position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D6A', borderWidth: 2, borderColor: colors.canvas },

  whiteCard: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 80, gap: 8 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.ink, textAlign: 'center' },
  emptyText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', lineHeight: 20 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  card: { width: CARD_W, borderRadius: 18, overflow: 'hidden', backgroundColor: '#F8F9FC' },
  photoWrap: { width: '100%', height: CARD_W },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, color: colors.slate },
  cardInfo: { padding: 12 },
  cardName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.ink, marginBottom: 2 },
  cardSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: colors.blue },
});
