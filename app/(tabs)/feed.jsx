import { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Modal, Pressable, Dimensions, TextInput, Animated, Alert,
} from 'react-native';

const SCREEN_H = Dimensions.get('window').height;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getBlockedIds, blockUser } from '../../lib/blocks';
import ReportSheet from '../../components/ReportSheet';
import PreferencesSheet, {
  AREA_GROUPS, ALL_PREDEFINED_AREAS, PREF_SECTIONS, VENN_PLUS_ROWS, INIT_PREFS,
  getPrefDisplay, isPrefSet, savePrefsToSupabase,
} from '../../components/PreferencesSheet';


// ─── Filter chip config (top bar quick chips) ────────────────────────────────
const FILTER_CHIPS = [
  { label: 'Area',      key: 'areas' },
  { label: 'Budget',    key: 'budget' },
  { label: 'Flat type', key: 'flatType' },
  { label: 'Move-in',   key: 'moveIn' },
  { label: 'Gender',    key: 'gender' },
];

// ─── Helper ──────────────────────────────────────────────────────────────────

function findRow(key) {
  for (const sec of PREF_SECTIONS) {
    const row = sec.rows.find(r => r.key === key);
    if (row) return row;
  }
  return null;
}

// ─── Quick filter sheet (single preference, opened from chips) ────────────────

function QuickFilterSheet({ rowKey, visible, prefs, onClose, onSave }) {
  const insets = useSafeAreaInsets();
  const row = rowKey ? findRow(rowKey) : null;
  const [draft, setDraft] = useState(null);
  const [otherInput, setOtherInput] = useState('');
  const [showOther, setShowOther] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible && row) {
      setDraft(row.multi ? (Array.isArray(prefs[rowKey]) ? [...prefs[rowKey]] : []) : (prefs[rowKey] ?? null));
      setOtherInput('');
      setShowOther(false);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.spring(sheetY, { toValue: 0, friction: 10, tension: 60, useNativeDriver: false }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      sheetY.setValue(600);
    }
  }, [visible, rowKey]);

  function animateClose() {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(sheetY, { toValue: 600, duration: 220, useNativeDriver: false }),
    ]).start(() => onClose());
  }

  if (!row) return null;

  function toggle(opt) {
    if (row.multi) {
      setDraft(d => {
        const cur = Array.isArray(d) ? d : [];
        return cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt];
      });
    } else {
      setDraft(d => d === opt ? null : opt);
    }
  }

  function sel(opt) {
    if (row.multi) return (Array.isArray(draft) ? draft : []).includes(opt);
    return draft === opt;
  }

  function addCustom() {
    const val = otherInput.trim();
    if (!val) return;
    setDraft(d => {
      const cur = Array.isArray(d) ? d : [];
      return cur.includes(val) ? cur : [...cur, val];
    });
    setOtherInput('');
    setShowOther(false);
  }

  function removeCustom(a) {
    setDraft(d => (Array.isArray(d) ? d : []).filter(x => x !== a));
  }

  const isAreas = rowKey === 'areas';
  const customAreas = isAreas ? (Array.isArray(draft) ? draft : []).filter(a => !ALL_PREDEFINED_AREAS.includes(a)) : [];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        <Animated.View style={[qs.sheet, { paddingBottom: insets.bottom + 8, transform: [{ translateY: sheetY }] }]}>
          <View style={qs.handle} />
          <View style={qs.header}>
            <Text style={qs.title}>{row.label}</Text>
            <TouchableOpacity style={qs.closeBtn} onPress={animateClose} activeOpacity={0.7}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }} contentContainerStyle={qs.opts}>
            {isAreas ? (
              <>
                {AREA_GROUPS.map(group => (
                  <View key={group.city} style={{ width: '100%' }}>
                    <Text style={qs.groupLabel}>{group.city}</Text>
                    <View style={qs.groupChips}>
                      {group.areas.map(opt => (
                        <TouchableOpacity key={opt} style={[qs.chip, sel(opt) && qs.chipOn]} onPress={() => toggle(opt)} activeOpacity={0.8}>
                          <Text style={[qs.chipText, sel(opt) && qs.chipTextOn]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
                {customAreas.length > 0 && (
                  <View style={{ width: '100%' }}>
                    <Text style={qs.groupLabel}>Other</Text>
                    <View style={qs.groupChips}>
                      {customAreas.map(a => (
                        <TouchableOpacity key={a} style={[qs.chip, qs.chipOn, qs.chipCustom]} onPress={() => removeCustom(a)} activeOpacity={0.8}>
                          <Text style={[qs.chipText, qs.chipTextOn]}>{a}</Text>
                          <Ionicons name="close" size={12} color="#fff" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                {showOther ? (
                  <View style={qs.otherRow}>
                    <TextInput style={qs.otherInput} placeholder="Type a location..." placeholderTextColor="#9AA0B2" value={otherInput} onChangeText={setOtherInput} autoFocus returnKeyType="done" onSubmitEditing={addCustom} />
                    <TouchableOpacity style={qs.otherAddBtn} onPress={addCustom} activeOpacity={0.8}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={[qs.chip, qs.chipDashed]} onPress={() => setShowOther(true)} activeOpacity={0.8}>
                    <Ionicons name="add" size={14} color={colors.slate} />
                    <Text style={[qs.chipText, { marginLeft: 4 }]}>Other</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              row.opts.map(opt => (
                <TouchableOpacity key={opt} style={[qs.chip, sel(opt) && qs.chipOn]} onPress={() => toggle(opt)} activeOpacity={0.8}>
                  <Text style={[qs.chipText, sel(opt) && qs.chipTextOn]}>{opt}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View style={qs.footer}>
            <TouchableOpacity onPress={() => { onSave(rowKey, draft); animateClose(); }} activeOpacity={0.85}>
              <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={qs.applyBtn}>
                <Text style={qs.applyText}>Apply</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Demo & normalise ─────────────────────────────────────────────────────────

const priyaPhoto = require('../../assets/priya.webp');

const DEMO = [
  {
    id: 'd1',
    name: 'Priya', overlap: 87, age: 24, pronouns: 'she/her',
    verified: true, active: 'Active today',
    photo: null, localPhoto: priyaPhoto,
    area: 'Andheri', gender: 'Woman', job: 'UX Designer at Swiggy',
    flatPhoto: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
    flatLabel: 'Their flat · Andheri West',
    prompts: [
      { q: 'My ideal noise level at home is', a: 'chill background music, never dead silent' },
      { q: 'I handle shared chores by', a: 'making a rota nobody actually sticks to, then doing it myself anyway' },
      { q: 'My room aesthetic is', a: 'organised chaos with very good lighting', accent: true },
    ],
    _demo: true,
  },
  {
    id: 'd2',
    name: 'Arjun', overlap: 74, age: 26, pronouns: 'he/him',
    verified: false, active: 'Active 2h ago',
    photo: 'https://i.pravatar.cc/700?img=11',
    area: 'Bandra', gender: 'Man', job: 'Software Engineer at Zepto',
    flatPhoto: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    flatLabel: 'Their flat · Bandra West',
    prompts: [
      { q: "You'll know we're compatible if", a: 'you also leave appliances on standby and feel guilty about it' },
      { q: 'My go-to Sunday plan', a: 'brunch somewhere good, then absolutely nothing', accent: true },
    ],
    _demo: true,
  },
  {
    id: 'd3',
    name: 'Anika', overlap: 68, age: 23, pronouns: 'she/her',
    verified: false, active: 'Active 1h ago',
    photo: 'https://i.pravatar.cc/700?img=45',
    area: 'Powai', gender: 'Woman', job: 'Financial Analyst at KPMG',
    flatPhoto: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    flatLabel: 'Their flat · Powai',
    prompts: [
      { q: 'My ideal flatmate is', a: 'someone who respects quiet hours but is still up for spontaneous chai runs', accent: true },
    ],
    _demo: true,
  },
];

function normaliseProfile(p) {
  const age = p.birthday
    ? Math.floor((Date.now() - new Date(p.birthday).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;
  return {
    id: p.id, name: p.name ?? 'Unknown', overlap: null, age,
    pronouns: Array.isArray(p.pronouns) ? p.pronouns.join('/') : null,
    verified: !!p.verified, active: null,
    photo: Array.isArray(p.photos) ? p.photos[0] : null,
    photos: Array.isArray(p.photos) ? p.photos : [],
    area: Array.isArray(p.preferred_areas) ? p.preferred_areas[0] : null,
    preferred_areas: Array.isArray(p.preferred_areas) ? p.preferred_areas : [],
    budget: p.budget ?? null,
    gender: p.gender ?? null,
    job: [p.job_title, p.job_company].filter(Boolean).join(' at ') || null,
    job_title: p.job_title ?? null,
    job_company: p.job_company ?? null,
    education_school: p.education_school ?? null,
    education_level: p.education_level ?? null,
    flatPhoto: null, flatLabel: null,
    prompts: Array.isArray(p.prompts) ? p.prompts : [],
  };
}

function scoreProfile(profile, prefs) {
  let matched = 0, total = 0;
  if (prefs.areas && prefs.areas.length > 0) {
    total++;
    if (profile.preferred_areas.some(a => prefs.areas.includes(a))) matched++;
  }
  if (prefs.gender) {
    total++;
    if (!profile.gender || profile.gender === prefs.gender) matched++;
  }
  if (prefs.budget && profile.budget) {
    total++;
    if (prefs.budget === profile.budget) matched++;
  }
  if (total === 0) return 100;
  return Math.round((matched / total) * 100);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Match modal ──────────────────────────────────────────────────────────────

function MatchModal({ visible, myName, myPhoto, theirName, theirPhoto, onMessage, onClose }) {
  const fade    = useRef(new Animated.Value(0)).current;
  const leftX   = useRef(new Animated.Value(-100)).current;
  const rightX  = useRef(new Animated.Value(100)).current;
  const textY   = useRef(new Animated.Value(28)).current;
  const textOp  = useRef(new Animated.Value(0)).current;
  const pulse   = useRef(new Animated.Value(1)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      loopRef.current?.stop();
      return;
    }
    fade.setValue(0);
    leftX.setValue(-100);
    rightX.setValue(100);
    textY.setValue(28);
    textOp.setValue(0);
    pulse.setValue(1);

    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: false }),
      Animated.parallel([
        Animated.spring(leftX,  { toValue: 0, friction: 7, tension: 50, useNativeDriver: false }),
        Animated.spring(rightX, { toValue: 0, friction: 7, tension: 50, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.timing(textOp, { toValue: 1, duration: 350, useNativeDriver: false }),
        Animated.spring(textY,  { toValue: 0, friction: 9, useNativeDriver: false }),
      ]),
    ]).start();

    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 1000, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1,    duration: 1000, useNativeDriver: false }),
      ])
    );
    loopRef.current.start();
    return () => loopRef.current?.stop();
  }, [visible]);

  const AVATAR_SIZE = 92;

  function avatar(photo, name, dx) {
    const init = ((name || '?')[0] ?? '?').toUpperCase();
    return (
      <Animated.View style={{ transform: [{ translateX: dx }] }}>
        <LinearGradient
          colors={[colors.blue, colors.violet]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{
            width: AVATAR_SIZE + 6, height: AVATAR_SIZE + 6,
            borderRadius: (AVATAR_SIZE + 6) / 2,
            padding: 3, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <View style={{
            width: AVATAR_SIZE, height: AVATAR_SIZE,
            borderRadius: AVATAR_SIZE / 2, overflow: 'hidden',
            borderWidth: 3, borderColor: '#080A14',
            backgroundColor: '#1C1E30', alignItems: 'center', justifyContent: 'center',
          }}>
            {photo
              ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              : <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 36, color: '#fff' }}>{init}</Text>
            }
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#080A14', opacity: fade }]}>
        {/* Background glow blobs */}
        <Animated.View style={{
          position: 'absolute', top: '15%', left: '-10%',
          width: 300, height: 300, borderRadius: 150,
          backgroundColor: 'rgba(51,92,255,0.16)',
          transform: [{ scale: pulse }],
        }} />
        <Animated.View style={{
          position: 'absolute', top: '18%', right: '-10%',
          width: 300, height: 300, borderRadius: 150,
          backgroundColor: 'rgba(138,91,255,0.16)',
          transform: [{ scale: pulse }],
        }} />

        {/* Content */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>

          {/* Overlapping avatars */}
          <View style={{ flexDirection: 'row', marginBottom: 36 }}>
            {avatar(myPhoto, myName, leftX)}
            <View style={{ marginLeft: -22 }}>
              {avatar(theirPhoto, theirName, rightX)}
            </View>
          </View>

          {/* Text block */}
          <Animated.View style={{ alignItems: 'center', opacity: textOp, transform: [{ translateY: textY }], width: '100%' }}>
            <LinearGradient
              colors={[colors.blue, colors.violet]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: 50, paddingVertical: 7, paddingHorizontal: 22, marginBottom: 22 }}
            >
              <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: '#fff', letterSpacing: 2 }}>
                ✦  IT'S A MATCH
              </Text>
            </LinearGradient>

            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, color: '#fff', textAlign: 'center', letterSpacing: -0.6, lineHeight: 34, marginBottom: 10 }}>
              {myName} & {theirName}
            </Text>
            <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 44 }}>
              You both liked each other
            </Text>

            <TouchableOpacity onPress={onMessage} activeOpacity={0.88} style={{ width: '100%', marginBottom: 14 }}>
              <LinearGradient
                colors={[colors.blue, colors.violet]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ borderRadius: 50, paddingVertical: 17, alignItems: 'center' }}
              >
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff' }}>
                  Send a message
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ paddingVertical: 12, width: '100%', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: 'rgba(255,255,255,0.38)' }}>
                Keep swiping
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Profile card ─────────────────────────────────────────────────────────────

function ProfileCard({ profile, onBack, canBack, onSkip, onLike, onBlock, onReport }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const accentPrompt = profile.prompts?.find(p => p.accent);
  const regPrompts = profile.prompts?.filter(p => !p.accent) ?? [];

  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fadeIn.setValue(0);
    Animated.timing(fadeIn, { toValue: 1, duration: 280, useNativeDriver: false }).start();
  }, [profile.id]);

  return (
    <Animated.View style={[s.cardOuter, { opacity: fadeIn }]}>
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={s.menuBox}>
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuOpen(false); onSkip(); }} activeOpacity={0.7}>
              <Ionicons name="close-circle-outline" size={16} color={colors.ink} />
              <Text style={s.menuItemText}>Remove</Text>
            </TouchableOpacity>
            <View style={s.menuDivider} />
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

      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={s.nameRow}>
            <Text style={s.name}>{profile.name}</Text>
            {profile.verified && (
              <View style={s.verifiedBadge}>
                <Ionicons name="checkmark" size={10} color="#fff" />
              </View>
            )}
            {profile.overlap ? (
              <LinearGradient
                colors={[colors.blue, colors.violet]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.overlapPill}
              >
                <Text style={s.overlapText}>{profile.overlap}% overlap</Text>
              </LinearGradient>
            ) : null}
          </View>
          <View style={s.statusRow}>
            {profile.pronouns && <Text style={s.pronouns}>{profile.pronouns}</Text>}
            {profile.pronouns && profile.active && <Text style={s.dot}> · </Text>}
            {profile.active && <Text style={s.active}>{profile.active}</Text>}
          </View>
        </View>
        <View style={s.navBtns}>
          <TouchableOpacity
            style={[s.navBtn, !canBack && { opacity: 0.3 }]}
            onPress={onBack} disabled={!canBack} activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={16} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={s.navBtn} onPress={() => setMenuOpen(true)} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={14} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.photoWrap}>
        {profile.localPhoto || profile.photo ? (
          <Image
            source={profile.localPhoto ?? { uri: profile.photo }}
            style={s.photo}
            resizeMode="cover"
          />
        ) : (
          <View style={[s.photo, s.photoPlaceholder]}>
            <Ionicons name="person" size={60} color={colors.mist} />
          </View>
        )}
        <TouchableOpacity style={s.heartBtn} onPress={onLike} activeOpacity={0.8}>
          <Ionicons name="heart-outline" size={20} color={colors.ink} />
        </TouchableOpacity>
      </View>

      <View style={s.infoCard}>
        <View style={s.infoRow}>
          <View style={s.infoItem}>
            <Ionicons name="calendar-outline" size={15} color="#9AA0B2" />
            <Text style={s.infoItemText}>{profile.age ?? '—'}</Text>
          </View>
          <View style={s.infoDivider} />
          <View style={s.infoItem}>
            <Ionicons name="person-outline" size={15} color="#9AA0B2" />
            <Text style={s.infoItemText}>{profile.gender ?? '—'}</Text>
          </View>
          <View style={s.infoDivider} />
          <View style={s.infoItem}>
            <Ionicons name="location-outline" size={15} color="#9AA0B2" />
            <Text style={s.infoItemText}>{profile.area ?? '—'}</Text>
          </View>
        </View>
        {profile.job ? (
          <>
            <View style={s.infoHorizDivider} />
            <View style={[s.infoItem, { paddingTop: 12 }]}>
              <Ionicons name="briefcase-outline" size={15} color="#9AA0B2" />
              <Text style={s.infoItemText}>{profile.job}</Text>
            </View>
          </>
        ) : null}
      </View>

      {regPrompts.map((p, i) => (
        <View key={i} style={s.promptWhite}>
          <Text style={s.promptQ}>{p.q}</Text>
          <Text style={s.promptA}>{p.a}</Text>
          <TouchableOpacity style={s.promptHeartGray} onPress={onLike} activeOpacity={0.7}>
            <Ionicons name="heart-outline" size={20} color={colors.ink} />
          </TouchableOpacity>
        </View>
      ))}

      {accentPrompt ? (
        <LinearGradient
          colors={['#EEF0FF', '#F3EEFF']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.promptAccent}
        >
          <Text style={s.promptAccentQ}>{accentPrompt.q}</Text>
          <Text style={s.promptA}>{accentPrompt.a}</Text>
          <TouchableOpacity style={s.promptHeartViolet} onPress={onLike} activeOpacity={0.7}>
            <Ionicons name="heart-outline" size={20} color={colors.violet} />
          </TouchableOpacity>
        </LinearGradient>
      ) : null}

      {profile.flatPhoto ? (
        <View style={s.flatPhotoWrap}>
          <Image source={{ uri: profile.flatPhoto }} style={s.flatPhoto} resizeMode="cover" />
          {profile.flatLabel ? (
            <View style={s.flatLabel}>
              <Text style={s.flatLabelText}>{profile.flatLabel}</Text>
            </View>
          ) : null}
          <TouchableOpacity style={s.heartBtn} onPress={onLike} activeOpacity={0.8}>
            <Ionicons name="heart-outline" size={20} color={colors.ink} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={{ height: 20 }} />
    </Animated.View>
  );
}

// ─── Feed screen ──────────────────────────────────────────────────────────────

export default function Feed() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [profiles, setProfiles] = useState(DEMO);
  const [idx, setIdx] = useState(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPrefs, setShowPrefs] = useState(false);
  const [quickFilter, setQuickFilter] = useState(null);
  const [prefs, setPrefs] = useState(INIT_PREFS);
  const [matchModal, setMatchModal] = useState(null);
  const [likeSheet, setLikeSheet] = useState(null);
  const [likeComment, setLikeComment] = useState('');
  const [likeSending, setLikeSending] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const uidRef = useRef(null);
  const myInfoRef = useRef({ name: null, photo: null });
  const skippedRef = useRef([]);

  const profile = profiles[idx] ?? null;
  const canBack = idx > 0;
  const canNext = idx < profiles.length - 1;

  function next() { if (canNext) setIdx(i => i + 1); }
  function back() { if (canBack) setIdx(i => i - 1); }

  function handleSkip() {
    const wasLast = !canNext;
    const justSkipped = profile && !profile._demo ? profile : null;

    if (wasLast) {
      // Recycle everything skipped so far, but keep the card just skipped out
      // of that batch so it doesn't reappear as the very next card.
      const toRecycle = skippedRef.current;
      skippedRef.current = justSkipped ? [justSkipped] : [];
      if (toRecycle.length > 0) {
        setProfiles(prev => [...prev, ...shuffle(toRecycle)]);
      }
    } else if (justSkipped) {
      skippedRef.current = [...skippedRef.current, justSkipped];
    }

    setIdx(i => i + 1);
  }

  async function handleBlock(p) {
    // Remove immediately so it can't be re-swiped to; don't wait on the network call.
    const filtered = profiles.filter(x => x.id !== p.id);
    setProfiles(filtered);
    setIdx(i => Math.min(i, Math.max(0, filtered.length - 1)));
    skippedRef.current = skippedRef.current.filter(x => x.id !== p.id);
    if (!p?.id || p._demo) return;
    const uid = uidRef.current;
    if (!uid) return;
    await blockUser(uid, p.id);
  }

  function openLikeSheet(p) {
    setLikeComment('');
    setLikeSheet(p);
  }

  async function sendLike() {
    const p = likeSheet;
    setLikeSheet(null);
    // Always advance past the liked profile, even at the end of the deck
    // (mirrors handleSkip) — next() no-ops there and leaves the card stuck
    // on screen, open to a duplicate like.
    setIdx(i => i + 1);
    if (!p?.id || p._demo) return;
    setLikeSending(true);
    try {
      const uid = uidRef.current;
      if (!uid) return;
      await supabase.from('likes').insert({ from_user_id: uid, to_user_id: p.id, comment: likeComment.trim() || null });
      // Requires a DB trigger: when both users have liked each other, insert a row
      // into matches(user1_id, user2_id) where user1_id < user2_id.
      const u1 = uid < p.id ? uid : p.id;
      const u2 = uid < p.id ? p.id : uid;
      const { data: match } = await supabase
        .from('matches').select('id')
        .eq('user1_id', u1).eq('user2_id', u2)
        .maybeSingle();
      if (match) {
        setMatchModal({ name: p.name, photo: p.photo ?? null, matchId: match.id });
      }
    } catch (_) {}
    setLikeSending(false);
  }

  async function handleSavePrefs(draft) {
    setPrefs(draft);
    setBannerDismissed(true);
    setShowPrefs(false);
    savePrefsToSupabase(draft);
  }

  function handleQuickSave(key, val) {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    setBannerDismissed(true);
    savePrefsToSupabase(updated);
  }

  useFocusEffect(useCallback(() => {
    async function reloadPrefs() {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;
      const { data: me } = await supabase
        .from('profiles')
        .select('pref_role,pref_areas,pref_flat_type,pref_budget,pref_move_in,pref_gender,pref_age,pref_occupation,pref_food,pref_smoking,pref_drinking,pref_pets')
        .eq('id', uid)
        .single();
      if (me) {
        setPrefs({
          role:       me.pref_role       ?? null,
          areas:      me.pref_areas      ?? [],
          flatType:   me.pref_flat_type  ?? [],
          budget:     me.pref_budget     ?? null,
          moveIn:     me.pref_move_in    ?? null,
          gender:     me.pref_gender     ?? null,
          age:        me.pref_age        ?? null,
          occupation: me.pref_occupation ?? [],
          food:       me.pref_food       ?? [],
          smoking:    me.pref_smoking    ?? null,
          drinking:   me.pref_drinking   ?? null,
          pets:       me.pref_pets       ?? [],
        });
      }
    }
    reloadPrefs();
  }, []));

  useEffect(() => {
    async function load() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id ?? '';
        uidRef.current = uid;

        // Load this user's saved preferences
        const { data: me } = await supabase
          .from('profiles')
          .select('name,photos,pref_role,pref_areas,pref_flat_type,pref_budget,pref_move_in,pref_gender,pref_age,pref_occupation,pref_food,pref_smoking,pref_drinking,pref_pets')
          .eq('id', uid)
          .single();
        let currentPrefs = INIT_PREFS;
        if (me) {
          myInfoRef.current = {
            name: me.name ?? 'You',
            photo: Array.isArray(me.photos) ? me.photos[0] ?? null : null,
          };
          currentPrefs = {
            role:       me.pref_role     ?? null,
            areas:      me.pref_areas    ?? [],
            flatType:   me.pref_flat_type  ?? [],
            budget:     me.pref_budget   ?? null,
            moveIn:     me.pref_move_in  ?? null,
            gender:     me.pref_gender   ?? null,
            age:        me.pref_age      ?? null,
            occupation: me.pref_occupation ?? [],
            food:       me.pref_food     ?? [],
            smoking:    me.pref_smoking  ?? null,
            drinking:   me.pref_drinking ?? null,
            pets:       me.pref_pets     ?? [],
          };
          setPrefs(currentPrefs);
          const anySet = Object.values(currentPrefs).some(v => Array.isArray(v) ? v.length > 0 : !!v);
          if (anySet) setBannerDismissed(true);
        }

        const [{ data }, blockedIds] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, name, birthday, gender, pronouns, verified, preferred_areas, budget, photos, prompts, job_title, job_company, education_school, education_level')
            .neq('id', uid)
            .eq('onboarding_done', true)
            .eq('user_type', 'seeking')
            .limit(100),
          getBlockedIds(uid),
        ]);
        if (data && data.length > 0) {
          const normed = data.filter(p => !blockedIds.has(p.id)).map(normaliseProfile);
          const scored = normed
            .map(p => ({ ...p, _score: scoreProfile(p, currentPrefs) }))
            .sort((a, b) => b._score - a._score);
          setProfiles(scored);
        }
      } catch (_) {
        // keep demo profiles
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <View style={[s.screen, { paddingTop: insets.top + 12 }]}>

      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.logoRow}>
          <View style={s.logoWrap}>
            <View style={[s.circle, { backgroundColor: colors.blue, left: 0 }]} />
            <View style={[s.circle, { backgroundColor: colors.violet, right: 0, opacity: 0.9 }]} />
          </View>
          <Text style={s.wordmark}>Venn</Text>
        </View>
        <View style={s.topBarRight}>
          <View style={s.likesPill}>
            <Ionicons name="heart" size={12} color="#22C55E" />
            <Text style={s.likesPillText}>∞ likes left</Text>
          </View>
          <TouchableOpacity
            style={s.filterIconBtn}
            activeOpacity={0.8}
            onPress={() => setShowPrefs(true)}
          >
            <Ionicons name="options-outline" size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterRow}
      >
        {FILTER_CHIPS.map(chip => {
          const section = PREF_SECTIONS.flatMap(sec => sec.rows).find(r => r.key === chip.key);
          const active = section ? isPrefSet(prefs, chip.key, section.multi) : false;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => setQuickFilter(chip.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                {active
                  ? getPrefDisplay(prefs, chip.key, chip.label, section?.multi)
                  : chip.label}
              </Text>
              <Ionicons
                name="chevron-down"
                size={12}
                color={active ? '#fff' : colors.ink}
                style={{ marginLeft: 2 }}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={s.separator} />

      {/* Feed */}
      {loading ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>Loading...</Text>
        </View>
      ) : profile ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            key={profile.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.feedContent}
          >
            {!bannerDismissed && (
              <View style={s.banner}>
                <TouchableOpacity
                  style={s.bannerClose}
                  onPress={() => setBannerDismissed(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={14} color={colors.ink} />
                </TouchableOpacity>
                <Text style={s.bannerTitle}>Complete your flatmate preferences</Text>
                <Text style={s.bannerSub}>Set filters to send and receive likes.</Text>
                <TouchableOpacity
                  style={s.bannerBtn}
                  activeOpacity={0.8}
                  onPress={() => setShowPrefs(true)}
                >
                  <Text style={s.bannerBtnText}>Set up</Text>
                </TouchableOpacity>
              </View>
            )}
            <ProfileCard
              profile={profile}
              onBack={back}
              canBack={canBack}
              onSkip={handleSkip}
              onLike={() => openLikeSheet(profile)}
              onBlock={() => handleBlock(profile)}
              onReport={() => setReportTarget(profile)}
            />
          </ScrollView>

          {/* Floating X skip */}
          <TouchableOpacity
            style={[s.skipBtn, { bottom: insets.bottom + 28 }]}
            onPress={handleSkip}
            activeOpacity={0.85}
          >
            <Ionicons name="close" size={26} color="#FF4D6A" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.empty}>
          <Text style={s.emptyText}>No profiles yet — check back soon!</Text>
        </View>
      )}

      {/* Full preferences sheet (≡ icon) */}
      <PreferencesSheet
        visible={showPrefs}
        onClose={() => setShowPrefs(false)}
        prefs={prefs}
        onSave={handleSavePrefs}
      />

      {/* Quick filter sheet (individual chips) */}
      <QuickFilterSheet
        visible={!!quickFilter}
        rowKey={quickFilter}
        prefs={prefs}
        onClose={() => setQuickFilter(null)}
        onSave={handleQuickSave}
      />

      {/* Like sheet */}
      <Modal visible={!!likeSheet} transparent animationType="slide" onRequestClose={() => setLikeSheet(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLikeSheet(null)} />
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B', marginBottom: 4 }}>
              Like {likeSheet?.name}
            </Text>
            <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', marginBottom: 16 }}>
              Add a note to stand out — or just send a like.
            </Text>
            <TextInput
              style={{ backgroundColor: '#F2F3F7', borderRadius: 14, padding: 14, fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: '#14161B', minHeight: 80, textAlignVertical: 'top', marginBottom: 16 }}
              placeholder="Say something... (optional)"
              placeholderTextColor="#9AA0B2"
              value={likeComment}
              onChangeText={setLikeComment}
              multiline
              maxLength={150}
            />
            <TouchableOpacity onPress={sendLike} disabled={likeSending} activeOpacity={0.85}>
              <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 50, paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff' }}>
                  {likeComment.trim() ? 'Send like + note' : 'Send like'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Match celebration modal */}
      <MatchModal
        visible={!!matchModal}
        myName={myInfoRef.current.name ?? 'You'}
        myPhoto={myInfoRef.current.photo}
        theirName={matchModal?.name ?? ''}
        theirPhoto={matchModal?.photo ?? null}
        onMessage={() => {
          const m = matchModal;
          setMatchModal(null);
          router.push({ pathname: '/(tabs)/chat', params: { name: m.name, photo: m.photo ?? '', matchId: m.matchId } });
        }}
        onClose={() => setMatchModal(null)}
      />

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

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F3F7' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6, backgroundColor: '#F2F3F7',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoWrap: { width: 30, height: 18, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 18, height: 18, borderRadius: 9 },
  wordmark: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.ink, letterSpacing: -0.4 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  likesPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0FFF4', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 5,
  },
  likesPillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#22C55E', letterSpacing: 0.3 },
  filterIconBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  filterScroll: { flexShrink: 0, flexGrow: 0, backgroundColor: '#F2F3F7' },
  filterRow: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10, gap: 8, flexDirection: 'row' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 50, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  filterChipActive: { backgroundColor: colors.ink },
  filterChipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink },
  filterChipTextActive: { color: '#fff' },

  separator: { height: 1, backgroundColor: 'rgba(0,0,0,0.07)', marginHorizontal: -20 },

  banner: {
    margin: 12, backgroundColor: '#FDF5F0', borderRadius: 16,
    padding: 14, paddingRight: 30, position: 'relative',
  },
  bannerClose: { position: 'absolute', top: 10, right: 10, opacity: 0.4, padding: 4 },
  bannerTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink, marginBottom: 2 },
  bannerSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2', marginBottom: 10 },
  bannerBtn: {
    alignSelf: 'flex-start', backgroundColor: colors.ink,
    borderRadius: 50, paddingHorizontal: 20, paddingVertical: 9,
  },
  bannerBtnText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#fff' },

  feedContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 },

  skipBtn: {
    position: 'absolute', left: 22,
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
    elevation: 5,
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
  menuItemText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink },
  menuDivider: { height: 1, backgroundColor: '#F0F1F5' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.slate },

  // Card
  cardOuter: { backgroundColor: '#F2F3F7' },
  cardHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 4, paddingBottom: 12,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
  verifiedBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' },
  overlapPill: { borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 },
  overlapText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, color: '#fff', letterSpacing: -0.2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  pronouns: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2' },
  dot: { fontSize: 13, color: '#9AA0B2' },
  active: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.blue },
  navBtns: { flexDirection: 'row', gap: 8 },
  navBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  photoWrap: { position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 10, height: 400 },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  heartBtn: {
    position: 'absolute', bottom: 14, right: 14,
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  infoCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoItemText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink },
  infoDivider: { width: 1, height: 20, backgroundColor: '#F0F0F4' },
  infoHorizDivider: { height: 1, backgroundColor: '#F0F0F4', marginVertical: 8 },
  promptWhite: { position: 'relative', backgroundColor: '#fff', borderRadius: 20, padding: 24, paddingBottom: 60, marginBottom: 10 },
  promptQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.slate, marginBottom: 10 },
  promptA: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.ink, letterSpacing: -0.4, lineHeight: 30 },
  promptHeartGray: { position: 'absolute', bottom: 14, right: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' },
  promptAccent: { position: 'relative', borderRadius: 20, padding: 24, paddingBottom: 60, marginBottom: 10 },
  promptAccentQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.violet, marginBottom: 10 },
  promptHeartViolet: {
    position: 'absolute', bottom: 14, right: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.violet, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  flatPhotoWrap: { position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 10, height: 280 },
  flatPhoto: { width: '100%', height: '100%' },
  flatLabel: { position: 'absolute', bottom: 14, left: 14, backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6 },
  flatLabelText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: '#fff' },
});

// ─── Quick filter sheet styles ────────────────────────────────────────────────

const qs = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: SCREEN_H * 0.6,
    flexDirection: 'column',
  },
  handle: { width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: '#14161B' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' },

  opts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 50,
    borderWidth: 1.5, borderColor: '#E6E8EE', backgroundColor: '#F8F9FC',
  },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipCustom: { backgroundColor: colors.violet, borderColor: colors.violet },
  chipDashed: { borderStyle: 'dashed' },
  chipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: '#5A6072' },
  chipTextOn: { color: '#fff' },

  groupLabel: {
    fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1,
    color: '#9AA0B2', textTransform: 'uppercase', marginBottom: 8, marginTop: 4, width: '100%',
  },
  groupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },

  otherRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', marginTop: 4 },
  otherInput: {
    flex: 1, height: 40, borderRadius: 50, borderWidth: 1.5, borderColor: colors.blue,
    paddingHorizontal: 16, fontFamily: 'HankenGrotesk_400Regular', fontSize: 14,
    color: colors.ink, backgroundColor: '#F0F4FF',
  },
  otherAddBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },

  footer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4, borderTopWidth: 1, borderTopColor: '#F0F1F5' },
  applyBtn: { borderRadius: 50, overflow: 'hidden', paddingVertical: 15, alignItems: 'center' },
  applyText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: '#fff' },
});
