import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import OnboardingShell from '../../components/OnboardingShell';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getCurrentUserId } from '../../lib/auth';

function getExtension(uri) {
  const lastSegment = uri.split('?')[0].split('/').pop() || '';
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex > 0 && dotIndex < lastSegment.length - 1) {
    return lastSegment.slice(dotIndex + 1).toLowerCase();
  }
  return 'jpg'; // e.g. content:// URIs with no literal file extension
}

async function uploadToStorage(uri) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error('Not signed in');
  const ext = getExtension(uri);
  const path = `${uid}/${Date.now()}.${ext}`;
  const blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = reject;
    xhr.responseType = 'blob';
    xhr.open('GET', uri);
    xhr.send();
  });
  const { error } = await supabase.storage.from('photos').upload(path, blob, {
    contentType: `image/${ext}`,
    upsert: true,
  });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);
  return publicUrl;
}

export default function Photos() {
  const [userType, setUserType] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [flatPhotos, setFlatPhotos] = useState([null, null, null]);
  const [extraPhotos, setExtraPhotos] = useState([null, null, null, null, null]);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    async function loadUserType() {
      const uid = getCurrentUserId();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('user_type').eq('id', uid).single();
      setUserType(data?.user_type ?? 'seeking');
    }
    loadUserType();
  }, []);

  const isOwner = userType === 'owner';
  const canContinue = isOwner
    ? !!profilePhoto && flatPhotos.some(Boolean)
    : !!profilePhoto;

  async function pickPhoto(onDone, aspect) {
    if (uploading) return; // avoid concurrent picks racing on the shared uploading flag
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission needed', 'Please allow photo access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const url = await uploadToStorage(asset.uri);
      onDone(url);
    } catch (e) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleContinue() {
    const photos = isOwner
      ? [profilePhoto, ...flatPhotos].filter(Boolean)
      : [profilePhoto, ...extraPhotos].filter(Boolean);
    if (photos.length > 0) {
      try {
        const uid = getCurrentUserId();
        if (uid) {
          const { error } = await supabase.from('profiles').update({ photos }).eq('id', uid);
          if (error) throw error;
        }
      } catch (e) {
        // Don't advance pretending the photos were saved.
        Alert.alert('Could not save photos', e.message);
        return;
      }
    }
    router.push('/(onboarding)/notifications');
  }

  return (
    <OnboardingShell step={8} total={9}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {isOwner ? (
          <>
            <Text style={styles.title}>Add your photos</Text>
            <Text style={styles.subtitle}>Your profile photo is shown first. Flat photos help people picture living there.</Text>

            <Text style={styles.sectionLabel}>YOUR PHOTO</Text>
            <Text style={styles.sectionNote}>Shown as your profile picture — required</Text>
            <TouchableOpacity
              style={styles.slotMain}
              onPress={() => pickPhoto(setProfilePhoto, [1, 1])}
              activeOpacity={0.8}
            >
              {profilePhoto
                ? <Image source={{ uri: profilePhoto }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} resizeMode="cover" />
                : <>
                    <Ionicons name="person-add-outline" size={32} color={colors.placeholder} />
                    <Text style={styles.slotLabel}>Add profile photo</Text>
                  </>
              }
              {profilePhoto && (
                <View style={styles.changeOverlay}>
                  <Ionicons name="camera-outline" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>FLAT PHOTOS</Text>
            <Text style={styles.sectionNote}>At least 1 required — show the living room, bedroom, common areas</Text>
            <View style={styles.grid}>
              {flatPhotos.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.slot}
                  onPress={() => pickPhoto(url => setFlatPhotos(prev => prev.map((x, j) => j === i ? url : x)), [4, 3])}
                  activeOpacity={0.8}
                >
                  {p
                    ? <>
                        <Image source={{ uri: p }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} resizeMode="cover" />
                        <View style={styles.changeOverlaySmall}>
                          <Ionicons name="camera-outline" size={14} color="#fff" />
                        </View>
                      </>
                    : <>
                        <Ionicons name="home-outline" size={24} color={colors.placeholder} />
                        <Text style={styles.slotLabel}>{i === 0 ? 'Main room' : i === 1 ? 'Bedroom' : 'Kitchen'}</Text>
                      </>
                  }
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.notice, { marginTop: 20 }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.blue} />
              <Text style={styles.noticeText}>Flat photos are required so people can see what they're moving into.</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Add your photo</Text>
            <Text style={styles.subtitle}>Your profile photo is the first thing people see. Profiles with photos get 4× more responses.</Text>

            <TouchableOpacity
              style={styles.slotMain}
              onPress={() => pickPhoto(setProfilePhoto, [1, 1])}
              activeOpacity={0.8}
            >
              {profilePhoto
                ? <Image source={{ uri: profilePhoto }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} resizeMode="cover" />
                : <>
                    <Ionicons name="person-add-outline" size={32} color={colors.placeholder} />
                    <Text style={styles.slotLabel}>Add profile photo</Text>
                  </>
              }
              {profilePhoto && (
                <View style={styles.changeOverlay}>
                  <Ionicons name="camera-outline" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </>
        )}

        {uploading && (
          <View style={styles.uploadRow}>
            <ActivityIndicator size="small" color={colors.blue} />
            <Text style={styles.uploadText}>Uploading...</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.btn, (!canContinue || uploading) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue || uploading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>
        {!isOwner && (
          // Goes through handleContinue so a photo that was already uploaded
          // still gets saved to the profile instead of being discarded.
          <TouchableOpacity onPress={handleContinue} disabled={uploading}>
            <Text style={styles.skip}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, color: colors.ink, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 24 },
  sectionLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: colors.slate, marginBottom: 4 },
  sectionNote: { fontSize: 12, color: colors.placeholder, marginBottom: 14 },
  optional: { fontFamily: 'System', textTransform: 'none', letterSpacing: 0, color: colors.placeholder, fontSize: 12 },

  slotMain: {
    width: '100%', height: 180, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.mist, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.canvas, marginBottom: 8, overflow: 'hidden',
  },
  slotLabel: { fontSize: 13, color: colors.placeholder, textAlign: 'center' },
  changeOverlay: {
    position: 'absolute', bottom: 10, right: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  changeOverlaySmall: {
    position: 'absolute', bottom: 6, right: 6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: {
    width: '31%', aspectRatio: 1, borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.mist, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.canvas, overflow: 'hidden',
  },
  plus: { fontSize: 28, color: colors.placeholder, fontWeight: '300' },

  notice: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#EEF1FF', borderRadius: 12, padding: 14,
  },
  noticeText: { flex: 1, fontSize: 13, color: colors.ink, lineHeight: 18 },

  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, justifyContent: 'center' },
  uploadText: { fontSize: 13, color: colors.slate },

  footer: { paddingHorizontal: 0, paddingTop: 24, gap: 12 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skip: { fontSize: 14, color: colors.slate, textAlign: 'center' },
});
