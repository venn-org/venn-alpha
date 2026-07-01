import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

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
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="home-outline"
              size={22}
              color={focused ? colors.blue : '#14161B'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="standouts"
        options={{
          title: 'Standouts',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="star-outline"
              size={22}
              color={focused ? colors.blue : '#14161B'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: 'Likes',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={22}
              color={focused ? colors.blue : '#14161B'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'chatbubble' : 'chatbubble-outline'}
              size={22}
              color={focused ? colors.blue : '#14161B'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="person-outline"
              size={22}
              color={focused ? colors.blue : '#14161B'}
            />
          ),
        }}
      />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
