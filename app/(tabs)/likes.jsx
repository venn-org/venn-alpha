import { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Pressable, Image, Dimensions, Animated, Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Ellipse, Circle, Path, G } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getBlockedIds, blockUser } from '../../lib/blocks';
import { calcAge } from '../../lib/age';
import PreferencesSheet, { INIT_PREFS, savePrefsToSupabase } from '../../components/PreferencesSheet';
import { mapDbPrefsToUI } from '../../lib/enums';
import MatchCelebration from '../../components/MatchCelebration';
import ReportSheet from '../../components/ReportSheet';
import { LikesSkeleton } from '../../components/Skeleton';
import { getCurrentUserId } from '../../lib/auth';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 48) / 2;

function EmptyIllustration() {
  return (
    <Svg viewBox="0 0 280 240" width={260} height={220}>
      <Ellipse cx={140} cy={130} rx={110} ry={90} fill="#EEF0FF" opacity={0.8} />
      <G transform="translate(70,65)">
        <Ellipse cx={80} cy={100} rx={38} ry={18} fill="#C8CAD2" opacity={0.35} />
        <Path d="M60 88 h60 a9 9 0 0 1 0 18 H60 a9 9 0 0 1 0-18z" fill="#E6E8EE" />
        <Path d="M50 68 h50 a10 10 0 0 1 0 28 H50 a10 10 0 0 1 0-28z" fill="#14161B" opacity={0.8} />
        <Circle cx={40} cy={74} r={16} fill="#FDDCB5" />
        <Path d="M26 68 Q40 54 54 68" fill="#14161B" opacity={0.9} />
        <Path d="M54 68 Q68 60 72 72" stroke="#FDDCB5" strokeWidth={8} strokeLinecap="round" fill="none" />
        <Ellipse cx={122} cy={94} rx={12} ry={7} fill="#14161B" opacity={0.85} />
        <Ellipse cx={112} cy={100} rx={12} ry={7} fill="#14161B" opacity={0.85} />
      </G>
      <G>
        <Circle cx={54} cy={72} r={16} fill="#fff" />
        <Path d="M54 79l-1.2-1.1C49.5 75.2 47 73 47 70.3c0-2.5 1.9-4.3 4.3-4.3 1.2 0 2.4.6 3 1.5.6-.9 1.8-1.5 3-1.5C59.8 66 62 67.8 62 70.3c0 2.7-2.5 4.9-6.8 8.6L54 79z" fill="#FF4D6A" opacity={0.85} />
      </G>
      <G>
        <Circle cx={228} cy={60} r={16} fill="#fff" />
        <Path d="M228 67l-1.2-1.1C223.5 63.2 221 61 221 58.3c0-2.5 1.9-4.3 4.3-4.3 1.2 0 2.4.6 3 1.5.6-.9 1.8-1.5 3-1.5C233.8 54 236 55.8 236 58.3c0 2.7-2.5 4.9-6.8 8.6L228 67z" fill="#335CFF" opacity={0.85} />
      </G>
      <G>
        <Circle cx={44} cy={160} r={12} fill="#fff" />
        <Path d="M44 166l-.9-.8C40.8 163 39 161.2 39 159.2c0-1.9 1.4-3.2 3.2-3.2.9 0 1.8.4 2.3 1.1.5-.7 1.4-1.1 2.3-1.1C48.6 156 50 157.4 50 159.2c0 2-1.8 3.8-5.1 6L44 166z" fill="#8A5BFF" opacity={0.85} />
      </G>
      <G>
        <Circle cx={238} cy={158} r={12} fill="#fff" />
        <Path d="M238 164l-.9-.8C234.8 161 233 159.2 233 157.2c0-1.9 1.4-3.2 3.2-3.2.9 0 1.8.4 2.3 1.1.5-.7 1.4-1.1 2.3-1.1C242.6 154 244 155.4 244 157.2c0 2-1.8 3.8-5.1 6L238 164z" fill="#FF4D6A" opacity={0.85} />
      </G>
    </Svg>
  );
}

function LikeCard({ like, onPress }) {
  const photo = like.profiles?.photos?.[0];
  const name = like.profiles?.name ?? '???';
  return (
    <TouchableOpacity style={s.likeCard} onPress={onPress} activeOpacity={0.85}>
      <View style={s.likePhotoWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={s.likePhoto} resizeMode="cover" />
        ) : (
          <View style={[s.likePhoto, s.likePhotoPlaceholder]}>
            <Ionicons name="person" size={32} color={colors.mist} />
          </View>
        )}
      </View>
      <View style={s.likeInfo}>
        <Text style={s.likeName}>{name}</Text>
        <Text style={s.likeTime}>Liked you</Text>
      </View>
    </TouchableOpacity>
  );
}

function ProfileOverlay({ like, visible, onClose, onPass, onLike, onBlock, onReport }) {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const profile = like?.profiles;
  if (!profile) return null;
  const age = calcAge(profile.birthday);
  const photo = profile.photos?.[0];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[s.overlay, { height: '92%', paddingBottom: insets.bottom + 16 }]}>
          <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
            <Pressable style={s.menuBackdrop} onPress={() => setMenuOpen(false)}>
              <View style={s.menuBox}>
                <TouchableOpacity style={s.menuItem} activeOpacity={0.7} onPress={() => { setMenuOpen(false); onBlock(); }}>
                  <Ionicons name="ban-outline" size={16} color={colors.ink} />
                  <Text style={s.menuItemText}>Block</Text>
                </TouchableOpacity>
                <View style={s.menuDivider} />
                <TouchableOpacity style={s.menuItem} activeOpacity={0.7} onPress={() => { setMenuOpen(false); onReport(); }}>
                  <Ionicons name="flag-outline" size={16} color="#FF4D6A" />
                  <Text style={[s.menuItemText, { color: '#FF4D6A' }]}>Report</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>

          <View style={s.overlayHeader}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={s.overlayClose} onPress={onClose} activeOpacity={0.7}>
                <Ionicons name="close" size={16} color={colors.ink} />
              </TouchableOpacity>
              <TouchableOpacity style={s.overlayClose} onPress={() => setMenuOpen(true)} activeOpacity={0.7}>
                <Ionicons name="ellipsis-vertical" size={14} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={s.overlayPass} onPress={onPass} activeOpacity={0.8}>
                <Ionicons name="close" size={20} color="#FF4D6A" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onLike} activeOpacity={0.8}>
                <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.overlayLike}>
                  <Ionicons name="heart" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 32, gap: 10 }}>
            {/* Photos */}
            {Array.isArray(profile.photos) && profile.photos.length > 0 ? (
              profile.photos.map((p, i) => (
                <Image key={i} source={{ uri: p }} style={[s.overlayPhoto, i > 0 && { marginTop: 8 }]} resizeMode="cover" />
              ))
            ) : (
              <View style={[s.overlayPhoto, { backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person" size={64} color={colors.mist} />
              </View>
            )}

            {/* Name + age */}
            <Text style={s.overlayName}>{profile.name}{age ? `, ${age}` : ''}</Text>

            {/* Info card — chips + work/education */}
            <View style={s.infoCard}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: (profile.job_title || profile.job_company || profile.education_school || profile.education_level) ? 12 : 0 }}>
                {profile.gender ? <View style={s.chip}><Text style={s.chipText}>👤 {profile.gender}</Text></View> : null}
                {profile.budget ? <View style={s.chip}><Text style={s.chipText}>💰 {profile.budget}</Text></View> : null}
                {Array.isArray(profile.preferred_areas) && profile.preferred_areas.length > 0 && (
                  <View style={s.chip}><Text style={s.chipText}>📍 {profile.preferred_areas.join(', ')}</Text></View>
                )}
              </View>
              {(profile.job_title || profile.job_company) ? (
                <View style={[s.infoRow, { marginBottom: 6 }]}>
                  <Ionicons name="briefcase-outline" size={15} color="#9AA0B2" />
                  <Text style={s.infoText}>{[profile.job_title, profile.job_company].filter(Boolean).join(' at ')}</Text>
                </View>
              ) : null}
              {(profile.education_school || profile.education_level) ? (
                <View style={s.infoRow}>
                  <Ionicons name="school-outline" size={15} color="#9AA0B2" />
                  <Text style={s.infoText}>{[profile.education_school, profile.education_level].filter(Boolean).join(' · ')}</Text>
                </View>
              ) : null}
            </View>

            {/* Prompts */}
            {Array.isArray(profile.prompts) && profile.prompts.map((pr, i) => (
              <View key={i} style={s.promptCard}>
                <Text style={s.promptQ}>{pr.q}</Text>
                <Text style={s.promptA}>{pr.a}</Text>
              </View>
            ))}

            {/* Like comment */}
            {like.comment ? (
              <View style={s.commentBox}>
                <Text style={s.commentLabel}>Said when they liked you</Text>
                <Text style={s.commentText}>"{like.comment}"</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function BoostModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState(false);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 16, paddingHorizontal: 24, paddingTop: 24 }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginBottom: 24 }} />
          {/* header */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#335CFF', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}>
              <Ionicons name="flash" size={34} color="#fff" />
            </LinearGradient>
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: '#14161B', marginBottom: 6 }}>Boost your profile</Text>
            <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', lineHeight: 20 }}>Get pushed to the top of the feed{'\n'}so more people see you first.</Text>
          </View>
          {/* stats */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24, backgroundColor: '#F8F9FF', borderRadius: 16, padding: 16 }}>
            {[['11×', 'More views'], ['1 hr', 'Featured'], ['Free', 'During beta']].map(([val, label]) => (
              <View key={label} style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: '#335CFF', marginBottom: 2 }}>{val}</Text>
                <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2' }}>{label}</Text>
              </View>
            ))}
          </View>
          {active ? (
            <View style={{ backgroundColor: '#F0FFF4', borderRadius: 50, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#22C55E' }}>
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#22C55E' }}>✓ Boost active for 1 hour</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setActive(true)} activeOpacity={0.85}>
              <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 50, paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff' }}>Activate Boost · Free</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function Likes() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showBoost, setShowBoost] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState(INIT_PREFS);
  const [matchData, setMatchData] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const gridFade = useRef(new Animated.Value(0)).current;

  // Loads likes + prefs together; runs on every focus (below) so new likes
  // appear when switching to this tab, making a separate prefs reload redundant.
  const loadLikes = useCallback(async () => {
      try {
        const uid = getCurrentUserId();
        if (!uid) return;

        const [{ data: likesData }, { data: me }, blockedIds, { data: matchRows }] = await Promise.all([
          supabase
            .from('likes')
            .select('id, from_user_id, comment, created_at, profiles!from_user_id(id, name, birthday, gender, photos, preferred_areas, budget, prompts, job_title, job_company, education_school, education_level)')
            .eq('to_user_id', uid)
            .order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('pref_role,pref_areas,pref_flat_type,pref_budget,pref_move_in,pref_gender,pref_age,pref_occupation,pref_food,pref_smoking,pref_drinking,pref_pets')
            .eq('id', uid)
            .single(),
          getBlockedIds(uid),
          supabase.from('matches').select('user1_id, user2_id').or(`user1_id.eq.${uid},user2_id.eq.${uid}`),
        ]);

        // Someone who already matched with us (we liked them back, or they were
        // already a match) shouldn't still show up as a pending "like" — they've
        // moved to chat.
        const matchedIds = new Set((matchRows ?? []).map(m => m.user1_id === uid ? m.user2_id : m.user1_id));

        if (likesData) setLikes(likesData.filter(l => !blockedIds.has(l.from_user_id) && !matchedIds.has(l.from_user_id)));
        if (me) {
          setPrefs(mapDbPrefsToUI(me) ?? INIT_PREFS);
        }
      } catch (_) {}
      finally {
        setLoading(false);
        Animated.timing(gridFade, { toValue: 1, duration: 350, useNativeDriver: false }).start();
      }
  }, []);

  // Refetch on every focus so newly received likes show up on tab switch.
  useFocusEffect(useCallback(() => { loadLikes(); }, [loadLikes]));

  async function onRefresh() {
    setRefreshing(true);
    await loadLikes();
    setRefreshing(false);
  }

  async function handleSavePrefs(draft) {
    setPrefs(draft);
    setShowPrefs(false);
    try {
      await savePrefsToSupabase(draft);
    } catch (e) {
      Alert.alert('Could not save preferences', e.message);
    }
  }

  async function handleLikeBack(like) {
    setSelected(null);
    try {
      const uid = getCurrentUserId();
      if (!uid) return;
      const { error: likeError } = await supabase.from('likes').insert({ from_user_id: uid, to_user_id: like.from_user_id });
      // Already liked (unique constraint) — fall through to the match check below.
      if (likeError && likeError.code !== '23505') { Alert.alert('Could not like back', likeError.message); return; }
      const u1 = uid < like.from_user_id ? uid : like.from_user_id;
      const u2 = uid < like.from_user_id ? like.from_user_id : uid;
      const { data: match } = await supabase
        .from('matches').select('id').eq('user1_id', u1).eq('user2_id', u2).maybeSingle();
      setLikes(prev => prev.filter(l => l.id !== like.id));
      setMatchData({ like, matchId: match?.id ?? null });
    } catch (e) {
      Alert.alert('Could not like back', e.message);
    }
  }

  async function handleBlockLike(like) {
    setSelected(null);
    setLikes(prev => prev.filter(l => l.id !== like.id));
    const uid = getCurrentUserId();
    if (!uid) return;
    const { error } = await blockUser(uid, like.from_user_id);
    if (error) Alert.alert('Could not block', error.message);
  }

  const selectedLike = likes[selected];

  return (
    <View style={[s.screen, { paddingTop: insets.top + 12 }]}>
      <View style={s.topBar}>
        <Text style={s.title}>Likes You</Text>
        <TouchableOpacity style={s.boostBtn} activeOpacity={0.85} onPress={() => setShowBoost(true)}>
          <Ionicons name="flash" size={14} color="#fff" />
          <Text style={s.boostText}>Boost</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LikesSkeleton />
      ) : likes.length === 0 ? (
        <ScrollView
          contentContainerStyle={[s.center, { flexGrow: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
        >
          <EmptyIllustration />
          <Text style={s.emptyTitle}>{"Have patience —\nsomeone's checking you out"}</Text>
          <Text style={s.emptySub}>Your profile is out there. When someone likes you, they'll show up here.</Text>
          {!Object.values(prefs).some(v => Array.isArray(v) ? v.length > 0 : !!v) && (
            <TouchableOpacity style={s.setPrefBtn} onPress={() => setShowPrefs(true)} activeOpacity={0.85}>
              <Text style={s.setPrefText}>Set preferences</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <Animated.View style={{ flex: 1, opacity: gridFade }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.grid}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
          >
            {likes.map((like, i) => (
              <LikeCard key={like.id} like={like} onPress={() => setSelected(i)} />
            ))}
          </ScrollView>
        </Animated.View>
      )}

      <ProfileOverlay
        visible={selected !== null}
        like={selectedLike}
        onClose={() => setSelected(null)}
        onPass={() => setSelected(null)}
        onLike={() => handleLikeBack(selectedLike)}
        onBlock={() => handleBlockLike(selectedLike)}
        onReport={() => setReportTarget(selectedLike)}
      />

      <MatchCelebration
        visible={matchData !== null}
        matchedName={matchData?.like?.profiles?.name}
        matchedPhoto={matchData?.like?.profiles?.photos?.[0]}
        onChat={() => {
          const d = matchData;
          const n = d.like.profiles?.name ?? '';
          const ph = d.like.profiles?.photos?.[0] ?? '';
          setMatchData(null);
          router.push({ pathname: '/(tabs)/chat', params: { name: n, photo: ph, matchId: d.matchId, prefill: `Hey ${n}! Really excited to match with you on Venn 👋 Still looking for a flatmate?` } });
        }}
        onDismiss={() => setMatchData(null)}
      />

      <BoostModal visible={showBoost} onClose={() => setShowBoost(false)} />

      <PreferencesSheet
        visible={showPrefs}
        prefs={prefs}
        onSave={handleSavePrefs}
        onClose={() => setShowPrefs(false)}
      />

      <ReportSheet
        visible={!!reportTarget}
        targetId={reportTarget?.from_user_id}
        targetName={reportTarget?.profiles?.name}
        onClose={() => setReportTarget(null)}
        onSubmitted={() => Alert.alert('Report submitted', "Thanks — we'll review it.")}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.03 * 28 },
  boostBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.blue, borderRadius: 50, paddingHorizontal: 18, paddingVertical: 10 },
  boostText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: '#fff' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 24 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, fontWeight: '800', color: colors.ink, textAlign: 'center', letterSpacing: -0.44, marginTop: 4, marginBottom: 10, lineHeight: 28 },
  emptySub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  setPrefBtn: { width: '100%', backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 16, alignItems: 'center' },
  setPrefText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff' },
  grayText: { color: '#9AA0B2', fontFamily: 'HankenGrotesk_400Regular', fontSize: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16, paddingBottom: 100 },
  likeCard: { width: CARD_W, borderRadius: 18, overflow: 'hidden', backgroundColor: '#fff' },
  likePhotoWrap: { width: '100%', height: CARD_W * 1.25, position: 'relative' },
  likePhoto: { width: '100%', height: '100%' },
  likePhotoPlaceholder: { backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  likeBlur: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(242,243,247,0.65)' },
  likeLockWrap: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  likeInfo: { padding: 12 },
  likeName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.ink, marginBottom: 2 },
  likeTime: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2' },

  menuBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start', alignItems: 'flex-start',
    paddingTop: 120, paddingLeft: 20,
  },
  menuBox: {
    backgroundColor: '#fff', borderRadius: 14, minWidth: 160,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 4 },
    elevation: 8, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  menuItemText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink },
  menuDivider: { height: 1, backgroundColor: '#F0F1F5' },

  overlay: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, position: 'absolute', bottom: 0, left: 0, right: 0 },
  overlayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 10 },
  overlayClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  overlayPass: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF0F3', borderWidth: 1, borderColor: 'rgba(255,75,106,0.3)', alignItems: 'center', justifyContent: 'center' },
  overlayLike: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  overlayPhoto: { width: '100%', height: 320, borderRadius: 18, marginBottom: 16 },
  overlayName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: colors.ink, marginBottom: 6 },
  overlayMeta: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#5A6072', marginBottom: 4 },
  commentBox: { marginTop: 8, backgroundColor: '#F8F9FF', borderRadius: 14, padding: 16, borderLeftWidth: 3, borderLeftColor: colors.blue },
  commentLabel: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11, color: '#9AA0B2', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  commentText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink, lineHeight: 22 },

  infoCard: { backgroundColor: '#F8F9FF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#EDEEF2' },
  chip: { backgroundColor: '#fff', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#E6E8EE' },
  chipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#5A6072' },
  promptCard: { backgroundColor: '#F8F9FF', borderRadius: 14, padding: 14 },
  promptQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: '#9AA0B2', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  promptA: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink, lineHeight: 22 },
});

