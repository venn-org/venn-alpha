import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getNotifications, markAllRead, markRead } from '../../lib/notifications';

const NOTIF_META = {
  match:   { icon: 'heart',              bg: '#FFF0F3', color: '#FF4D6A' },
  like:    { icon: 'heart-outline',      bg: '#FFF0F3', color: '#FF4D6A' },
  message: { icon: 'chatbubble-outline', bg: '#EEF1FF', color: colors.blue },
};

function textFor(n) {
  switch (n.type) {
    case 'match': return `You matched with ${n.actorName}! Start a conversation.`;
    case 'like': return `${n.actorName} liked your profile.`;
    case 'message': return `${n.actorName} sent you a message: "${n.content ?? ''}"`;
    default: return '';
  }
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function groupNotifs(list) {
  const today = [], yesterday = [], earlier = [];
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 3600 * 1000;
  list.forEach(n => {
    const t = new Date(n.createdAt).getTime();
    if (t >= startOfToday) today.push(n);
    else if (t >= startOfYesterday) yesterday.push(n);
    else earlier.push(n);
  });
  return { today, yesterday, earlier };
}

function NotifRow({ notif, last, onPress }) {
  const meta = NOTIF_META[notif.type] ?? NOTIF_META.like;
  return (
    <TouchableOpacity style={[s.row, !last && s.rowBorder]} activeOpacity={0.7} onPress={onPress}>
      <View style={[s.iconWrap, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
      </View>
      <View style={s.rowBody}>
        <Text style={[s.rowText, !notif.read && s.rowTextUnread]}>{textFor(notif)}</Text>
        <Text style={s.rowTime}>{timeAgo(notif.createdAt)}</Text>
      </View>
      {!notif.read && <View style={s.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    async function load() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id;
        if (!uid) return;
        setNotifs(await getNotifications(uid));
      } catch (_) {}
      finally {
        setLoading(false);
      }
    }
    load();
  }, []));

  async function handleMarkAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id;
    if (uid) await markAllRead(uid);
  }

  async function handlePress(n) {
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    if (!n.read) {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (uid) markRead(uid, n.id);
    }
    if ((n.type === 'match' || n.type === 'message') && n.matchId) {
      router.push({ pathname: '/(tabs)/chat', params: { name: n.actorName, photo: n.actorPhoto ?? '', matchId: n.matchId } });
    } else if (n.type === 'like') {
      router.push('/(tabs)/likes');
    }
  }

  const { today, yesterday, earlier } = groupNotifs(notifs);
  const isEmpty = notifs.length === 0;

  return (
    <View style={[s.screen, { paddingTop: insets.top + 4 }]}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Notifications</Text>
        <TouchableOpacity activeOpacity={0.8} onPress={handleMarkAllRead}>
          <Text style={s.markAll}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text style={s.emptyText}>Loading...</Text>
        ) : isEmpty ? (
          <View style={s.empty}>
            <Ionicons name="notifications-outline" size={40} color="#D5D8E0" />
            <Text style={s.emptyTitle}>No notifications yet</Text>
            <Text style={s.emptySub}>Likes, matches, and messages will show up here.</Text>
          </View>
        ) : (
          <>
            {today.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>TODAY</Text>
                {today.map((n, i) => (
                  <NotifRow key={n.id} notif={n} last={i === today.length - 1} onPress={() => handlePress(n)} />
                ))}
              </View>
            )}
            {yesterday.length > 0 && (
              <View style={[s.section, { marginTop: 8 }]}>
                <Text style={s.sectionLabel}>YESTERDAY</Text>
                {yesterday.map((n, i) => (
                  <NotifRow key={n.id} notif={n} last={i === yesterday.length - 1} onPress={() => handlePress(n)} />
                ))}
              </View>
            )}
            {earlier.length > 0 && (
              <View style={[s.section, { marginTop: 8 }]}>
                <Text style={s.sectionLabel}>EARLIER</Text>
                {earlier.map((n, i) => (
                  <NotifRow key={n.id} notif={n} last={i === earlier.length - 1} onPress={() => handlePress(n)} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: colors.ink },
  markAll: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.blue },

  scroll: { flex: 1 },
  section: { paddingHorizontal: 20, paddingTop: 16 },
  sectionLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: '#9AA0B2', marginBottom: 10 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowBody: { flex: 1 },
  rowText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink, lineHeight: 20, marginBottom: 3 },
  rowTextUnread: { fontFamily: 'HankenGrotesk_600SemiBold' },
  rowTime: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue, flexShrink: 0 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 100, gap: 10 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: colors.ink, textAlign: 'center' },
  emptySub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', textAlign: 'center', lineHeight: 19 },
  emptyText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', marginTop: 40 },
});
