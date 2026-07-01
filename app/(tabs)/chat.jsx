import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, KeyboardAvoidingView, Platform, Image, Animated, Alert,
  Modal, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { activeStatusText } from '../../lib/presence';
import { blockUser } from '../../lib/blocks';
import { unmatchUser } from '../../lib/matches';
import ReportSheet from '../../components/ReportSheet';

const PAGE_SIZE = 30;

const DEMO_MESSAGES = [
  { id: '1', content: "Hey! Saw your profile — really liked your vibe 😊", mine: false, time: '10:32 AM' },
  { id: '2', content: "Haha thanks! Your place in Bandra looks amazing btw", mine: true, time: '10:34 AM', read: true },
  { id: '3', content: "I have a 2BHK in Bandra West, looking for a flatmate 🙂", mine: false, time: '10:35 AM' },
  { id: '4', content: "That sounds perfect! What's the rent split?", mine: true, time: '10:36 AM', read: false },
  { id: '5', content: "Around ₹18k each. Flat has a great balcony and the society is super chill", mine: false, time: '10:38 AM' },
];

export default function Chat() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { name, matchId, photo, prefill } = useLocalSearchParams();
  const [messages, setMessages] = useState(matchId ? [] : DEMO_MESSAGES);
  const [loadingMsgs, setLoadingMsgs] = useState(!!matchId);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState(prefill ?? '');
  const [otherStatus, setOtherStatus] = useState(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const scrollRef = useRef(null);
  const displayName = name ?? 'Chat';
  const sendScale = useRef(new Animated.Value(1)).current;
  const otherLastActiveRef = useRef(null);
  const otherIdRef = useRef(null);
  const uidRef = useRef(null);
  const oldestCursorRef = useRef(null);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const scrollYRef = useRef(0);
  const pendingPrependRef = useRef(false);
  const channelRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const stopTypingTimeoutRef = useRef(null);
  const otherTypingTimeoutRef = useRef(null);

  function animateSend() {
    Animated.sequence([
      Animated.spring(sendScale, { toValue: 0.82, friction: 8, useNativeDriver: false }),
      Animated.spring(sendScale, { toValue: 1,    friction: 8, useNativeDriver: false }),
    ]).start();
  }

  useEffect(() => {
    if (!matchId) return;
    let uid = null;
    let otherId = null;

    async function markRead(myUid, otherUid) {
      await Promise.all([
        supabase.from('messages').update({ read: true })
          .eq('match_id', matchId).eq('sender_id', otherUid).eq('read', false),
        supabase.from('notifications').update({ read: true })
          .eq('user_id', myUid).eq('match_id', matchId).in('type', ['message', 'match']).eq('read', false),
      ]);
    }

    async function load() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        uid = authData?.user?.id;
        uidRef.current = uid;

        const { data: matchRow } = await supabase
          .from('matches').select('user1_id, user2_id').eq('id', matchId).single();
        if (matchRow) {
          otherId = matchRow.user1_id === uid ? matchRow.user2_id : matchRow.user1_id;
          otherIdRef.current = otherId;
          const { data: otherProfile } = await supabase
            .from('profiles').select('last_active_at').eq('id', otherId).single();
          otherLastActiveRef.current = otherProfile?.last_active_at ?? null;
          setOtherStatus(activeStatusText(otherLastActiveRef.current));
        }

        const { data, error } = await supabase
          .from('messages')
          .select('id, content, sender_id, created_at, read')
          .eq('match_id', matchId)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);
        if (error) throw error;
        const rows = (data ?? []).slice().reverse();
        oldestCursorRef.current = rows[0]?.created_at ?? null;
        setHasMore((data ?? []).length === PAGE_SIZE);
        setMessages(rows.map(m => ({
          id: m.id, content: m.content, mine: m.sender_id === uid, read: m.read,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })));
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 0);

        if (uid && otherId) await markRead(uid, otherId);
      } catch (e) {
        Alert.alert('Could not load messages', e.message);
      } finally {
        setLoadingMsgs(false);
      }
    }

    load();

    const statusInterval = setInterval(() => {
      if (otherLastActiveRef.current) setOtherStatus(activeStatusText(otherLastActiveRef.current));
    }, 30000);

    const channel = supabase
      .channel(`match-${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          const msg = payload.new;
          // Compare against the ref (not just the closure `uid`, which is only
          // assigned once load()'s own getUser() resolves) so a message sent
          // before that resolves can't slip past this check.
          if (msg.sender_id === (uidRef.current ?? uid)) return;
          // Only auto-scroll if the user was already near the bottom — otherwise
          // a message arriving while they're reading older (paginated-in) history
          // shouldn't yank them back down.
          const nearBottom = contentHeightRef.current - (scrollYRef.current + viewportHeightRef.current) < 100;
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev; // already present (e.g. optimistic id already reconciled)
            return [...prev, {
              id: msg.id, content: msg.content, mine: false, read: msg.read,
              time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }];
          });
          if (nearBottom) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
          // Chat is open and visible — mark this incoming message read right away.
          if (uid && otherId) markRead(uid, otherId);
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          const msg = payload.new;
          if (msg.sender_id !== uid) return; // only care about read-receipts on my own messages
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: msg.read } : m));
        })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload || payload.userId === uid) return;
        clearTimeout(otherTypingTimeoutRef.current);
        setOtherTyping(!!payload.typing);
        if (payload.typing) {
          otherTypingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 4000);
        }
      })
      .subscribe();
    channelRef.current = channel;

    return () => {
      if (uid) channel.send({ type: 'broadcast', event: 'typing', payload: { userId: uid, typing: false } });
      supabase.removeChannel(channel);
      channelRef.current = null;
      clearInterval(statusInterval);
      clearTimeout(otherTypingTimeoutRef.current);
      clearTimeout(stopTypingTimeoutRef.current);
    };
  }, [matchId]);

  async function loadMore() {
    if (!matchId || !hasMore || loadingMore || !oldestCursorRef.current) return;
    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at, read')
        .eq('match_id', matchId)
        .lt('created_at', oldestCursorRef.current)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (error) throw error;
      const rows = (data ?? []).slice().reverse();
      setHasMore((data ?? []).length === PAGE_SIZE);
      if (rows.length > 0) {
        oldestCursorRef.current = rows[0].created_at;
        const uid = uidRef.current;
        pendingPrependRef.current = true;
        setMessages(prev => [
          ...rows.map(m => ({
            id: m.id, content: m.content, mine: m.sender_id === uid, read: m.read,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          })),
          ...prev,
        ]);
      }
    } catch (e) {
      Alert.alert('Could not load earlier messages', e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  function handleContentSizeChange(w, h) {
    if (pendingPrependRef.current) {
      const delta = h - contentHeightRef.current;
      pendingPrependRef.current = false;
      scrollRef.current?.scrollTo({ y: scrollYRef.current + delta, animated: false });
    }
    contentHeightRef.current = h;
  }

  function confirmUnmatch() {
    Alert.alert(
      `Unmatch ${displayName}?`,
      "This removes the match and deletes your conversation. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unmatch', style: 'destructive', onPress: doUnmatch },
      ],
    );
  }

  async function doUnmatch() {
    if (!matchId) return;
    const { error } = await unmatchUser(matchId);
    if (error) { Alert.alert('Could not unmatch', error.message); return; }
    router.back();
  }

  function confirmBlock() {
    if (!uidRef.current || !otherIdRef.current) {
      Alert.alert('Please wait', "Still loading this conversation — try again in a moment.");
      return;
    }
    Alert.alert(
      `Block ${displayName}?`,
      "You won't see each other on Venn anymore, and this chat will be removed.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: doBlock },
      ],
    );
  }

  async function doBlock() {
    const uid = uidRef.current;
    const otherId = otherIdRef.current;
    if (!uid || !otherId) return;
    const { error } = await blockUser(uid, otherId);
    if (error) { Alert.alert('Could not block', error.message); return; }
    router.back();
  }

  function handleTextChange(v) {
    setText(v);
    const uid = uidRef.current;
    if (!matchId || !uid) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1500) {
      lastTypingSentRef.current = now;
      channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: uid, typing: true } });
    }
    clearTimeout(stopTypingTimeoutRef.current);
    stopTypingTimeoutRef.current = setTimeout(() => {
      lastTypingSentRef.current = 0;
      channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: uid, typing: false } });
    }, 2000);
  }

  async function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    animateSend();
    const localId = Date.now().toString();
    const msg = { id: localId, content: trimmed, mine: true, read: false, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, msg]);
    setText('');
    clearTimeout(stopTypingTimeoutRef.current);
    lastTypingSentRef.current = 0;
    const typingUid = uidRef.current;
    if (typingUid) channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: typingUid, typing: false } });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    if (!matchId) return;
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) throw new Error('Not signed in');
      const { data: inserted, error } = await supabase.from('messages')
        .insert({ match_id: matchId, sender_id: uid, content: trimmed })
        .select('id').single();
      if (error) throw error;
      if (inserted) setMessages(prev => prev.map(m => m.id === localId ? { ...m, id: inserted.id } : m));
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== localId));
      setText(trimmed);
      Alert.alert('Message not sent', e.message);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <View style={s.headerAvatar}>
              {photo
                ? <Image source={{ uri: photo }} style={{ width: 36, height: 36, borderRadius: 18 }} resizeMode="cover" />
                : <Text style={s.headerAvatarInitial}>{(displayName[0] ?? '?').toUpperCase()}</Text>
              }
            </View>
            <View>
              <Text style={s.headerName}>{displayName}</Text>
              {otherTyping ? (
                <Text style={[s.headerStatus, s.headerStatusTyping]}>Typing…</Text>
              ) : otherStatus ? (
                <Text style={[s.headerStatus, !otherStatus.startsWith('Active now') && s.headerStatusOffline]}>
                  {otherStatus}
                </Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity style={s.moreBtn} activeOpacity={0.7} onPress={() => setMenuOpen(true)}>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <Pressable style={[s.menuBackdrop, { paddingTop: insets.top + 60 }]} onPress={() => setMenuOpen(false)}>
            <View style={s.menuBox}>
              <TouchableOpacity style={s.menuItem} activeOpacity={0.7} onPress={() => { setMenuOpen(false); confirmUnmatch(); }}>
                <Ionicons name="heart-dislike-outline" size={16} color={colors.ink} />
                <Text style={s.menuItemText}>Unmatch</Text>
              </TouchableOpacity>
              <View style={s.menuDivider} />
              <TouchableOpacity style={s.menuItem} activeOpacity={0.7} onPress={() => { setMenuOpen(false); confirmBlock(); }}>
                <Ionicons name="ban-outline" size={16} color={colors.ink} />
                <Text style={s.menuItemText}>Block</Text>
              </TouchableOpacity>
              <View style={s.menuDivider} />
              <TouchableOpacity
                style={s.menuItem}
                activeOpacity={0.7}
                onPress={() => {
                  setMenuOpen(false);
                  if (!otherIdRef.current) {
                    Alert.alert('Please wait', "Still loading this conversation — try again in a moment.");
                    return;
                  }
                  setReportVisible(true);
                }}
              >
                <Ionicons name="flag-outline" size={16} color="#FF4D6A" />
                <Text style={[s.menuItemText, { color: '#FF4D6A' }]}>Report</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        <ReportSheet
          visible={reportVisible}
          targetId={otherIdRef.current}
          targetName={displayName}
          onClose={() => setReportVisible(false)}
          onSubmitted={() => Alert.alert('Report submitted', "Thanks — we'll review it.")}
        />

        <ScrollView
          ref={scrollRef}
          style={s.messages}
          contentContainerStyle={s.messagesContent}
          onContentSizeChange={handleContentSizeChange}
          onScroll={e => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
          onLayout={e => { viewportHeightRef.current = e.nativeEvent.layout.height; }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {!loadingMsgs && hasMore && (
            <TouchableOpacity onPress={loadMore} disabled={loadingMore} style={s.loadMoreBtn} activeOpacity={0.7}>
              <Text style={s.loadMoreText}>{loadingMore ? 'Loading…' : 'Load earlier messages'}</Text>
            </TouchableOpacity>
          )}
          {loadingMsgs ? (
            <Text style={s.emptyText}>Loading…</Text>
          ) : messages.length === 0 ? (
            <Text style={s.emptyText}>Say hi to {displayName} 👋</Text>
          ) : messages.map(msg => (
            <View key={msg.id} style={[s.msgRow, msg.mine && s.msgRowMine]}>
              {!msg.mine && (
                <View style={s.msgAvatar}>
                  {photo
                    ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%', borderRadius: 14 }} resizeMode="cover" />
                    : <Text style={s.msgAvatarText}>{(displayName[0] ?? '?').toUpperCase()}</Text>
                  }
                </View>
              )}
              <View style={{ maxWidth: '72%' }}>
                <View style={[s.bubble, msg.mine ? s.bubbleMine : s.bubbleThem]}>
                  <Text style={[s.bubbleText, msg.mine && s.bubbleTextMine]}>{msg.content}</Text>
                </View>
                <View style={[s.msgMeta, msg.mine && { justifyContent: 'flex-end' }]}>
                  <Text style={s.msgTime}>{msg.time}</Text>
                  {msg.mine && (
                    <Ionicons
                      name={msg.read ? 'checkmark-done' : 'checkmark'}
                      size={14}
                      color={msg.read ? colors.blue : '#9AA0B2'}
                    />
                  )}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={[s.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={handleTextChange}
            placeholder="Message..."
            placeholderTextColor="#9AA0B2"
            multiline
            returnKeyType="default"
          />
          <Animated.View style={{ transform: [{ scale: sendScale }] }}>
            <TouchableOpacity
              style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]}
              onPress={send}
              disabled={!text.trim()}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={16} color={text.trim() ? '#fff' : '#9AA0B2'} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F3F7' },

  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  headerAvatarInitial: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.slate },
  headerName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.ink },
  headerStatus: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#22C55E' },
  headerStatusOffline: { color: '#9AA0B2' },
  headerStatusTyping: { color: colors.blue, fontFamily: 'HankenGrotesk_600SemiBold' },
  moreBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  menuBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingRight: 16,
  },
  menuBox: {
    backgroundColor: '#fff', borderRadius: 14, minWidth: 160,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 4 },
    elevation: 8, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  menuItemText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink },
  menuDivider: { height: 1, backgroundColor: '#F0F1F5' },

  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12, paddingBottom: 8 },
  emptyText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', marginTop: 40 },
  loadMoreBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 4 },
  loadMoreText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.blue },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMine: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 16 },
  msgAvatarText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11, color: colors.slate },

  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: colors.blue, borderBottomRightRadius: 4 },
  bubbleText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink, lineHeight: 21 },
  bubbleTextMine: { color: '#fff' },
  msgMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, paddingHorizontal: 4 },
  msgTime: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 10, color: '#9AA0B2' },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F1F5' },
  input: { flex: 1, backgroundColor: colors.canvas, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sendBtnDisabled: { backgroundColor: colors.canvas },
});
