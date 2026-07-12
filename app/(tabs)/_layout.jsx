import { useEffect, useState, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../lib/auth';

function TabIcon({ name, size, color, count }) {
  return (
    <View>
      <Ionicons name={name} size={size} color={color} />
      {count > 0 && (
        <View style={dotStyles.badge}>
          <Text style={dotStyles.badgeText}>{count > 4 ? '4+' : count}</Text>
        </View>
      )}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#FF4D6A', borderWidth: 1.5, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: 'HankenGrotesk_700Bold', fontSize: 9, color: '#fff',
  }
});

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [unreadLikes, setUnreadLikes] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const uidRef = useRef(null);

  useEffect(() => {
    let channel;
    let cancelled = false;

    async function refresh() {
      const uid = uidRef.current;
      if (!uid) return;
      const { data } = await supabase
        .from('notifications')
        .select('type')
        .eq('user_id', uid)
        .eq('read', false);
      const rows = data ?? [];
      setUnreadLikes(rows.filter(r => r.type === 'like').length);
      setUnreadMessages(rows.filter(r => r.type === 'match' || r.type === 'message').length);
    }

    async function init() {
      const uid = getCurrentUserId();
      if (!uid || cancelled) return;
      uidRef.current = uid;
      await refresh();
      if (cancelled) return;

      channel = supabase
        .channel(`tab-notifs-${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, refresh)
        .subscribe();
    }
    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'none',
        sceneStyle: { backgroundColor: '#FCFCFD' },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E6E8EE',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 56 + insets.bottom : 60,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 6,
          paddingTop: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: '#9AA0B2',
        tabBarLabelStyle: {
          fontFamily: 'HankenGrotesk_600SemiBold',
          fontSize: 10,
          marginTop: 2,
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="standouts"
        options={{
          title: 'Standouts',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'star' : 'star-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: 'Likes',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'heart' : 'heart-outline'}
              size={22}
              color={color}
              count={unreadLikes}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'chatbubble' : 'chatbubble-outline'}
              size={22}
              color={color}
              count={unreadMessages}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
