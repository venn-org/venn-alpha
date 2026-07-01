import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  PanResponder, Animated, Modal, TextInput,
  ScrollView, Pressable, Dimensions, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getBlockedIds, blockUser } from '../../lib/blocks';
import { calcAge } from '../../lib/age';
import ReportSheet from '../../components/ReportSheet';

const SW = Dimensions.get('window').width;

const STANDOUTS = [
  {
    id: 's1', name: 'Tanvi', age: 25, verified: false, _demo: true,
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80',
    area: 'Bandra West', rent: '₹18k / mo',
    prompt: 'The thing that makes my flat special',
    answer: 'sea-facing balcony and zero drama policy',
    flatType: '2 BHK · Has flat', occupation: 'Working professional',
    gender: 'Woman', food: 'Vegetarian', smoking: 'Non-smoker', moveIn: 'ASAP',
    extraPrompts: [
      { q: 'My flat in three words', a: 'bright, clean, peaceful' },
      { q: 'One non-negotiable in my flat', a: 'shoes off at the door, always' },
      { q: 'Living with me means', a: 'good vibes only — drama stays outside' },
    ],
  },
  {
    id: 's2', name: 'Manisha', age: 27, verified: true, _demo: true,
    photo: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80',
    area: 'Andheri East', rent: '₹12k / mo',
    prompt: 'My flat vibe is',
    answer: 'quiet evenings, good coffee, plants everywhere',
    flatType: '1 BHK · Has flat', occupation: 'Working professional',
    gender: 'Woman', food: 'Vegetarian', smoking: 'Non-smoker', moveIn: 'Next month',
    extraPrompts: [
      { q: 'My flat in three words', a: 'calm, green, cozy' },
      { q: 'One non-negotiable in my flat', a: 'no loud calls after 10pm' },
      { q: 'Living with me means', a: 'tea every evening, guaranteed' },
    ],
  },
  {
    id: 's3', name: 'Sakshi', age: 24, verified: true, _demo: true,
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80',
    area: 'Powai', rent: '₹15k / mo',
    prompt: 'One non-negotiable in my flat',
    answer: 'shoes off at the door, always',
    flatType: '2 BHK · Has flat', occupation: 'Student',
    gender: 'Woman', food: 'Non-veg', smoking: 'Non-smoker', moveIn: 'ASAP',
    extraPrompts: [
      { q: 'My flat in three words', a: 'organized, bright, lakeside' },
      { q: 'Living with me means', a: 'quiet study hours + chaotic weekends' },
      { q: 'My flat vibe is', a: 'IKEA meets jungle — plants and minimal clutter' },
    ],
  },
  {
    id: 's4', name: 'Rohan', age: 26, verified: false, _demo: true,
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
    area: 'Khar', rent: '₹20k / mo',
    prompt: 'Living with me means',
    answer: 'Sunday brunches, calm weekdays, loud Fridays',
    flatType: '3 BHK · Has flat', occupation: 'Working professional',
    gender: 'Man', food: 'Non-veg', smoking: 'Non-smoker', moveIn: 'Flexible',
    extraPrompts: [
      { q: 'My flat in three words', a: 'rooftop, social, chill' },
      { q: 'One non-negotiable in my flat', a: 'clean common areas, always' },
      { q: 'My flat vibe is', a: 'think Netflix + board game nights' },
    ],
  },
  {
    id: 's5', name: 'Divya', age: 22, verified: true, _demo: true,
    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80',
    area: 'Goregaon West', rent: '₹10k / mo',
    prompt: 'My flat in three words',
    answer: 'bright, clean, peaceful',
    flatType: '2 BHK · Has flat', occupation: 'Student',
    gender: 'Woman', food: 'Vegetarian', smoking: 'Non-smoker', moveIn: 'ASAP',
    extraPrompts: [
      { q: 'The thing that makes my flat special', a: 'huge balcony, morning sun, zero traffic noise' },
      { q: 'Living with me means', a: 'accountability buddy for workouts' },
      { q: 'One non-negotiable in my flat', a: 'keep the kitchen clean' },
    ],
  },
  {
    id: 's6', name: 'Kabir', age: 28, verified: false, _demo: true,
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80',
    area: 'Lower Parel', rent: '₹22k / mo',
    prompt: 'The best thing about my flat',
    answer: '10-min walk to everything that matters',
    flatType: '2 BHK · Has flat', occupation: 'Working professional',
    gender: 'Man', food: 'Non-veg', smoking: 'Occasionally', moveIn: 'ASAP',
    extraPrompts: [
      { q: 'My flat vibe is', a: 'industrial chic — exposed brick, good playlists' },
      { q: 'Living with me means', a: 'chef-level weekend meals, not kidding' },
      { q: 'One non-negotiable in my flat', a: 'respect the noise curfew on weeknights' },
    ],
  },
];

const DETAIL_ROWS = [
  { icon: 'home-outline',       label: 'Flat type',   key: 'flatType' },
  { icon: 'briefcase-outline',  label: 'Occupation',  key: 'occupation' },
  { icon: 'person-outline',     label: 'Gender',      key: 'gender' },
  { icon: 'restaurant-outline', label: 'Food habits', key: 'food' },
  { icon: 'ban-outline',        label: 'Smoking',     key: 'smoking' },
  { icon: 'heart-outline',      label: 'Move-in',     key: 'moveIn' },
];

export default function Standouts() {
  const insets = useSafeAreaInsets();
  const [displayIdx, setDisplayIdx] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [showKeySheet, setShowKeySheet] = useState(false);
  const [showKeysInfo, setShowKeysInfo] = useState(false);
  const [keyNote, setKeyNote] = useState('');
  const [keyTarget, setKeyTarget] = useState('');
  const [keyTargetId, setKeyTargetId] = useState(null);
  const [keyTargetDemo, setKeyTargetDemo] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  const pan = useRef(new Animated.ValueXY()).current;
  const nopeOpacity = useRef(new Animated.Value(0)).current;
  const roseOpacity = useRef(new Animated.Value(0)).current;

  const keySheetBackdrop = useRef(new Animated.Value(0)).current;
  const keySheetY = useRef(new Animated.Value(600)).current;
  const keysInfoBackdrop = useRef(new Animated.Value(0)).current;
  const keysInfoY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (showKeySheet) {
      Animated.parallel([
        Animated.timing(keySheetBackdrop, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.spring(keySheetY, { toValue: 0, friction: 10, tension: 60, useNativeDriver: false }),
      ]).start();
    } else {
      keySheetBackdrop.setValue(0);
      keySheetY.setValue(600);
    }
  }, [showKeySheet]);

  useEffect(() => {
    if (showKeysInfo) {
      Animated.parallel([
        Animated.timing(keysInfoBackdrop, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.spring(keysInfoY, { toValue: 0, friction: 10, tension: 60, useNativeDriver: false }),
      ]).start();
    } else {
      keysInfoBackdrop.setValue(0);
      keysInfoY.setValue(600);
    }
  }, [showKeysInfo]);

  function animateCloseKeySheet() {
    Animated.parallel([
      Animated.timing(keySheetBackdrop, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(keySheetY, { toValue: 600, duration: 220, useNativeDriver: false }),
    ]).start(() => setShowKeySheet(false));
  }

  function animateCloseKeysInfo() {
    Animated.parallel([
      Animated.timing(keysInfoBackdrop, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(keysInfoY, { toValue: 600, duration: 220, useNativeDriver: false }),
    ]).start(() => setShowKeysInfo(false));
  }

  const [profiles, setProfiles] = useState(STANDOUTS);

  const idxRef = useRef(0);
  const profileRef = useRef(profiles[0]);

  useEffect(() => {
    async function loadOwners() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const [{ data }, blockedIds] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, name, birthday, gender, verified, preferred_areas, budget, flat_type, photos')
            .neq('id', user.id)
            .eq('onboarding_done', true)
            .eq('user_type', 'owner')
            .limit(20),
          getBlockedIds(user.id),
        ]);
        if (data && data.length > 0) {
          const mapped = data.filter(p => !blockedIds.has(p.id)).map(p => {
            const age = calcAge(p.birthday) ?? 25;
            return {
              id: p.id, name: p.name ?? 'Unknown', age, verified: !!p.verified,
              photo: Array.isArray(p.photos) ? p.photos[0] : null,
              area: Array.isArray(p.preferred_areas) ? p.preferred_areas[0] : 'Mumbai',
              rent: p.budget ?? '₹15k / mo',
              prompt: 'About my flat', answer: 'A great place to call home',
              flatType: p.flat_type ?? '2 BHK · Has flat',
              occupation: 'Working professional', gender: p.gender ?? '—',
              food: '—', smoking: '—', moveIn: 'ASAP',
              extraPrompts: [],
            };
          });
          setProfiles(mapped);
        }
      } catch (_) {
        // keep demo data on error
      }
    }
    loadOwners();
  }, []);

  useEffect(() => {
    profileRef.current = profiles[displayIdx % profiles.length];
  }, [displayIdx, profiles]);

  const rotate = pan.x.interpolate({
    inputRange: [-SW, 0, SW],
    outputRange: ['-20deg', '0deg', '20deg'],
  });

  function openKeySheet(name, id, demo) {
    setKeyTarget(name);
    setKeyTargetId(id ?? null);
    setKeyTargetDemo(!!demo);
    setKeyNote('');
    setShowKeySheet(true);
  }

  async function sendKey() {
    setShowKeySheet(false);
    if (!keyTargetId || keyTargetDemo) return;
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;
      const { error } = await supabase.from('likes').insert({ from_user_id: uid, to_user_id: keyTargetId, comment: keyNote || null });
      if (error) Alert.alert('Could not send', error.message);
    } catch (e) {
      Alert.alert('Could not send', e.message);
    }
  }

  function advanceCard(liked) {
    const swipeDir = liked ? SW * 1.4 : -SW * 1.4;
    Animated.timing(pan, {
      toValue: { x: swipeDir, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      pan.setValue({ x: 0, y: 0 });
      nopeOpacity.setValue(0);
      roseOpacity.setValue(0);
      const prev = profileRef.current;
      idxRef.current += 1;
      setDisplayIdx(idxRef.current);
      if (liked) openKeySheet(prev.name, prev.id, prev._demo);
    });
  }

  async function handleBlock(target) {
    setProfiles(prev => prev.filter(p => p.id !== target.id));
    if (!target?.id || target._demo) return;
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id;
    if (!uid) return;
    const { error } = await blockUser(uid, target.id);
    if (error) Alert.alert('Could not block', error.message);
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        pan.setValue({ x: gs.dx, y: 0 });
        nopeOpacity.setValue(gs.dx < -20 ? Math.min(1, (-gs.dx - 20) / 80) : 0);
        roseOpacity.setValue(gs.dx > 20 ? Math.min(1, (gs.dx - 20) / 80) : 0);
      },
      onPanResponderRelease: (_, gs) => {
        const wasTap = Math.abs(gs.dx) < 8 && Math.abs(gs.dy) < 8;
        if (gs.dx > 90) {
          advanceCard(true);
        } else if (gs.dx < -90) {
          advanceCard(false);
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          nopeOpacity.setValue(0);
          roseOpacity.setValue(0);
          if (wasTap) setShowProfile(true);
        }
      },
    })
  ).current;

  if (profiles.length === 0) {
    return (
      <View style={[s.root, { paddingTop: insets.top + 14, alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
        <Ionicons name="home-outline" size={48} color="rgba(255,255,255,0.25)" />
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>No standouts right now</Text>
      </View>
    );
  }

  const profile = profiles[displayIdx % profiles.length];
  const dotIdx = displayIdx % profiles.length;

  return (
    <View style={[s.root, { paddingTop: insets.top + 14 }]}>
      {/* Menu (report / block) */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={s.menuBox}>
            <TouchableOpacity style={s.menuItem} activeOpacity={0.7} onPress={() => { setMenuOpen(false); handleBlock(profile); }}>
              <Ionicons name="ban-outline" size={16} color="#14161B" />
              <Text style={s.menuItemText}>Block</Text>
            </TouchableOpacity>
            <View style={s.menuDivider} />
            <TouchableOpacity style={s.menuItem} activeOpacity={0.7} onPress={() => { setMenuOpen(false); setReportTarget(profile); }}>
              <Ionicons name="flag-outline" size={16} color="#FF4D6A" />
              <Text style={[s.menuItemText, { color: '#FF4D6A' }]}>Report</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Top bar */}
      <View style={s.topBar}>
        <View style={{ flex: 1 }}>
          <View style={s.titleRow}>
            <Text style={s.title}>Standouts</Text>
            <View style={s.ownersBadge}>
              <Text style={s.ownersText}>FLAT OWNERS</Text>
            </View>
          </View>
          <Text style={s.subtitle}>People with a flat ready. Send a Key 🔑 to connect.</Text>
        </View>
        <TouchableOpacity style={s.keysBtn} onPress={() => setShowKeysInfo(true)}>
          <Text style={{ fontSize: 16 }}>🔑</Text>
          <Text style={s.keysLabel}>Keys (∞)</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable card */}
      <View style={s.cardArea}>
        <Animated.View
          style={[s.card, { transform: [{ translateX: pan.x }, { rotate }] }]}
          {...panResponder.panHandlers}
        >
          {profile.photo
            ? <Image source={{ uri: profile.photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1E1E2E', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person" size={72} color="rgba(255,255,255,0.15)" />
              </View>
          }
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.85)']}
            locations={[0.25, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* NOPE swipe indicator */}
          <Animated.View style={[s.swipeLabel, s.nopeIndicator, { opacity: nopeOpacity }]}>
            <Text style={[s.swipeLabelText, { color: '#FF4D6A', borderColor: '#FF4D6A' }]}>NOPE</Text>
          </Animated.View>
          {/* KEY swipe indicator */}
          <Animated.View style={[s.swipeLabel, s.keyIndicator, { opacity: roseOpacity }]}>
            <Text style={[s.swipeLabelText, { color: '#8A5BFF', borderColor: '#8A5BFF' }]}>KEY 🔑</Text>
          </Animated.View>

          {/* Has flat badge */}
          <View style={s.hasFlatBadge}>
            <Text style={{ fontSize: 12 }}>🏠</Text>
            <Text style={s.hasFlatText}>Has flat</Text>
          </View>
          {/* Rent badge */}
          <View style={s.rentBadge}>
            <Text style={s.rentText}>{profile.rent}</Text>
          </View>
          {/* Overflow menu (report / block) */}
          <TouchableOpacity style={s.cardMenuBtn} onPress={() => setMenuOpen(true)} activeOpacity={0.85}>
            <Ionicons name="ellipsis-vertical" size={15} color="#fff" />
          </TouchableOpacity>

          {/* Bottom info overlay */}
          <View style={s.cardBottom}>
            <View style={s.nameRow}>
              <Text style={s.cardName}>{profile.name}</Text>
              <Text style={s.cardAge}>{profile.age}</Text>
              {profile.verified && (
                <View style={s.verifiedBadge}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </View>
            <View style={s.areaRow}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={s.areaText}>{profile.area}</Text>
            </View>
            {/* Prompt card with inline 🔑 button */}
            <View style={s.promptCard}>
              <Text style={s.promptQ}>{profile.prompt}</Text>
              <Text style={[s.promptA, { paddingBottom: 36 }]}>{profile.answer}</Text>
              <TouchableOpacity
                style={s.keyOverlayBtn}
                onPress={() => openKeySheet(profile.name, profile.id)}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 18 }}>🔑</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 🔑 button on photo (bottom-right) */}
          <TouchableOpacity
            style={s.photoKeyBtn}
            onPress={() => openKeySheet(profile.name, profile.id)}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 18 }}>🔑</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Dot indicators */}
      <View style={s.dots}>
        {profiles.map((_, i) => (
          <View
            key={i}
            style={[s.dot, {
              width: i === dotIdx ? 20 : 6,
              backgroundColor: i === dotIdx ? '#8A5BFF' : 'rgba(255,255,255,0.25)',
            }]}
          />
        ))}
      </View>

      <View style={{ height: insets.bottom || 8 }} />

      {/* Floating X skip button — bottom left, same as home page */}
      <TouchableOpacity
        style={[s.skipBtn, { bottom: insets.bottom + 28 }]}
        onPress={() => advanceCard(false)}
        activeOpacity={0.85}
      >
        <Ionicons name="close" size={26} color="#FF4D6A" />
      </TouchableOpacity>

      {/* Full profile modal */}
      <Modal visible={showProfile} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowProfile(false)} />
          <View style={[s.profileCard, {
            position: 'absolute',
            top: insets.top + 10,
            bottom: insets.bottom + 10,
            left: 20,
            right: 20,
          }]}>
            {/* Sticky top bar */}
            <View style={s.profileTopBar}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={s.closeCircle} onPress={() => setShowProfile(false)}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={s.closeCircle} onPress={() => setMenuOpen(true)}>
                  <Ionicons name="ellipsis-vertical" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={s.profilePassCircle}
                  onPress={() => { setShowProfile(false); advanceCard(false); }}
                >
                  <Ionicons name="close" size={20} color="#FF4D6A" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.profileKeyCircle}
                  onPress={() => { setShowProfile(false); openKeySheet(profile.name, profile.id); }}
                >
                  <Text style={{ fontSize: 18 }}>🔑</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
              <View style={{ padding: 14, paddingTop: 0, paddingBottom: 24 }}>

                {/* Hero photo with 🔑 button bottom-right */}
                <View style={s.heroWrap}>
                  <Image source={{ uri: profile.photo }} style={s.heroImg} resizeMode="cover" />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.75)']}
                    locations={[0.45, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={s.heroInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                      <Text style={s.heroName}>{profile.name}</Text>
                      <Text style={s.heroAge}>{profile.age}</Text>
                      {profile.verified && (
                        <View style={[s.verifiedBadge, { marginBottom: 4 }]}>
                          <Ionicons name="checkmark" size={10} color="#fff" />
                        </View>
                      )}
                    </View>
                  </View>
                  {/* 🔑 on hero photo */}
                  <TouchableOpacity
                    style={s.heroKeyBtn}
                    onPress={() => { setShowProfile(false); openKeySheet(profile.name, profile.id); }}
                    activeOpacity={0.85}
                  >
                    <Text style={{ fontSize: 18 }}>🔑</Text>
                  </TouchableOpacity>
                </View>

                {/* Info grid */}
                <View style={s.infoGrid}>
                  <View style={s.infoGridTop}>
                    {[
                      { label: 'AGE', value: String(profile.age), color: '#fff' },
                      { label: 'AREA', value: profile.area, color: '#fff' },
                      { label: 'RENT', value: profile.rent, color: '#C4AAFF' },
                    ].map((cell, i, arr) => (
                      <View
                        key={cell.label}
                        style={[s.infoCell, i < arr.length - 1 && { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.07)' }]}
                      >
                        <Text style={s.infoCellLabel}>{cell.label}</Text>
                        <Text style={[s.infoCellValue, { color: cell.color }]}>{cell.value}</Text>
                      </View>
                    ))}
                  </View>
                  {DETAIL_ROWS.map((row, i) => (
                    <View
                      key={row.key}
                      style={[s.infoRow, i < DETAIL_ROWS.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' }]}
                    >
                      <Ionicons name={row.icon} size={18} color="rgba(255,255,255,0.45)" />
                      <Text style={s.infoRowLabel}>{row.label}</Text>
                      <Text style={s.infoRowValue}>{profile[row.key]}</Text>
                    </View>
                  ))}
                </View>

                {/* Main prompt with 🔑 button */}
                <View style={s.profilePromptWrap}>
                  <Text style={s.profilePromptQ}>{profile.prompt}</Text>
                  <Text style={[s.profilePromptA, { paddingBottom: 36 }]}>"{profile.answer}"</Text>
                  <TouchableOpacity
                    style={s.promptKeyBtn}
                    onPress={() => { setShowProfile(false); openKeySheet(profile.name, profile.id); }}
                    activeOpacity={0.85}
                  >
                    <Text style={{ fontSize: 18 }}>🔑</Text>
                  </TouchableOpacity>
                </View>

                {/* Extra prompts with 🔑 button each */}
                {profile.extraPrompts.map(ep => (
                  <View key={ep.q} style={s.profilePromptWrap}>
                    <Text style={s.profilePromptQ}>{ep.q}</Text>
                    <Text style={[s.profilePromptA, { paddingBottom: 36 }]}>"{ep.a}"</Text>
                    <TouchableOpacity
                      style={s.promptKeyBtn}
                      onPress={() => { setShowProfile(false); openKeySheet(profile.name, profile.id); }}
                      activeOpacity={0.85}
                    >
                      <Text style={{ fontSize: 18 }}>🔑</Text>
                    </TouchableOpacity>
                  </View>
                ))}

              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Keys info bottom sheet */}
      <Modal visible={showKeysInfo} transparent animationType="slide">
        <Pressable style={s.sheetOverlay} onPress={() => setShowKeysInfo(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <View style={s.sheetIconCircle}>
              <Text style={{ fontSize: 28 }}>🔑</Text>
            </View>
            <Text style={s.sheetTitle}>Send a Key</Text>
            <Text style={s.sheetBody}>
              Standouts are people who{' '}
              <Text style={{ fontWeight: '700', color: '#14161B' }}>already have a flat</Text>
              {' '}and are looking for the right flatmate. Send them a Key 🔑 — it tells them you're genuinely interested and puts you at the top of their list.
            </Text>
            <TouchableOpacity style={s.sheetCta} onPress={() => setShowKeysInfo(false)}>
              <Text style={s.sheetCtaText}>You have ∞ Keys — go send one!</Text>
            </TouchableOpacity>
            <View style={{ height: insets.bottom + 8 }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Key send bottom sheet */}
      <Modal visible={showKeySheet} transparent animationType="slide">
        <Pressable style={s.sheetOverlay} onPress={() => setShowKeySheet(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <View style={s.keySheetIcon}>
                <Text style={{ fontSize: 18 }}>🔑</Text>
              </View>
              <Text style={s.keySheetName}>{keyTarget}</Text>
            </View>
            <Text style={s.keySheetHint}>Add a note with your Key 🔑 (optional)</Text>
            <TextInput
              style={s.keySheetInput}
              placeholder="Tell them why you're interested in their flat..."
              placeholderTextColor="#9AA0B2"
              multiline
              maxLength={120}
              value={keyNote}
              onChangeText={setKeyNote}
            />
            <View style={{ flexDirection: 'row', gap: 10, paddingTop: 14, paddingBottom: insets.bottom + 16 }}>
              <TouchableOpacity style={s.keySheetCancel} onPress={() => setShowKeySheet(false)}>
                <Text style={s.keySheetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.keySheetSend}
                onPress={sendKey}
              >
                <Text style={s.keySheetSendText}>Send Key 🔑</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ReportSheet
        visible={!!reportTarget}
        targetId={reportTarget?.id}
        targetName={reportTarget?.name}
        onClose={() => setReportTarget(null)}
        onSubmitted={() => Alert.alert('Report submitted', "Thanks — we'll review it.")}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111' },

  // Top bar
  topBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.7 },
  ownersBadge: { backgroundColor: 'rgba(138,91,255,0.22)', borderWidth: 1, borderColor: 'rgba(138,91,255,0.45)', borderRadius: 50, paddingVertical: 3, paddingHorizontal: 10 },
  ownersText: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, fontWeight: '700', color: '#C4AAFF', letterSpacing: 0.9 },
  subtitle: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 16.8 },
  keysBtn: { flexShrink: 0, alignItems: 'center', gap: 4, backgroundColor: '#1E0F38', borderRadius: 16, padding: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(138,91,255,0.35)' },
  keysLabel: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, fontWeight: '700', color: '#8A5BFF' },

  // Card
  cardArea: { flex: 1, position: 'relative' },
  card: { position: 'absolute', top: 0, bottom: 0, left: 14, right: 14, borderRadius: 20, overflow: 'hidden' },

  // Swipe indicators
  swipeLabel: { position: 'absolute', top: 36 },
  nopeIndicator: { left: 24, transform: [{ rotate: '-15deg' }] },
  keyIndicator: { right: 24, transform: [{ rotate: '15deg' }] },
  swipeLabelText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, fontWeight: '800', letterSpacing: 1, borderWidth: 3, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },

  // Card badges
  hasFlatBadge: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 50, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  hasFlatText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.4 },
  rentBadge: { position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 50, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  rentText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, fontWeight: '700', color: '#C4AAFF' },
  cardMenuBtn: {
    position: 'absolute', top: 54, right: 14,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  menuBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingTop: 120, paddingRight: 20,
  },
  menuBox: {
    backgroundColor: '#fff', borderRadius: 14, minWidth: 160,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 4 },
    elevation: 8, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  menuItemText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#14161B' },
  menuDivider: { height: 1, backgroundColor: '#F0F1F5' },

  // 🔑 button on main card photo (bottom-right, same position as home heart)
  photoKeyBtn: {
    position: 'absolute', bottom: 14, right: 14,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  // Card bottom overlay
  cardBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 18 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  cardAge: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 20, color: 'rgba(255,255,255,0.75)' },
  verifiedBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#8A5BFF', alignItems: 'center', justifyContent: 'center' },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  areaText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  // Prompt card on main swipe card with inline 🔑 button
  promptCard: { position: 'relative', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  promptQ: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 },
  promptA: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, fontWeight: '700', color: '#fff', lineHeight: 22 },
  // 🔑 inside prompt card (bottom-right)
  keyOverlayBtn: {
    position: 'absolute', bottom: 10, right: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Dot indicators
  dots: { flexShrink: 0, flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingBottom: 8 },
  dot: { height: 6, borderRadius: 3 },

  // Floating X skip — same style as home page
  skipBtn: {
    position: 'absolute',
    left: 22,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },

  // Full profile overlay
  profileCard: { backgroundColor: '#0A0A0A', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  profileTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 10, backgroundColor: 'rgba(26,26,46,0.95)' },
  closeCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  profilePassCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,75,106,0.4)', alignItems: 'center', justifyContent: 'center' },
  profileKeyCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8A5BFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#8A5BFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 6 },

  // Hero photo
  heroWrap: { borderRadius: 16, overflow: 'hidden', marginBottom: 12, position: 'relative' },
  heroImg: { width: '100%', height: 380 },
  heroInfo: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  heroName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.6 },
  heroAge: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 22, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  // 🔑 on hero photo — same position/style as home page heart button
  heroKeyBtn: {
    position: 'absolute', bottom: 14, right: 14,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  // Info grid
  infoGrid: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  infoGridTop: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  infoCell: { flex: 1, minWidth: 80, padding: 14, alignItems: 'center' },
  infoCellLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  infoCellValue: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, fontWeight: '700', color: '#fff' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, paddingHorizontal: 16 },
  infoRowLabel: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.55)', flex: 1 },
  infoRowValue: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, fontWeight: '600', color: '#fff' },

  // Profile prompts with 🔑 button — same as home page prompt heart
  profilePromptWrap: {
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, paddingHorizontal: 18,
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  profilePromptQ: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.9 },
  profilePromptA: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, fontWeight: '700', color: '#fff', lineHeight: 24 },
  // 🔑 inside each prompt card
  promptKeyBtn: {
    position: 'absolute', bottom: 12, right: 12,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Bottom sheets
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingTop: 24 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  sheetIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, fontWeight: '800', color: '#14161B', textAlign: 'center', marginBottom: 10, letterSpacing: -0.4 },
  sheetBody: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: '#5A6072', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  sheetCta: { backgroundColor: '#8A5BFF', borderRadius: 50, padding: 16, alignItems: 'center' },
  sheetCtaText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, fontWeight: '700', color: '#fff' },

  // Key send sheet
  keySheetIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center' },
  keySheetName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, fontWeight: '700', color: '#14161B' },
  keySheetHint: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', marginBottom: 16 },
  keySheetInput: { width: '100%', minHeight: 90, borderWidth: 1.5, borderColor: '#E6E8EE', borderRadius: 14, padding: 14, fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: '#14161B', textAlignVertical: 'top', lineHeight: 22 },
  keySheetCancel: { flex: 1, backgroundColor: '#F2F3F7', borderRadius: 50, padding: 14, alignItems: 'center' },
  keySheetCancelText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, fontWeight: '600', color: '#14161B' },
  keySheetSend: { flex: 2, backgroundColor: '#8A5BFF', borderRadius: 50, padding: 14, alignItems: 'center' },
  keySheetSendText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, fontWeight: '700', color: '#fff' },
});
