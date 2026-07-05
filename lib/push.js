import { Platform } from 'react-native';
import { supabase } from './supabase';

// applicationServerKey must be a Uint8Array, but env vars only give us a
// base64url string — this is the standard conversion for it.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function supported() {
  return Platform.OS === 'web' && typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function registerServiceWorker() {
  if (!supported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (e) {
    console.warn('Service worker registration failed:', e?.message ?? e);
    return null;
  }
}

// Requests notification permission and creates a browser push subscription,
// then upserts it so the send-push edge function can find it later. Callers
// should treat this as best-effort — a denied permission or missing browser
// support is not an error worth blocking the UI over.
export async function subscribeToPush(uid) {
  if (!uid || !supported()) return { error: null };

  const vapidKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return { error: new Error('Missing EXPO_PUBLIC_VAPID_PUBLIC_KEY') };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { error: null };

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    const json = subscription.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: uid,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    }, { onConflict: 'endpoint' });

    return { error: error ?? null };
  } catch (e) {
    return { error: e };
  }
}

export async function unsubscribeFromPush() {
  if (!supported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  } catch (e) {
    console.warn('unsubscribeFromPush failed:', e?.message ?? e);
  }
}
