import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, Pressable, Animated, Dimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

const SCREEN_H = Dimensions.get('window').height;

const REASONS = [
  'Fake profile',
  'Harassment or abuse',
  'Inappropriate photos',
  'Spam or scam',
  'Other',
];

export default function ReportSheet({ visible, targetId, targetName, onClose, onSubmitted }) {
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      setReason(null);
      setDetails('');
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

  async function submit() {
    if (!reason || !targetId) return;
    setSubmitting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;
      const { error } = await supabase.from('reports').insert({
        reporter_id: uid,
        reported_id: targetId,
        reason,
        details: details.trim() || null,
      });
      if (error) { Alert.alert('Report failed', error.message); return; }
      onSubmitted?.();
      animateClose();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        <Animated.View style={[rs.sheet, { transform: [{ translateY: sheetY }] }]}>
          <View style={rs.handle} />
          <View style={rs.header}>
            <Text style={rs.title}>Report {targetName ?? 'profile'}</Text>
            <TouchableOpacity style={rs.closeBtn} onPress={animateClose} activeOpacity={0.7}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>
          <Text style={rs.hint}>Your report is confidential — {targetName ?? 'they'} won't be notified.</Text>

          <View style={rs.reasons}>
            {REASONS.map(r => {
              const on = reason === r;
              return (
                <TouchableOpacity key={r} style={rs.reasonRow} onPress={() => setReason(r)} activeOpacity={0.7}>
                  <Text style={rs.reasonText}>{r}</Text>
                  <View style={[rs.radio, on && rs.radioOn]}>
                    {on && <View style={rs.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={rs.details}
            placeholder="Add details (optional)"
            placeholderTextColor="#9AA0B2"
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={300}
          />

          <TouchableOpacity onPress={submit} disabled={!reason || submitting} activeOpacity={0.85}>
            <LinearGradient
              colors={reason ? ['#335CFF', '#8A5BFF'] : ['#C8CAD2', '#C8CAD2']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={rs.submitBtn}
            >
              <Text style={rs.submitText}>{submitting ? 'Submitting…' : 'Submit report'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const rs = StyleSheet.create({
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: SCREEN_H * 0.8,
    paddingHorizontal: 20, paddingBottom: 32,
  },
  handle: { width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' },
  hint: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', marginBottom: 16 },

  reasons: { marginBottom: 14 },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F1F5',
  },
  reasonText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: '#14161B' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#C8CAD2', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.blue },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue },

  details: {
    backgroundColor: '#F2F3F7', borderRadius: 14, padding: 14, minHeight: 70,
    fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#14161B',
    textAlignVertical: 'top', marginBottom: 16,
  },

  submitBtn: { borderRadius: 50, paddingVertical: 16, alignItems: 'center' },
  submitText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff' },
});
