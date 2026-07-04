import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import { calcAge } from '../lib/age';

// Read-only full-profile sheet — used from chat so people can re-check who
// they matched with (photos, budget, areas, prompts) mid-conversation.
export default function ProfileViewSheet({ visible, profile, onClose }) {
  const insets = useSafeAreaInsets();
  if (!profile) return null;

  const age = calcAge(profile.birthday);
  const photos = Array.isArray(profile.photos) ? profile.photos : [];
  const prompts = Array.isArray(profile.prompts) ? profile.prompts : [];
  const areas = Array.isArray(profile.preferred_areas) ? profile.preferred_areas : [];
  const job = [profile.job_title, profile.job_company].filter(Boolean).join(' at ') || null;
  const edu = [profile.education_school, profile.education_level].filter(Boolean).join(' · ') || null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[pv.sheet, { height: '92%', paddingBottom: insets.bottom + 16 }]}>
          <View style={pv.header}>
            <Text style={pv.headerTitle}>{profile.name ?? 'Profile'}</Text>
            <TouchableOpacity style={pv.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={16} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 32, gap: 10 }}>
            {photos.length > 0 ? (
              photos.map((p, i) => (
                <Image key={i} source={{ uri: p }} style={pv.photo} resizeMode="cover" />
              ))
            ) : (
              <View style={[pv.photo, { backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person" size={64} color={colors.mist} />
              </View>
            )}

            <Text style={pv.name}>{profile.name}{age ? `, ${age}` : ''}</Text>

            {(profile.gender || profile.budget || areas.length > 0 || job || edu) && (
              <View style={pv.infoCard}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: (job || edu) ? 12 : 0 }}>
                  {profile.gender ? <View style={pv.chip}><Text style={pv.chipText}>👤 {profile.gender}</Text></View> : null}
                  {profile.budget ? <View style={pv.chip}><Text style={pv.chipText}>💰 {profile.budget}</Text></View> : null}
                  {areas.length > 0 && (
                    <View style={pv.chip}><Text style={pv.chipText}>📍 {areas.join(', ')}</Text></View>
                  )}
                </View>
                {job ? (
                  <View style={[pv.infoRow, { marginBottom: edu ? 6 : 0 }]}>
                    <Ionicons name="briefcase-outline" size={15} color="#9AA0B2" />
                    <Text style={pv.infoText}>{job}</Text>
                  </View>
                ) : null}
                {edu ? (
                  <View style={pv.infoRow}>
                    <Ionicons name="school-outline" size={15} color="#9AA0B2" />
                    <Text style={pv.infoText}>{edu}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {prompts.map((pr, i) => (
              <View key={i} style={pv.promptCard}>
                <Text style={pv.promptQ}>{pr.q}</Text>
                <Text style={pv.promptA}>{pr.a}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const pv = StyleSheet.create({
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, position: 'absolute', bottom: 0, left: 0, right: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 10, paddingLeft: 20 },
  headerTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: colors.ink },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: 320, borderRadius: 18 },
  name: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: colors.ink, marginBottom: 6 },
  infoCard: { backgroundColor: '#F8F9FF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#EDEEF2' },
  chip: { backgroundColor: '#fff', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#E6E8EE' },
  chipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#5A6072' },
  promptCard: { backgroundColor: '#F8F9FF', borderRadius: 14, padding: 14 },
  promptQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: '#9AA0B2', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  promptA: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink, lineHeight: 22 },
});
