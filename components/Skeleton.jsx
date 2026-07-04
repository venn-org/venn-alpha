import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const W = Dimensions.get('window').width;

// Pulsing grey block — the building brick for per-screen loading skeletons.
function Pulse({ style }) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={[sk.block, style, { opacity }]} />;
}

// Mirrors the feed ProfileCard: header, hero photo, info card.
export function FeedSkeleton() {
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 12 }}>
        <View style={{ gap: 8 }}>
          <Pulse style={{ width: 140, height: 22 }} />
          <Pulse style={{ width: 90, height: 12 }} />
        </View>
        <Pulse style={{ width: 80, height: 36, borderRadius: 18 }} />
      </View>
      <Pulse style={{ width: '100%', height: 360, borderRadius: 20, marginBottom: 10 }} />
      <Pulse style={{ width: '100%', height: 64, borderRadius: 20 }} />
    </View>
  );
}

// Mirrors the Likes You two-column card grid.
export function LikesSkeleton() {
  const cardW = (W - 48) / 2;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 }}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={{ width: cardW }}>
          <Pulse style={{ width: '100%', height: cardW * 1.25, borderRadius: 18, marginBottom: 8 }} />
          <Pulse style={{ width: '60%', height: 14, marginBottom: 6 }} />
          <Pulse style={{ width: '40%', height: 10 }} />
        </View>
      ))}
    </View>
  );
}

// Mirrors the Messages chat rows (avatar + name + preview line).
export function MessagesSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 16 }}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pulse style={{ width: 52, height: 52, borderRadius: 26 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <Pulse style={{ width: '45%', height: 14 }} />
            <Pulse style={{ width: '75%', height: 11 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Mirrors chat bubbles, alternating sides.
export function ChatSkeleton() {
  const rows = [
    { mine: false, w: '55%' },
    { mine: true, w: '40%' },
    { mine: false, w: '65%' },
    { mine: false, w: '30%' },
    { mine: true, w: '50%' },
  ];
  return (
    <View style={{ gap: 12, paddingTop: 8 }}>
      {rows.map((r, i) => (
        <Pulse
          key={i}
          style={{ width: r.w, height: 40, borderRadius: 18, alignSelf: r.mine ? 'flex-end' : 'flex-start' }}
        />
      ))}
    </View>
  );
}

// Mirrors notification rows (icon circle + two text lines).
export function NotifsSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 18 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pulse style={{ width: 44, height: 44, borderRadius: 22 }} />
          <View style={{ flex: 1, gap: 7 }}>
            <Pulse style={{ width: '85%', height: 13 }} />
            <Pulse style={{ width: '30%', height: 10 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const sk = StyleSheet.create({
  block: { backgroundColor: '#E4E6EC', borderRadius: 8 },
});
