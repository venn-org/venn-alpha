import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Modal, Pressable, StyleSheet, Dimensions, TextInput, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { getCurrentUserId } from '../lib/auth';

const SCREEN_H = Dimensions.get('window').height;

// ─── Constants ────────────────────────────────────────────────────────────────

export const AREA_GROUPS = [
  {
    city: 'Mumbai',
    areas: ['Bandra', 'Andheri', 'Juhu', 'Worli', 'Dadar', 'Malad', 'Goregaon', 'Borivali', 'Vile Parle', 'Powai', 'Thane', 'Lower Parel', 'Kurla'],
  },
  {
    city: 'Navi Mumbai',
    areas: ['Vashi', 'Kharghar', 'Belapur', 'Airoli', 'Nerul', 'Panvel', 'Ghansoli'],
  },
];

export const ALL_PREDEFINED_AREAS = AREA_GROUPS.flatMap(g => g.areas);

export const PREF_SECTIONS = [
  {
    title: 'ABOUT YOUR FLAT',
    rows: [
      { key: 'role', label: 'I am', placeholder: 'Not set', multi: false,
        opts: ['🔍 Looking for a flat', '🏠 Have a flat / room'] },
      { key: 'areas', label: 'Preferred areas', placeholder: 'Open to all', multi: true,
        groups: AREA_GROUPS },
      { key: 'flatType', label: 'Flat / room type', placeholder: 'Open to all', multi: true,
        opts: ['1 BHK', '2 BHK', '3 BHK', 'Studio', 'Private room', 'Shared room', 'PG'] },
      { key: 'budget', label: 'Monthly budget', placeholder: 'Open to all', multi: false,
        opts: ['Under ₹10k', '₹10k–20k', '₹20k–35k', '₹35k–50k', '₹50k+'] },
      { key: 'moveIn', label: 'Move-in date', placeholder: 'Open to all', multi: false,
        opts: ['ASAP', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Flexible'] },
    ],
  },
  {
    title: 'ABOUT YOUR FLATMATE',
    rows: [
      { key: 'gender', label: 'Gender preference', placeholder: 'Open to all', multi: false,
        opts: ['👩 Women only', '👨 Men only', '🌈 Any gender'] },
      { key: 'age', label: 'Age range', placeholder: 'Open to all', multi: false,
        opts: ['18–22', '22–26', '26–30', '30–35', '35+', 'Flexible'] },
      { key: 'occupation', label: 'Occupation', placeholder: 'Open to all', multi: true,
        opts: ['💼 Working professional', '🎓 Student', '💻 Freelancer', '🚀 Entrepreneur'] },
      { key: 'food', label: 'Food habits', placeholder: 'Open to all', multi: true,
        opts: ['🥦 Veg only', '🍳 Eggetarian ok', '🍗 Non-veg ok', '🌱 Vegan only'] },
      { key: 'smoking', label: 'Smoking', placeholder: 'Open to all', multi: false,
        opts: ['🚭 Non-smoker', '🚬 Smoker ok', '🏠 Outside only'] },
      { key: 'drinking', label: 'Drinking', placeholder: 'Open to all', multi: false,
        opts: ['🚫 Teetotaller only', '🍷 Social drinker ok', '🍺 Fine with drinking'] },
      { key: 'pets', label: 'Pets', placeholder: 'Open to all', multi: true,
        opts: ['🐶 I have a pet', '✅ Fine with pets', '🚫 No pets please', '🤧 Allergic'] },
    ],
  },
];

export const VENN_PLUS_ROWS = [
  'Sleep schedule', 'Cleanliness level', 'Guests at home',
  'Work from home', 'Noise level', 'Weekend habits',
];

export const INIT_PREFS = {
  role: null, areas: [], flatType: [], budget: null,
  moveIn: null, gender: null, age: null,
  occupation: [], food: [], smoking: null, drinking: null, pets: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getPrefDisplay(prefs, key, placeholder, multi) {
  const val = prefs[key];
  if (multi) {
    if (!val || val.length === 0) return placeholder;
    return val.length === 1 ? val[0] : `${val.length} selected`;
  }
  return val || placeholder;
}

export function isPrefSet(prefs, key, multi) {
  const val = prefs[key];
  if (multi) return Array.isArray(val) && val.length > 0;
  return !!val;
}

export async function savePrefsToSupabase(p) {
  const uid = getCurrentUserId();
  const uid = uid;
  if (!uid) return;
  const { error } = await supabase.from('profiles').update({
    pref_role:       p.role       ?? null,
    pref_areas:      p.areas?.length      ? p.areas      : null,
    pref_flat_type:  p.flatType?.length    ? p.flatType   : null,
    pref_budget:     p.budget     ?? null,
    pref_move_in:    p.moveIn     ?? null,
    pref_gender:     p.gender     ?? null,
    pref_age:        p.age        ?? null,
    pref_occupation: p.occupation?.length  ? p.occupation : null,
    pref_food:       p.food?.length        ? p.food       : null,
    pref_smoking:    p.smoking    ?? null,
    pref_drinking:   p.drinking   ?? null,
    pref_pets:       p.pets?.length        ? p.pets       : null,
  }).eq('id', uid);
  if (error) throw error;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PreferencesSheet({ visible, onClose, prefs, onSave }) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(prefs);
  const [openKey, setOpenKey] = useState(null);
  const [otherInput, setOtherInput] = useState('');
  const [showOther, setShowOther] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      setDraft(prefs); setOpenKey(null); setOtherInput(''); setShowOther(false);
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

  function toggleOpt(key, opt, multi) {
    setDraft(d => {
      if (multi) {
        const cur = Array.isArray(d[key]) ? d[key] : [];
        return { ...d, [key]: cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt] };
      }
      return { ...d, [key]: d[key] === opt ? null : opt };
    });
  }

  function isSelected(key, opt, multi) {
    if (multi) return (Array.isArray(draft[key]) ? draft[key] : []).includes(opt);
    return draft[key] === opt;
  }

  function addCustomArea() {
    const val = otherInput.trim();
    if (!val) return;
    setDraft(d => {
      const cur = Array.isArray(d.areas) ? d.areas : [];
      if (cur.includes(val)) return d;
      return { ...d, areas: [...cur, val] };
    });
    setOtherInput('');
    setShowOther(false);
  }

  function removeArea(area) {
    setDraft(d => ({ ...d, areas: (d.areas ?? []).filter(a => a !== area) }));
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <View style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />

        <Animated.View style={[ps.sheet, { height: SCREEN_H * 0.72, paddingBottom: insets.bottom, transform: [{ translateY: sheetY }] }]}>
          <View style={ps.handle} />

          <View style={ps.header}>
            <Text style={ps.title}>Preferences</Text>
            <TouchableOpacity style={ps.closeBtn} onPress={animateClose} activeOpacity={0.7}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>
          <Text style={ps.subtitle}>Set what you need — we'll show you the right matches.</Text>
          <View style={ps.headerDivider} />

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {PREF_SECTIONS.map(section => (
              <View key={section.title} style={{ paddingHorizontal: 20 }}>
                <View style={ps.sectionHeader}>
                  <Text style={ps.sectionTitle}>{section.title}</Text>
                  <View style={ps.sectionLine} />
                </View>
                {section.rows.map((row, ri) => {
                  const isOpen = openKey === row.key;
                  const display = getPrefDisplay(draft, row.key, row.placeholder, row.multi);
                  const isLast = ri === section.rows.length - 1;
                  return (
                    <View key={row.key}>
                      <TouchableOpacity
                        style={[ps.prefRow, !isLast && !isOpen && ps.prefRowBorder]}
                        onPress={() => setOpenKey(isOpen ? null : row.key)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={ps.prefTitle}>{row.label}</Text>
                          <Text style={[ps.prefVal, display !== row.placeholder && ps.prefValSet]}>
                            {display}
                          </Text>
                        </View>
                        <Ionicons
                          name={isOpen ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color="#9AA0B2"
                        />
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={[ps.optsWrap, !isLast && ps.prefRowBorder]}>
                          {row.groups ? (
                            <>
                              {row.groups.map(group => (
                                <View key={group.city} style={{ width: '100%' }}>
                                  <Text style={ps.groupLabel}>{group.city}</Text>
                                  <View style={ps.groupChips}>
                                    {group.areas.map(opt => {
                                      const sel = isSelected('areas', opt, true);
                                      return (
                                        <TouchableOpacity
                                          key={opt}
                                          style={[ps.optChip, sel && ps.optChipOn]}
                                          onPress={() => toggleOpt('areas', opt, true)}
                                          activeOpacity={0.8}
                                        >
                                          <Text style={[ps.optChipText, sel && ps.optChipTextOn]}>{opt}</Text>
                                        </TouchableOpacity>
                                      );
                                    })}
                                  </View>
                                </View>
                              ))}
                              {(draft.areas ?? []).filter(a => !ALL_PREDEFINED_AREAS.includes(a)).length > 0 && (
                                <View style={{ width: '100%' }}>
                                  <Text style={ps.groupLabel}>Other</Text>
                                  <View style={ps.groupChips}>
                                    {(draft.areas ?? []).filter(a => !ALL_PREDEFINED_AREAS.includes(a)).map(a => (
                                      <TouchableOpacity
                                        key={a}
                                        style={[ps.optChip, ps.optChipOn, ps.optChipCustom]}
                                        onPress={() => removeArea(a)}
                                        activeOpacity={0.8}
                                      >
                                        <Text style={[ps.optChipText, ps.optChipTextOn]}>{a}</Text>
                                        <Ionicons name="close" size={12} color="#fff" style={{ marginLeft: 4 }} />
                                      </TouchableOpacity>
                                    ))}
                                  </View>
                                </View>
                              )}
                              {showOther ? (
                                <View style={ps.otherRow}>
                                  <TextInput
                                    style={ps.otherInput}
                                    placeholder="Type a location..."
                                    placeholderTextColor="#9AA0B2"
                                    value={otherInput}
                                    onChangeText={setOtherInput}
                                    autoFocus
                                    returnKeyType="done"
                                    onSubmitEditing={addCustomArea}
                                  />
                                  <TouchableOpacity style={ps.otherAddBtn} onPress={addCustomArea} activeOpacity={0.8}>
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <TouchableOpacity
                                  style={[ps.optChip, ps.otherChip]}
                                  onPress={() => setShowOther(true)}
                                  activeOpacity={0.8}
                                >
                                  <Ionicons name="add" size={14} color={colors.slate} />
                                  <Text style={[ps.optChipText, { marginLeft: 4 }]}>Other</Text>
                                </TouchableOpacity>
                              )}
                            </>
                          ) : (
                            row.opts.map(opt => {
                              const sel = isSelected(row.key, opt, row.multi);
                              return (
                                <TouchableOpacity
                                  key={opt}
                                  style={[ps.optChip, sel && ps.optChipOn]}
                                  onPress={() => toggleOpt(row.key, opt, row.multi)}
                                  activeOpacity={0.8}
                                >
                                  <Text style={[ps.optChipText, sel && ps.optChipTextOn]}>
                                    {opt}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}

            <View style={{ paddingHorizontal: 20 }}>
              <View style={ps.sectionHeader}>
                <Text style={ps.sectionTitle}>VENN+ PREFERENCES</Text>
                <View style={ps.sectionLine} />
              </View>
              <LinearGradient
                colors={['#F3EEFF', '#EEF0FF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={ps.vennPlusBanner}
              >
                <LinearGradient
                  colors={['#8A5BFF', '#335CFF']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={ps.vennPlusIcon}
                >
                  <Ionicons name="star" size={16} color="#fff" />
                </LinearGradient>
                <View>
                  <Text style={ps.vennPlusTitle}>Upgrade to Venn+</Text>
                  <Text style={ps.vennPlusSub}>Fine-tune with our Matchmaking Genie.</Text>
                </View>
              </LinearGradient>
              <View style={{ opacity: 0.4 }}>
                {VENN_PLUS_ROWS.map((label, i) => (
                  <View
                    key={label}
                    style={[ps.prefRow, i < VENN_PLUS_ROWS.length - 1 && ps.prefRowBorder]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={ps.prefTitle}>{label}</Text>
                      <Text style={ps.prefVal}>Open to all</Text>
                    </View>
                    <Ionicons name="lock-closed" size={16} color="#9AA0B2" />
                  </View>
                ))}
              </View>
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={ps.saveFooter}>
            <TouchableOpacity onPress={() => onSave(draft)} activeOpacity={0.85}>
              <LinearGradient
                colors={['#335CFF', '#8A5BFF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={ps.saveBtn}
              >
                <Text style={ps.saveBtnText}>Save preferences</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const ps = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    flexDirection: 'column',
  },

  handle: { width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 16 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 4 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, fontWeight: '700', color: '#14161B' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', paddingHorizontal: 20, marginBottom: 16 },
  headerDivider: { height: 1, backgroundColor: '#F0F1F5', marginHorizontal: 0 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 18, paddingBottom: 8 },
  sectionTitle: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#9AA0B2', letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#F0F1F5' },

  prefRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  prefRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
  prefTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, fontWeight: '600', color: '#14161B', marginBottom: 2 },
  prefVal: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2' },
  prefValSet: { color: colors.blue, fontFamily: 'HankenGrotesk_600SemiBold' },

  optsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 14 },
  optChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50,
    borderWidth: 1.5, borderColor: '#E6E8EE', backgroundColor: '#F8F9FC',
  },
  optChipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  optChipCustom: { backgroundColor: colors.violet, borderColor: colors.violet },
  optChipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#5A6072' },
  optChipTextOn: { color: '#fff' },

  groupLabel: {
    fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1,
    color: '#9AA0B2', textTransform: 'uppercase', marginBottom: 8, marginTop: 4,
  },
  groupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },

  otherChip: { borderStyle: 'dashed' },
  otherRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', marginTop: 4 },
  otherInput: {
    flex: 1, height: 40, borderRadius: 50, borderWidth: 1.5,
    borderColor: colors.blue, paddingHorizontal: 16,
    fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink,
    backgroundColor: '#F0F4FF',
  },
  otherAddBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },

  vennPlusBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 14 },
  vennPlusIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  vennPlusTitle: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, fontWeight: '700', color: '#8A5BFF', marginBottom: 2 },
  vennPlusSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2' },

  saveFooter: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: '#F0F1F5',
    backgroundColor: '#fff',
  },
  saveBtn: { borderRadius: 50, overflow: 'hidden', paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, fontWeight: '700', color: '#fff' },
});
