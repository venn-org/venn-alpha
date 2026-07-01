import { supabase } from './supabase';
import { getBlockedIds } from './blocks';

export async function getNotifications(uid) {
  if (!uid) return [];
  const [{ data, error }, blockedIds] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, type, content, read, created_at, actor_id, match_id, profiles!actor_id(name, photos)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50),
    getBlockedIds(uid),
  ]);
  if (error || !data) return [];
  return data
    .filter(n => !n.actor_id || !blockedIds.has(n.actor_id))
    .map(n => ({
      id: n.id,
      type: n.type,
      read: n.read,
      createdAt: n.created_at,
      matchId: n.match_id,
      actorName: n.profiles?.name ?? 'Someone',
      actorPhoto: Array.isArray(n.profiles?.photos) ? n.profiles.photos[0] ?? null : null,
      content: n.content,
    }));
}

export async function markRead(uid, id) {
  if (!uid || !id) return;
  await supabase.from('notifications').update({ read: true }).eq('user_id', uid).eq('id', id);
}

export async function markAllRead(uid) {
  if (!uid) return;
  await supabase.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false);
}

export async function getUnreadCount(uid) {
  if (!uid) return 0;
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)
    .eq('read', false);
  return count ?? 0;
}
