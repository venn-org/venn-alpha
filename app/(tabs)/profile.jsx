import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Switch, Image, Alert, ActivityIndicator,
  Modal, Pressable, TextInput, Dimensions,
  KeyboardAvoidingView, Platform, Animated, PanResponder,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getBlockedProfiles, unblockUser } from '../../lib/blocks';
import { calcAge } from '../../lib/age';

const SCREEN_H = Dimensions.get('window').height;
const SCREEN_W = Dimensions.get('window').width;
const PHOTO_SLOT_SIZE = Math.floor((SCREEN_W - 40 - 16) / 3); // 40 = 2×20 side padding, 16 = 2×8 gaps

const AREAS = ['Bandra', 'Andheri', 'Powai', 'Malad', 'Goregaon', 'Thane', 'Navi Mumbai', 'Pune', 'Dadar', 'Kurla', 'Lower Parel', 'Worli'];
const BUDGETS = ['₹5k–10k', '₹10k–20k', '₹20k–35k', '₹35k–50k', '₹50k+'];

// ─── Prompt library ───────────────────────────────────────────────────────────

const PROMPT_CATEGORIES = {
  'About me': [
    'My idea of a perfect Sunday at home',
    'The one thing I can\'t live without',
    'The last thing I binge-watched and loved',
    'I\'m the flatmate who always',
    'Two truths and a lie about my daily routine',
    'The dish I actually know how to cook',
    'People would describe me as',
    'My favourite way to wind down after work',
    'If you looked at my Spotify, you\'d see',
    'The thing I\'m currently obsessed with',
  ],
  'Living with me': [
    'My sleep schedule in three words',
    'My cleanliness standard is',
    'I handle shared chores by',
    'When it comes to guests, I',
    'My work-from-home setup looks like',
    'My ideal noise level at home is',
    'I\'m a morning person / night owl because',
    'Pets at home? My take is',
    'When it comes to splitting bills, I',
    'I handle conflict with flatmates by',
    'My bathroom routine takes',
    'Cooking smells in the flat — I',
  ],
  'My space': [
    'My room aesthetic is',
    'The common spaces I use most are',
    'The flat I\'m looking for feels like',
    'Deal-breaker for shared spaces',
    'I keep common areas',
    'My ideal flat has',
    'The neighbourhood vibe I\'m looking for',
    'One thing about my space I can\'t compromise on',
    'I\'d describe my home energy as',
  ],
};

const EDU_LEVELS = ['Secondary school', 'Bachelor\'s degree', 'Postgraduate degree', 'Prefer not to say'];

const GENDER_OPTIONS = ['Man', 'Woman', 'Non-binary', 'Prefer not to say'];
const PRONOUN_OPTIONS = ['she', 'her', 'hers', 'he', 'him', 'his', 'they', 'them'];
const LIFESTYLE_QUESTIONS = [
  { key: 'drink', label: 'Drinking' },
  { key: 'tobacco', label: 'Tobacco' },
  { key: 'weed', label: 'Cannabis' },
];
const LIFESTYLE_OPTIONS = ['Yes', 'Sometimes', 'No', 'Prefer not to say'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPromptCategory(q) {
  for (const [cat, qs] of Object.entries(PROMPT_CATEGORIES)) {
    if (qs.includes(q)) return cat;
  }
  return null;
}

function formatBirthday(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function calcCompletion(profile) {
  if (!profile) return 0;
  const fields = ['name', 'birthday', 'gender', 'preferred_areas', 'budget', 'photos', 'prompts'];
  const done = fields.filter(f => {
    const v = profile[f];
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  }).length;
  const hasWorkEdu = !!(profile.job_company || profile.job_title || profile.education_school || profile.education_level);
  return Math.round(((done + (hasWorkEdu ? 1 : 0)) / (fields.length + 1)) * 100);
}

// ─── Ring avatar ──────────────────────────────────────────────────────────────

function RingAvatar({ initials, pct, photo, onPress }) {
  const offset = 201 * (1 - pct / 100);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ width: 72, height: 72, position: 'relative' }}>
      <Svg width={72} height={72} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#335CFF" />
            <Stop offset="1" stopColor="#8A5BFF" />
          </SvgGradient>
        </Defs>
        <Circle cx={36} cy={36} r={32} fill="none" stroke="#E6E8EE" strokeWidth={3.5} />
        <Circle
          cx={36} cy={36} r={32} fill="none"
          stroke="url(#ring)" strokeWidth={3.5}
          strokeDasharray={201} strokeDashoffset={offset}
          strokeLinecap="round" rotation={-90} origin="36, 36"
        />
      </Svg>
      {photo ? (
        <Image source={{ uri: photo }} style={{ position: 'absolute', inset: 5, borderRadius: 33 }} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', inset: 5, borderRadius: 33, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: '#fff' }}>{initials}</Text>
        </LinearGradient>
      )}
      <View style={{ position: 'absolute', bottom: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
        <Ionicons name="camera" size={9} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

// ─── Settings row ─────────────────────────────────────────────────────────────

function SettingsRow({ iconBg, icon, iconColor = colors.blue, title, subtitle, subtitleColor = '#9AA0B2', right, onPress, last }) {
  return (
    <TouchableOpacity style={[p.settingsRow, !last && p.settingsRowBorder]} onPress={onPress} activeOpacity={0.7}>
      <View style={[p.settingsIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={p.settingsTitle}>{title}</Text>
        {subtitle ? <Text style={[p.settingsSub, subtitleColor && { color: subtitleColor }]}>{subtitle}</Text> : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={16} color="#C0C5D0" />}
    </TouchableOpacity>
  );
}

// ─── Basic info bottom sheet (name, birthday, gender, pronouns, lifestyle) ────

function BasicInfoSheet({ visible, profile, onSave, onClose }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState(null);
  const [pronouns, setPronouns] = useState([]);
  const [lifestyle, setLifestyle] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.spring(sheetY, { toValue: 0, friction: 10, tension: 60, useNativeDriver: false }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      sheetY.setValue(600);
    }
  }, [visible]);

  function animateClose() {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(sheetY, { toValue: 600, duration: 220, useNativeDriver: false }),
    ]).start(() => onClose());
  }

  useEffect(() => {
    if (visible) {
      setName(profile?.name ?? '');
      if (profile?.birthday) {
        const [y, m, d] = profile.birthday.split('-');
        setYear(y ?? ''); setMonth(m ?? ''); setDay(d ?? '');
      } else {
        setYear(''); setMonth(''); setDay('');
      }
      setGender(profile?.gender ?? null);
      setPronouns(Array.isArray(profile?.pronouns) ? profile.pronouns : []);
      setLifestyle({
        drink: profile?.drink ?? null,
        tobacco: profile?.tobacco ?? null,
        weed: profile?.weed ?? null,
      });
      setError('');
    }
  }, [visible]);

  function togglePronoun(opt) {
    setPronouns(s => s.includes(opt) ? s.filter(x => x !== opt) : s.length < 4 ? [...s, opt] : s);
  }

  function setLifestyleAnswer(key, val) {
    setLifestyle(l => ({ ...l, [key]: val }));
  }

  function validateBirthday() {
    if (!day && !month && !year) return true; // unchanged / not set
    const d = parseInt(day), m = parseInt(month), y = parseInt(year);
    if (!d || !m || !y || y < 1900) { setError('Please enter a valid birthday.'); return false; }
    if (d < 1 || d > 31 || m < 1 || m > 12) { setError('Please enter a valid birthday.'); return false; }
    const today = new Date();
    const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const birthDate = new Date(y, m - 1, d);
    if (birthDate > eighteenYearsAgo) { setError('You must be at least 18 years old.'); return false; }
    return true;
  }

  async function save() {
    if (!name.trim()) { setError('Name cannot be empty.'); return; }
    if (!validateBirthday()) return;
    setError('');
    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;
      const updates = {
        name: name.trim(),
        gender,
        pronouns: pronouns.length ? pronouns : null,
        drink: lifestyle.drink ?? null,
        tobacco: lifestyle.tobacco ?? null,
        weed: lifestyle.weed ?? null,
      };
      if (day && month && year) {
        updates.birthday = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      const { error: err } = await supabase.from('profiles').update(updates).eq('id', uid);
      if (err) { Alert.alert('Save failed', err.message); return; }
      onSave(updates);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        <Animated.View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: SCREEN_H * 0.86, paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetY }] }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 4 }}>
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B' }}>Basic Info</Text>
            <TouchableOpacity onPress={animateClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>
          <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', paddingHorizontal: 20, marginBottom: 16 }}>Shown on your profile card.</Text>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={bi.label}>NAME</Text>
              <TextInput style={bi.input} placeholder="Your name" placeholderTextColor="#9AA0B2" value={name} onChangeText={setName} />

              <Text style={[bi.label, { marginTop: 18 }]}>BIRTHDAY</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[bi.numInput, { flex: 1 }]} placeholder="DD" placeholderTextColor="#9AA0B2" keyboardType="number-pad" maxLength={2} value={day} onChangeText={setDay} />
                <TextInput style={[bi.numInput, { flex: 1 }]} placeholder="MM" placeholderTextColor="#9AA0B2" keyboardType="number-pad" maxLength={2} value={month} onChangeText={setMonth} />
                <TextInput style={[bi.numInput, { flex: 1.4 }]} placeholder="YYYY" placeholderTextColor="#9AA0B2" keyboardType="number-pad" maxLength={4} value={year} onChangeText={setYear} />
              </View>
              {!!error && <Text style={bi.error}>{error}</Text>}

              <Text style={[bi.label, { marginTop: 20 }]}>GENDER</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {GENDER_OPTIONS.map(opt => {
                  const on = gender === opt;
                  return (
                    <TouchableOpacity key={opt} style={[bi.chip, on && bi.chipOn]} onPress={() => setGender(on ? null : opt)} activeOpacity={0.8}>
                      <Text style={[bi.chipText, on && bi.chipTextOn]}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[bi.label, { marginTop: 18 }]}>PRONOUNS <Text style={{ fontFamily: 'HankenGrotesk_400Regular', letterSpacing: 0, textTransform: 'none', color: '#9AA0B2' }}>(up to 4)</Text></Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {PRONOUN_OPTIONS.map(opt => {
                  const on = pronouns.includes(opt);
                  return (
                    <TouchableOpacity key={opt} style={[bi.chip, on && bi.chipOn]} onPress={() => togglePronoun(opt)} activeOpacity={0.8}>
                      <Text style={[bi.chipText, on && bi.chipTextOn]}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[bi.label, { marginTop: 18 }]}>LIFESTYLE</Text>
              {LIFESTYLE_QUESTIONS.map(q => (
                <View key={q.key} style={{ marginBottom: 14 }}>
                  <Text style={bi.qLabel}>{q.label}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {LIFESTYLE_OPTIONS.map(opt => {
                      const on = lifestyle[q.key] === opt;
                      return (
                        <TouchableOpacity key={opt} style={[bi.chip, on && bi.chipOn]} onPress={() => setLifestyleAnswer(q.key, on ? null : opt)} activeOpacity={0.8}>
                          <Text style={[bi.chipText, on && bi.chipTextOn]}>{opt}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
              <View style={{ height: 20 }} />
            </View>
          </ScrollView>

          <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F1F5' }}>
            <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 50, paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff' }}>{saving ? 'Saving…' : 'Save'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Block list bottom sheet ───────────────────────────────────────────────────

function BlockListSheet({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.spring(sheetY, { toValue: 0, friction: 10, tension: 60, useNativeDriver: false }),
      ]).start();
      load();
    } else {
      backdropOpacity.setValue(0);
      sheetY.setValue(600);
    }
  }, [visible]);

  async function load() {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      const profiles = await getBlockedProfiles(uid);
      setBlocked(profiles);
    } catch (_) {
      setBlocked([]);
    } finally {
      setLoading(false);
    }
  }

  function animateClose() {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(sheetY, { toValue: 600, duration: 220, useNativeDriver: false }),
    ]).start(() => onClose());
  }

  async function unblock(target) {
    setBlocked(prev => prev.filter(p => p.id !== target.id));
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id;
    if (!uid) return;
    await unblockUser(uid, target.id);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        <Animated.View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: SCREEN_H * 0.7, paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetY }] }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 }}>
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B' }}>Block List</Text>
            <TouchableOpacity onPress={animateClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {loading ? (
              <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', marginTop: 40 }}>Loading…</Text>
            ) : blocked.length === 0 ? (
              <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', marginTop: 40 }}>You haven't blocked anyone.</Text>
            ) : (
              blocked.map((b, i) => (
                <View key={b.id} style={[bl.row, i < blocked.length - 1 && bl.rowBorder]}>
                  <View style={bl.avatar}>
                    {b.photo
                      ? <Image source={{ uri: b.photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      : <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.slate }}>{(b.name?.[0] ?? '?').toUpperCase()}</Text>
                    }
                  </View>
                  <Text style={bl.name}>{b.name}</Text>
                  <TouchableOpacity style={bl.unblockBtn} onPress={() => unblock(b)} activeOpacity={0.8}>
                    <Text style={bl.unblockText}>Unblock</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Work & Education bottom sheet ────────────────────────────────────────────

function WorkEduSheet({ visible, profile, onSave, onClose }) {
  const insets = useSafeAreaInsets();
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [school, setSchool] = useState('');
  const [eduLevel, setEduLevel] = useState(null);
  const [saving, setSaving] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.spring(sheetY, { toValue: 0, friction: 10, tension: 60, useNativeDriver: false }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      sheetY.setValue(600);
    }
  }, [visible]);

  function animateClose() {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(sheetY, { toValue: 600, duration: 220, useNativeDriver: false }),
    ]).start(() => onClose());
  }

  useEffect(() => {
    if (visible) {
      setCompany(profile?.job_company ?? '');
      setJobTitle(profile?.job_title ?? '');
      setSchool(profile?.education_school ?? '');
      setEduLevel(profile?.education_level ?? null);
    }
  }, [visible]);

  async function save() {
    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;
      const { error } = await supabase.from('profiles').update({
        job_company: company.trim() || null,
        job_title: jobTitle.trim() || null,
        education_school: school.trim() || null,
        education_level: eduLevel,
      }).eq('id', uid);
      if (error) { Alert.alert('Save failed', error.message); return; }
      onSave({ job_company: company.trim() || null, job_title: jobTitle.trim() || null, education_school: school.trim() || null, education_level: eduLevel });
    } catch (e) {
      Alert.alert('Save failed', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        <Animated.View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetY }] }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 4 }}>
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B' }}>Work & Education</Text>
            <TouchableOpacity onPress={animateClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>
          <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', paddingHorizontal: 20, marginBottom: 20 }}>Shown on your profile card.</Text>

          <ScrollView style={{ maxHeight: SCREEN_H * 0.55 }} showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={we.label}>WHERE DO YOU WORK?</Text>
              <TextInput style={we.input} placeholder="Company / organisation" placeholderTextColor="#9AA0B2" value={company} onChangeText={setCompany} />

              <Text style={[we.label, { marginTop: 18 }]}>WHAT'S YOUR JOB TITLE?</Text>
              <Text style={we.hint}>If you're a student, mention that instead.</Text>
              <TextInput style={we.input} placeholder="e.g. Software Engineer, Student" placeholderTextColor="#9AA0B2" value={jobTitle} onChangeText={setJobTitle} />

              <Text style={[we.label, { marginTop: 18 }]}>WHERE DID YOU STUDY?</Text>
              <TextInput style={we.input} placeholder="College or university" placeholderTextColor="#9AA0B2" value={school} onChangeText={setSchool} />

              <Text style={[we.label, { marginTop: 18 }]}>HIGHEST LEVEL ATTAINED</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {EDU_LEVELS.map(lvl => {
                  const on = eduLevel === lvl;
                  return (
                    <TouchableOpacity key={lvl} style={[we.chip, on && we.chipOn]} onPress={() => setEduLevel(on ? null : lvl)} activeOpacity={0.8}>
                      <Text style={[we.chipText, on && we.chipTextOn]}>{lvl}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ height: 20 }} />
            </View>
          </ScrollView>

          <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F1F5' }}>
            <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 50, paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff' }}>{saving ? 'Saving…' : 'Save'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Prompt sheet (add / edit a prompt) ───────────────────────────────────────

function PromptSheet({ visible, editingPrompt, onSave, onDelete, onClose }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState('pick');  // 'pick' | 'answer'
  const [activeTab, setActiveTab] = useState('About me');
  const [selectedQ, setSelectedQ] = useState('');
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.spring(sheetY, { toValue: 0, friction: 10, tension: 60, useNativeDriver: false }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      sheetY.setValue(600);
    }
  }, [visible]);

  function animateClose() {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(sheetY, { toValue: 600, duration: 220, useNativeDriver: false }),
    ]).start(() => onClose());
  }

  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSaving(false);
      if (editingPrompt) {
        setSelectedQ(editingPrompt.q);
        setAnswer(editingPrompt.a);
        setStep('answer');
      } else {
        setSelectedQ('');
        setAnswer('');
        setStep('pick');
        setActiveTab('About me');
      }
    }
  }, [visible]);

  function pickPrompt(q) {
    setSelectedQ(q);
    setAnswer('');
    setStep('answer');
  }

  async function save() {
    const trimmed = answer.trim();
    if (!trimmed) {
      Alert.alert('Empty answer', 'Please write your answer before saving.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ q: selectedQ, a: trimmed });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  const tabs = Object.keys(PROMPT_CATEGORIES);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity, zIndex: 0 }]} />
        <Pressable style={[StyleSheet.absoluteFill, { zIndex: 0 }]} onPress={animateClose} />
        <Animated.View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: SCREEN_H * 0.86, paddingBottom: insets.bottom + 16, zIndex: 1, transform: [{ translateY: sheetY }] }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 16 }} />

          {step === 'pick' ? (
            <>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity onPress={animateClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="arrow-back" size={16} color="#14161B" />
                  </TouchableOpacity>
                  <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B' }}>Prompts</Text>
                </View>
              </View>

              {/* Category tabs */}
              <View style={{ height: 44, marginBottom: 14 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, alignItems: 'center', height: 44 }}>
                  {tabs.map(tab => (
                    <TouchableOpacity key={tab} style={[pr.tab, activeTab === tab && pr.tabActive]} onPress={() => setActiveTab(tab)} activeOpacity={0.8}>
                      <Text style={[pr.tabText, activeTab === tab && pr.tabTextActive]}>{tab}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={{ height: 1, backgroundColor: '#E6E8EE', marginHorizontal: 0, marginBottom: 0 }} />

              {/* Tip card */}
              <View style={{ backgroundColor: '#ECEDF8', borderRadius: 14, marginHorizontal: 20, padding: 14, marginTop: 14, marginBottom: 4 }}>
                <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.indigo, lineHeight: 20 }}>Try a Prompt that helps reveal something unique about you as a flatmate.</Text>
              </View>

              {/* Prompt list */}
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {PROMPT_CATEGORIES[activeTab].map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[pr.promptRow, i < PROMPT_CATEGORIES[activeTab].length - 1 && pr.promptRowBorder]}
                    onPress={() => pickPrompt(q)}
                    activeOpacity={0.6}
                  >
                    <Text style={pr.promptRowText}>{q}</Text>
                  </TouchableOpacity>
                ))}
                <View style={{ height: 20 }} />
              </ScrollView>
            </>
          ) : (
            <>
              {/* Header: back · Write answer · Done */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 24 }}>
                <TouchableOpacity
                  onPress={editingPrompt ? animateClose : () => setStep('pick')}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name={editingPrompt ? 'close' : 'arrow-back'} size={16} color="#14161B" />
                </TouchableOpacity>
                <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B' }}>Write answer</Text>
                <TouchableOpacity onPress={save} disabled={saving || !answer.trim()}>
                  <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: answer.trim() ? colors.violet : '#C0C5D0' }}>Done</Text>
                </TouchableOpacity>
              </View>

              {/* Question card with pencil to change question */}
              <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E6E8EE', borderRadius: 14, padding: 16 }}>
                  <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: '#14161B', flex: 1, lineHeight: 22 }}>{selectedQ}</Text>
                  {!editingPrompt && (
                    <TouchableOpacity onPress={() => setStep('pick')} style={{ marginLeft: 12, padding: 4 }}>
                      <Ionicons name="pencil-outline" size={20} color="#9AA0B2" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Answer card with char count inside */}
              <View style={{ paddingHorizontal: 20, flex: 1 }}>
                <View style={{ borderWidth: 1.5, borderColor: '#E6E8EE', borderRadius: 14, padding: 16, flex: 1 }}>
                  <TextInput
                    style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: '#14161B', flex: 1, textAlignVertical: 'top', minHeight: 80 }}
                    placeholder="Your answer..."
                    placeholderTextColor="#9AA0B2"
                    value={answer}
                    onChangeText={t => setAnswer(t.slice(0, 150))}
                    multiline
                    autoFocus
                  />
                  <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 12, color: '#9AA0B2', textAlign: 'right', marginTop: 8 }}>{answer.length}</Text>
                </View>
              </View>

              {/* Remove button (edit mode only) */}
              {editingPrompt && onDelete && (
                <TouchableOpacity onPress={onDelete} activeOpacity={0.8} style={{ paddingVertical: 14, alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.red }}>Remove prompt</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Profile preview modal ────────────────────────────────────────────────────

function ProfilePreviewModal({ visible, profile, onClose }) {
  const insets = useSafeAreaInsets();

  const name = profile?.name ?? 'You';
  const age = calcAge(profile?.birthday);
  const photos = Array.isArray(profile?.photos) ? profile.photos : [];
  const prompts = Array.isArray(profile?.prompts) ? profile.prompts : [];
  const gender = profile?.gender ?? null;
  const area = profile?.preferred_areas?.[0] ?? null;
  const job = [profile?.job_title, profile?.job_company].filter(Boolean).join(' at ') || null;

  const regPrompts = prompts.length > 1 ? prompts.slice(0, -1) : [];
  const accentPrompt = prompts.length > 0 ? prompts[prompts.length - 1] : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#F2F3F7' }}>
        <View style={[pv.topBar, { paddingTop: insets.top + 12 }]}>
          <View>
            <Text style={pv.topTitle}>Preview</Text>
            <Text style={pv.topSub}>How you appear to others</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={pv.closeBtn} activeOpacity={0.8}>
            <Ionicons name="close" size={16} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 }}
        >
          <View style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
            <Text style={pv.name}>{name}{age ? `, ${age}` : ''}</Text>
          </View>

          <View style={pv.photoWrap}>
            {photos[0] ? (
              <Image source={{ uri: photos[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person" size={60} color="#C0C5D0" />
              </View>
            )}
          </View>

          <View style={pv.infoCard}>
            <View style={pv.infoRow}>
              <View style={pv.infoItem}>
                <Ionicons name="calendar-outline" size={15} color="#9AA0B2" />
                <Text style={pv.infoText}>{age ?? '—'}</Text>
              </View>
              <View style={pv.infoDivider} />
              <View style={pv.infoItem}>
                <Ionicons name="person-outline" size={15} color="#9AA0B2" />
                <Text style={pv.infoText}>{gender ?? '—'}</Text>
              </View>
              <View style={pv.infoDivider} />
              <View style={pv.infoItem}>
                <Ionicons name="location-outline" size={15} color="#9AA0B2" />
                <Text style={pv.infoText}>{area ?? '—'}</Text>
              </View>
            </View>
            {job ? (
              <>
                <View style={pv.infoHoriz} />
                <View style={[pv.infoItem, { paddingTop: 12 }]}>
                  <Ionicons name="briefcase-outline" size={15} color="#9AA0B2" />
                  <Text style={pv.infoText}>{job}</Text>
                </View>
              </>
            ) : null}
          </View>

          {regPrompts.map((pr, i) => (
            <View key={i} style={pv.promptWhite}>
              <Text style={pv.promptQ}>{pr.q}</Text>
              <Text style={pv.promptA}>{pr.a}</Text>
            </View>
          ))}

          {accentPrompt ? (
            <LinearGradient
              colors={['#EEF0FF', '#F3EEFF']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={pv.promptAccent}
            >
              <Text style={pv.promptAccentQ}>{accentPrompt.q}</Text>
              <Text style={pv.promptA}>{accentPrompt.a}</Text>
            </LinearGradient>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Budget slider ────────────────────────────────────────────────────────────

const THUMB = 24;

function BudgetSlider({ value, onChange }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const thumbAnim = useRef(new Animated.Value(0)).current;
  const startX = useRef(0);

  useEffect(() => {
    if (trackWidth > 0) {
      const idx = Math.max(0, BUDGETS.indexOf(value));
      const pos = (idx / (BUDGETS.length - 1)) * trackWidth;
      thumbAnim.setValue(pos);
      startX.current = pos;
    }
  }, [trackWidth, value]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      thumbAnim.stopAnimation(v => { startX.current = v; });
    },
    onPanResponderMove: (_, { dx }) => {
      const tw = trackWidthRef.current;
      thumbAnim.setValue(Math.max(0, Math.min(tw, startX.current + dx)));
    },
    onPanResponderRelease: (_, { dx }) => {
      const tw = trackWidthRef.current;
      const stepW = tw / (BUDGETS.length - 1);
      const raw = Math.max(0, Math.min(tw, startX.current + dx));
      const idx = Math.round(raw / stepW);
      const snapped = idx * stepW;
      Animated.spring(thumbAnim, { toValue: snapped, friction: 8, useNativeDriver: false }).start();
      startX.current = snapped;
      onChange(BUDGETS[idx]);
    },
  })).current;

  return (
    <View>
      <View
        onLayout={e => { const w = e.nativeEvent.layout.width - THUMB; trackWidthRef.current = w; setTrackWidth(w); }}
        style={{ height: 44, justifyContent: 'center' }}
      >
        {/* Track */}
        <View style={{ position: 'absolute', left: THUMB / 2, right: THUMB / 2, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2 }}>
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: thumbAnim, backgroundColor: colors.blue, borderRadius: 2 }} />
        </View>
        {/* Thumb */}
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            position: 'absolute',
            left: thumbAnim,
            top: (44 - THUMB) / 2,
            width: THUMB, height: THUMB, borderRadius: THUMB / 2,
            backgroundColor: '#fff',
            borderWidth: 2.5, borderColor: colors.blue,
            shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 }, elevation: 5,
          }}
        />
      </View>
      {/* Labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        {BUDGETS.map(b => (
          <Text key={b} style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 10, color: b === value ? colors.blue : '#9AA0B2' }}>{b}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── Preferences sheet ────────────────────────────────────────────────────────

function PreferencesSheet({ visible, profile, onSave, onClose }) {
  const insets = useSafeAreaInsets();
  const [budget, setBudget] = useState(null);
  const [areas, setAreas] = useState([]);
  const [saving, setSaving] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.spring(sheetY, { toValue: 0, friction: 10, tension: 60, useNativeDriver: false }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      sheetY.setValue(600);
    }
  }, [visible]);

  function animateClose() {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(sheetY, { toValue: 600, duration: 220, useNativeDriver: false }),
    ]).start(() => onClose());
  }

  useEffect(() => {
    if (visible) {
      setBudget(profile?.budget ?? null);
      setAreas(Array.isArray(profile?.preferred_areas) ? profile.preferred_areas : []);
    }
  }, [visible]);

  function toggleArea(a) {
    setAreas(s => s.includes(a) ? s.filter(x => x !== a) : [...s, a]);
  }

  async function save() {
    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;
      const { error } = await supabase.from('profiles').update({ budget, preferred_areas: areas.length ? areas : null }).eq('id', uid);
      if (error) { Alert.alert('Save failed', error.message); return; }
      onSave({ budget, preferred_areas: areas.length ? areas : null });
    } catch (e) {
      Alert.alert('Save failed', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        <Animated.View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetY }] }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 4 }}>
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B' }}>Preferences</Text>
            <TouchableOpacity onPress={animateClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: SCREEN_H * 0.6 }} showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={pref.label}>MONTHLY BUDGET</Text>
              {budget && (
                <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.blue, marginBottom: 8 }}>{budget}</Text>
              )}
              <BudgetSlider value={budget ?? BUDGETS[0]} onChange={setBudget} />

              <Text style={[pref.label, { marginTop: 28 }]}>PREFERRED AREAS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {AREAS.map(a => {
                  const on = areas.includes(a);
                  return (
                    <TouchableOpacity key={a} style={[pref.chip, on && pref.chipOn]} onPress={() => toggleArea(a)} activeOpacity={0.8}>
                      <Text style={[pref.chipText, on && pref.chipTextOn]}>{a}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ height: 16 }} />
            </View>
          </ScrollView>

          <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F1F5' }}>
            <TouchableOpacity onPress={save} disabled={saving || !budget} activeOpacity={0.85}>
              <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 50, paddingVertical: 16, alignItems: 'center', opacity: !budget ? 0.4 : 1 }}>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff' }}>{saving ? 'Saving…' : 'Save'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function Profile() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [commentFilter, setCommentFilter] = useState(true);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [workEduSheet, setWorkEduSheet] = useState(false);
  const [promptSheet, setPromptSheet] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [settingsSheet, setSettingsSheet] = useState(false);
  const [preferencesSheet, setPreferencesSheet] = useState(false);
  const [basicInfoSheet, setBasicInfoSheet] = useState(false);
  const [blockListSheet, setBlockListSheet] = useState(false);
  const settingsBackdrop = useRef(new Animated.Value(0)).current;
  const settingsSheetY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (settingsSheet) {
      Animated.parallel([
        Animated.timing(settingsBackdrop, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.spring(settingsSheetY, { toValue: 0, friction: 10, tension: 60, useNativeDriver: false }),
      ]).start();
    } else {
      settingsBackdrop.setValue(0);
      settingsSheetY.setValue(600);
    }
  }, [settingsSheet]);

  function animateSettingsClose() {
    Animated.parallel([
      Animated.timing(settingsBackdrop, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(settingsSheetY, { toValue: 600, duration: 220, useNativeDriver: false }),
    ]).start(() => setSettingsSheet(false));
  }
  const scrollRef = useRef(null);
  const photosSectionY = useRef(0);
  const promptsSectionY = useRef(0);

  function goToFirstIncomplete() {
    if (!photos.length) {
      pickPhoto(0);
    } else if (!prompts.length) {
      scrollRef.current?.scrollTo({ y: promptsSectionY.current - 8, animated: true });
      setTimeout(() => { setEditingPrompt(null); setPromptSheet(true); }, 350);
    } else if (!profile?.budget || !profile?.preferred_areas?.length) {
      setWorkEduSheet(false);
      const missing = [
        !profile?.budget && 'budget',
        !profile?.preferred_areas?.length && 'preferred areas',
      ].filter(Boolean).join(' and ');
      Alert.alert('Almost there!', `You\'re missing your ${missing}. These were set during onboarding — we\'ll add an edit option here soon.`);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id;
        if (!uid) return;
        const { data } = await supabase
          .from('profiles')
          .select('id, name, birthday, gender, pronouns, drink, tobacco, weed, photos, preferred_areas, budget, prompts, onboarding_done, job_company, job_title, education_school, education_level, verified')
          .eq('id', uid)
          .single();
        if (data) setProfile(data);
      } catch (_) {}
    }
    load();
  }, []);

  async function pickPhoto(index) {
    if (uploadingIndex !== null) return; // avoid concurrent picks racing on the same profile.photos snapshot
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) { Alert.alert('Permission needed', 'Please allow photo access in Settings.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploadingIndex(index);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      const lastSegment = asset.uri.split('?')[0].split('/').pop() || '';
      const dotIndex = lastSegment.lastIndexOf('.');
      const ext = dotIndex > 0 && dotIndex < lastSegment.length - 1 ? lastSegment.slice(dotIndex + 1).toLowerCase() : 'jpg';
      const path = `${uid}/${Date.now()}.${ext}`;
      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = reject;
        xhr.responseType = 'blob';
        xhr.open('GET', asset.uri);
        xhr.send();
      });
      const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: `image/${ext}`, upsert: true });
      if (error) { Alert.alert('Upload failed', error.message); return; }
      const url = supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
      const current = Array.isArray(profile?.photos) ? [...profile.photos] : [];
      current[index] = url;
      // Compact holes: writing to slot N of a shorter array creates nulls in
      // the jsonb, and photos[0] is read as the avatar all over the app.
      const compacted = current.filter(Boolean);
      await supabase.from('profiles').update({ photos: compacted }).eq('id', uid);
      setProfile(prev => ({ ...prev, photos: compacted }));
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setUploadingIndex(null);
    }
  }

  async function savePrompt({ q, a }) {
    const uid = (await supabase.auth.getUser()).data?.user?.id;
    if (!uid) { Alert.alert('Not signed in', 'Please sign in to save prompts.'); return; }
    const current = Array.isArray(profile?.prompts) ? [...profile.prompts] : [];
    let updated;
    if (editingPrompt) {
      updated = current.map(pr => pr.q === editingPrompt.q ? { q, a } : pr);
    } else {
      if (current.length >= 3) { Alert.alert('Max 3 prompts', 'Remove one first.'); return; }
      updated = [...current, { q, a }];
    }
    const { error } = await supabase.from('profiles').update({ prompts: updated }).eq('id', uid);
    if (error) { Alert.alert('Save failed', error.message); return; }
    setProfile(prev => ({ ...prev, prompts: updated }));
    setPromptSheet(false);
    setEditingPrompt(null);
  }

  async function deletePrompt() {
    const uid = (await supabase.auth.getUser()).data?.user?.id;
    if (!uid) return;
    const updated = (profile?.prompts ?? []).filter(pr => pr.q !== editingPrompt?.q);
    const { error } = await supabase.from('profiles').update({ prompts: updated }).eq('id', uid);
    if (error) { Alert.alert('Delete failed', error.message); return; }
    setProfile(prev => ({ ...prev, prompts: updated }));
    setPromptSheet(false);
    setEditingPrompt(null);
  }

  function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  const name = profile?.name ?? 'You';
  const age = calcAge(profile?.birthday);
  const initials = name[0]?.toUpperCase() ?? '?';
  const pct = calcCompletion(profile);
  const photos = Array.isArray(profile?.photos) ? profile.photos : [];
  const prompts = Array.isArray(profile?.prompts) ? profile.prompts : [];

  const aboutChips = [
    profile?.gender && { label: profile.gender, emoji: '👤' },
    profile?.budget && { label: profile.budget, emoji: '💰' },
    profile?.preferred_areas?.[0] && { label: profile.preferred_areas[0], emoji: '📍' },
  ].filter(Boolean);

  const hasWork = profile?.job_company || profile?.job_title;
  const hasEdu = profile?.education_school || profile?.education_level;

  return (
    <View style={[p.screen, { paddingTop: insets.top + 13 }]}>
      <View style={p.headerGray}>
        <View style={p.topRow}>
          <Text style={p.title}>Profile</Text>
          <TouchableOpacity style={p.gearBtn} activeOpacity={0.8} onPress={() => setSettingsSheet(true)}>
            <Ionicons name="settings-outline" size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <View style={p.avatarRow}>
          <RingAvatar initials={initials} pct={pct} photo={photos[0] ?? null} onPress={() => pickPhoto(0)} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <Text style={p.avatarName}>{name}{age ? `, ${age}` : ''}</Text>
              {profile?.onboarding_done && (
                <Ionicons name="checkmark-circle" size={16} color={colors.blue} />
              )}
            </View>
            <TouchableOpacity onPress={pct < 100 ? goToFirstIncomplete : undefined} activeOpacity={0.7}>
              <Text style={p.avatarCompletion}>{pct}% complete{pct < 100 ? ' · tap to finish' : ''}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={p.tabRow}>
          <TouchableOpacity style={[p.tabPill, activeTab === 'profile' && p.tabPillActive]} onPress={() => setActiveTab('profile')} activeOpacity={0.8}>
            <Text style={[p.tabPillText, activeTab === 'profile' && p.tabPillTextActive]}>My Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[p.tabPill, activeTab === 'safety' && p.tabPillActive]} onPress={() => setActiveTab('safety')} activeOpacity={0.8}>
            <Text style={[p.tabPillText, activeTab === 'safety' && p.tabPillTextActive]}>Safety</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} onPress={() => Alert.alert('Venn+', "Coming soon — we're still building this.")}>
            <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={p.vennPlusTab}>
              <Ionicons name="add" size={12} color="#fff" />
              <Text style={p.vennPlusText}>Venn+</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={p.white} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {activeTab === 'profile' ? (
          <>
            {pct < 100 && (
              <TouchableOpacity style={p.completeBanner} activeOpacity={0.8} onPress={goToFirstIncomplete}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View>
                      <Text style={p.completeBannerTitle}>Complete your profile</Text>
                      <Text style={p.completeBannerSub}>{[
                        !photos.length && 'Add a photo',
                        !prompts.length && 'Add a prompt',
                        !profile?.budget && 'Set budget',
                        !profile?.preferred_areas?.length && 'Set preferred areas',
                      ].filter(Boolean).join(' · ')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={p.completePct}>{pct}%</Text>
                      <Ionicons name="chevron-forward" size={16} color="#C0C5D0" />
                    </View>
                  </View>
                  <View style={p.progressTrack}>
                    <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[p.progressFill, { width: `${pct}%` }]} />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Photos */}
            <View style={p.sectionHeader} onLayout={e => { photosSectionY.current = e.nativeEvent.layout.y; }}>
              <Text style={p.sectionTitle}>Photos</Text>
              <Text style={p.sectionAction}>tap to edit</Text>
            </View>
            <View style={p.photoGrid}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <TouchableOpacity key={i} style={p.photoSlot} onPress={() => pickPhoto(i)} activeOpacity={0.8}>
                  {photos[i]
                    ? <Image source={{ uri: photos[i] }} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} resizeMode="cover" />
                    : uploadingIndex === i
                      ? <ActivityIndicator size="small" color={colors.blue} />
                      : <Ionicons name="add" size={24} color="#C0C5D0" />
                  }
                </TouchableOpacity>
              ))}
            </View>

            <View style={p.divider} />

            {/* Basic info */}
            <View style={p.sectionHeader}>
              <Text style={p.sectionTitle}>Basic Info</Text>
              <TouchableOpacity onPress={() => setBasicInfoSheet(true)}>
                <Text style={[p.sectionAction, { color: colors.blue }]}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <SettingsRow
                iconBg="#EEF1FF" icon="person-outline" iconColor={colors.blue}
                title="Name" subtitle={name}
                onPress={() => setBasicInfoSheet(true)}
              />
              <SettingsRow
                iconBg="#EEF1FF" icon="calendar-outline" iconColor={colors.blue}
                title="Birthday" subtitle={profile?.birthday ? `${formatBirthday(profile.birthday)}${age ? ` · ${age} yrs` : ''}` : 'Not set'}
                onPress={() => setBasicInfoSheet(true)}
              />
              <SettingsRow
                iconBg="#F0EEFF" icon="male-female-outline" iconColor={colors.violet}
                title="Gender" subtitle={profile?.gender ?? 'Not set'}
                onPress={() => setBasicInfoSheet(true)}
              />
              <SettingsRow
                iconBg="#F0EEFF" icon="chatbox-ellipses-outline" iconColor={colors.violet}
                title="Pronouns" subtitle={Array.isArray(profile?.pronouns) && profile.pronouns.length ? profile.pronouns.join('/') : 'Not set'}
                onPress={() => setBasicInfoSheet(true)}
              />
              <SettingsRow
                iconBg="#FFF6EC" icon="wine-outline" iconColor="#FF8B3E"
                title="Lifestyle"
                subtitle={[profile?.drink && `Drinks: ${profile.drink}`, profile?.tobacco && `Tobacco: ${profile.tobacco}`, profile?.weed && `Cannabis: ${profile.weed}`].filter(Boolean).join(' · ') || 'Not set'}
                onPress={() => setBasicInfoSheet(true)}
                last
              />
            </View>

            <View style={p.divider} />

            {/* About you */}
            <View style={p.sectionHeader}>
              <Text style={p.sectionTitle}>About you</Text>
              <TouchableOpacity onPress={() => setPreferencesSheet(true)}>
                <Text style={[p.sectionAction, { color: colors.blue }]}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={p.chipsRow}>
              {aboutChips.map((c, i) => (
                <View key={i} style={p.chip}>
                  <Text style={p.chipEmoji}>{c.emoji}</Text>
                  <Text style={p.chipText}>{c.label}</Text>
                </View>
              ))}
            </View>

            <View style={p.divider} />

            {/* Work & Education */}
            <View style={p.sectionHeader}>
              <Text style={p.sectionTitle}>Work & Education</Text>
              <TouchableOpacity onPress={() => setWorkEduSheet(true)}>
                <Text style={[p.sectionAction, { color: colors.blue }]}>{hasWork || hasEdu ? 'Edit' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              {hasWork ? (
                <TouchableOpacity style={p.infoCard} onPress={() => setWorkEduSheet(true)} activeOpacity={0.8}>
                  <Ionicons name="briefcase-outline" size={16} color="#9AA0B2" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    {profile.job_title ? <Text style={p.infoCardTitle}>{profile.job_title}</Text> : null}
                    {profile.job_company ? <Text style={p.infoCardSub}>{profile.job_company}</Text> : null}
                  </View>
                  <Ionicons name="pencil-outline" size={14} color="#C0C5D0" />
                </TouchableOpacity>
              ) : null}
              {hasEdu ? (
                <TouchableOpacity style={[p.infoCard, { marginTop: hasWork ? 8 : 0 }]} onPress={() => setWorkEduSheet(true)} activeOpacity={0.8}>
                  <Ionicons name="school-outline" size={16} color="#9AA0B2" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    {profile.education_school ? <Text style={p.infoCardTitle}>{profile.education_school}</Text> : null}
                    {profile.education_level ? <Text style={p.infoCardSub}>{profile.education_level}</Text> : null}
                  </View>
                  <Ionicons name="pencil-outline" size={14} color="#C0C5D0" />
                </TouchableOpacity>
              ) : null}
              {!hasWork && !hasEdu && (
                <TouchableOpacity style={p.addCard} onPress={() => setWorkEduSheet(true)} activeOpacity={0.8}>
                  <Ionicons name="add" size={18} color="#C0C5D0" />
                  <Text style={p.addCardText}>Add your work and education</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={p.divider} />

            {/* Prompts */}
            <View style={p.sectionHeader} onLayout={e => { promptsSectionY.current = e.nativeEvent.layout.y; }}>
              <Text style={p.sectionTitle}>Prompts</Text>
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
              {[0, 1, 2].map(i => {
                const prompt = prompts[i];
                if (prompt) {
                  const category = getPromptCategory(prompt.q ?? prompt.question);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={p.promptCard}
                      onPress={() => { setEditingPrompt(prompt); setPromptSheet(true); }}
                      activeOpacity={0.8}
                    >
                      {category && <Text style={p.promptCategory}>{category}</Text>}
                      <Text style={p.promptQ}>{prompt.q ?? prompt.question}</Text>
                      {(prompt.a ?? prompt.answer)
                        ? <Text style={p.promptA}>{prompt.a ?? prompt.answer}</Text>
                        : <Text style={p.promptATap}>Tap to write your answer →</Text>
                      }
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={i}
                    style={[p.promptCard, p.promptCardEmpty]}
                    onPress={() => { setEditingPrompt(null); setPromptSheet(true); }}
                    activeOpacity={0.8}
                  >
                    <View style={p.promptAddCircle}>
                      <Ionicons name="add" size={16} color="#9AA0B2" />
                    </View>
                    <Text style={p.promptAddText}>Add a prompt</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <TouchableOpacity style={p.previewBtn} activeOpacity={0.85} onPress={() => setPreviewVisible(true)}>
                <Text style={p.previewBtnText}>Preview my profile</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={p.settingsSection}>
              <Text style={p.settingsCatLabel}>Verification</Text>
            </View>
            <SettingsRow
              iconBg={profile?.verified ? '#EEFCF3' : '#EEF1FF'} icon="checkmark-circle-outline"
              iconColor={profile?.verified ? colors.success : colors.blue}
              title="Selfie Verification"
              subtitle={profile?.verified ? 'Verified' : "Not verified · Coming soon"}
              subtitleColor={profile?.verified ? colors.success : '#9AA0B2'}
              onPress={() => Alert.alert('Selfie verification', "Selfie verification isn't available yet — check back soon!")}
            />
            <View style={p.settingsSection}>
              <Text style={p.settingsCatLabel}>Controls</Text>
            </View>
            <SettingsRow
              iconBg="#F0EEFF" icon="chatbubble-outline" iconColor={colors.violet}
              title="Comment Filter"
              subtitle="Hides offensive messages"
              right={
                <Switch value={commentFilter} onValueChange={setCommentFilter} trackColor={{ false: '#E6E8EE', true: colors.blue }} thumbColor="#fff" />
              }
            />
            <SettingsRow
              iconBg="#FFF0F3" icon="ban-outline" iconColor="#FF4D6A"
              title="Block List"
              subtitle="Manage blocked profiles"
              onPress={() => setBlockListSheet(true)}
              last
            />
          </>
        )}
      </ScrollView>

      <BasicInfoSheet
        visible={basicInfoSheet}
        profile={profile}
        onSave={updates => { setProfile(prev => ({ ...prev, ...updates })); setBasicInfoSheet(false); }}
        onClose={() => setBasicInfoSheet(false)}
      />

      <BlockListSheet
        visible={blockListSheet}
        onClose={() => setBlockListSheet(false)}
      />

      <WorkEduSheet
        visible={workEduSheet}
        profile={profile}
        onSave={updates => { setProfile(prev => ({ ...prev, ...updates })); setWorkEduSheet(false); }}
        onClose={() => setWorkEduSheet(false)}
      />

      <PromptSheet
        visible={promptSheet}
        editingPrompt={editingPrompt}
        onSave={savePrompt}
        onDelete={editingPrompt ? deletePrompt : undefined}
        onClose={() => { setPromptSheet(false); setEditingPrompt(null); }}
      />

      <ProfilePreviewModal
        visible={previewVisible}
        profile={profile}
        onClose={() => setPreviewVisible(false)}
      />

      <PreferencesSheet
        visible={preferencesSheet}
        profile={profile}
        onSave={updates => { setProfile(prev => ({ ...prev, ...updates })); setPreferencesSheet(false); }}
        onClose={() => setPreferencesSheet(false)}
      />

      <Modal visible={settingsSheet} transparent animationType="none" onRequestClose={animateSettingsClose}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: settingsBackdrop }]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={animateSettingsClose} />
          <Animated.View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 24, transform: [{ translateY: settingsSheetY }] }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 20 }} />
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B', paddingHorizontal: 20, marginBottom: 16 }}>Settings</Text>

            <TouchableOpacity
              onPress={() => { animateSettingsClose(); setTimeout(handleLogout, 250); }}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="log-out-outline" size={18} color="#FF4D6A" />
              </View>
              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: '#FF4D6A' }}>Log out</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const p = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },

  headerGray: { flexShrink: 0, paddingHorizontal: 20, paddingBottom: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.03 * 28 },
  gearBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2 },

  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  avatarName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  avatarCompletion: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#FF8B3E' },

  tabRow: { flexDirection: 'row', gap: 8 },
  tabPill: { backgroundColor: '#fff', borderRadius: 50, paddingHorizontal: 16, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  tabPillActive: { backgroundColor: colors.ink },
  tabPillText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink },
  tabPillTextActive: { color: '#fff' },
  vennPlusTab: { borderRadius: 50, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  vennPlusText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#fff' },

  white: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },

  completeBanner: { padding: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
  completeBannerTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: colors.ink, marginBottom: 1 },
  completeBannerSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2' },
  completePct: { fontFamily: 'SpaceMono_400Regular', fontSize: 14, fontWeight: '700', color: colors.blue },
  progressTrack: { backgroundColor: '#E8EDFF', borderRadius: 50, height: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 50 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 },
  sectionTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.ink },
  sectionAction: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: '#9AA0B2' },
  divider: { height: 1, backgroundColor: '#F0F1F5', marginHorizontal: 20 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingBottom: 18 },
  photoSlot: { width: PHOTO_SLOT_SIZE, height: PHOTO_SLOT_SIZE, borderRadius: 14, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingBottom: 18 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.canvas, borderRadius: 50, paddingHorizontal: 14, paddingVertical: 7 },
  chipEmoji: { fontSize: 13 },
  chipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink },

  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.canvas, borderRadius: 14, padding: 14 },
  infoCardTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink },
  infoCardSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2', marginTop: 2 },

  addCard: { borderWidth: 1.5, borderColor: '#D0D3DE', borderStyle: 'dashed', borderRadius: 12, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addCardText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2' },

  promptCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, minHeight: 110, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  promptCardEmpty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  promptCategory: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#8A5BFF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  promptQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: '#14161B', lineHeight: 21, marginBottom: 8 },
  promptA: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#5A6072', lineHeight: 20 },
  promptATap: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', marginTop: 10 },
  promptAddCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EDEEF2', alignItems: 'center', justifyContent: 'center' },
  promptAddText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: '#9AA0B2' },

  previewBtn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 14, alignItems: 'center' },
  previewBtnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: '#fff' },

  settingsSection: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 },
  settingsCatLabel: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11, color: '#9AA0B2', textTransform: 'uppercase', letterSpacing: 1 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 20, gap: 12 },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
  settingsIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  settingsTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: colors.ink, marginBottom: 2 },
  settingsSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12 },
});

// ─── Work/Edu sheet styles ────────────────────────────────────────────────────

const we = StyleSheet.create({
  label: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: '#9AA0B2', marginBottom: 8 },
  hint: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2', marginTop: -4, marginBottom: 10 },
  input: { backgroundColor: '#F2F3F7', borderRadius: 14, padding: 14, fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: '#14161B' },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50, borderWidth: 1.5, borderColor: '#E6E8EE', backgroundColor: '#F8F9FC' },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#5A6072' },
  chipTextOn: { color: '#fff' },
});

// ─── Block list sheet styles ───────────────────────────────────────────────────

const bl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { flex: 1, fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: '#14161B' },
  unblockBtn: { backgroundColor: '#F2F3F7', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8 },
  unblockText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: '#14161B' },
});

// ─── Basic info sheet styles ──────────────────────────────────────────────────

const bi = StyleSheet.create({
  label: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: '#9AA0B2', marginBottom: 8 },
  qLabel: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#14161B', marginBottom: 8 },
  input: { backgroundColor: '#F2F3F7', borderRadius: 14, padding: 14, fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: '#14161B' },
  numInput: { backgroundColor: '#F2F3F7', borderRadius: 14, padding: 14, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, textAlign: 'center', color: '#14161B' },
  error: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: colors.error, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50, borderWidth: 1.5, borderColor: '#E6E8EE', backgroundColor: '#F8F9FC' },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#5A6072' },
  chipTextOn: { color: '#fff' },
});

// ─── Profile preview styles ───────────────────────────────────────────────────

const pv = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  topTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.ink },
  topSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2', marginTop: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  name: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
  photoWrap: { borderRadius: 20, overflow: 'hidden', marginBottom: 10, height: 400, backgroundColor: colors.canvas },
  infoCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink },
  infoDivider: { width: 1, height: 20, backgroundColor: '#F0F0F4' },
  infoHoriz: { height: 1, backgroundColor: '#F0F0F4', marginVertical: 8 },
  promptWhite: { backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 10 },
  promptQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.slate, marginBottom: 10 },
  promptA: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.ink, letterSpacing: -0.4, lineHeight: 30 },
  promptAccent: { borderRadius: 20, padding: 24, marginBottom: 10 },
  promptAccentQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.violet, marginBottom: 10 },
});

// ─── Prompt sheet styles ──────────────────────────────────────────────────────

const pr = StyleSheet.create({
  tab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 50, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E6E8EE' },
  tabActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  tabText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#5A6072' },
  tabTextActive: { color: '#fff' },
  promptRow: { paddingVertical: 18, paddingHorizontal: 20 },
  promptRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
  promptRowText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 16, color: '#14161B', lineHeight: 22 },
});

// ─── Preferences sheet styles ─────────────────────────────────────────────────

const pref = StyleSheet.create({
  label: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: '#9AA0B2', marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50, borderWidth: 1.5, borderColor: '#E6E8EE', backgroundColor: '#F8F9FC' },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#5A6072' },
  chipTextOn: { color: '#fff' },
});
