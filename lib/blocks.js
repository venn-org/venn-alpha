import { supabase } from './supabase';

// Ids of everyone the current user has blocked, plus everyone who has
// blocked the current user — for filtering both directions out of feeds.
// Relies on the get_blocked_pair_ids() RPC (see SUPABASE_SQL.md) since RLS
// only lets a user read blocks where they are the blocker.
export async function getBlockedIds(uid) {
  if (!uid) return new Set();
  try {
    const { data, error } = await supabase.rpc('get_blocked_pair_ids');
    if (error) throw error;
    return new Set((data ?? []).map(r => r.user_id));
  } catch (_) {
    return new Set();
  }
}

export function blockUser(uid, targetId) {
  if (!uid || !targetId) return Promise.resolve({ error: new Error('Missing user') });
  return supabase.from('blocks').insert({ blocker_id: uid, blocked_id: targetId });
}

export function unblockUser(uid, targetId) {
  if (!uid || !targetId) return Promise.resolve({ error: new Error('Missing user') });
  return supabase.from('blocks').delete().eq('blocker_id', uid).eq('blocked_id', targetId);
}

// Profiles the current user has explicitly blocked (for the Block List screen).
export async function getBlockedProfiles(uid) {
  if (!uid) return [];
  const { data: blockRows } = await supabase
    .from('blocks')
    .select('blocked_id, created_at')
    .eq('blocker_id', uid)
    .order('created_at', { ascending: false });
  if (!blockRows || blockRows.length === 0) return [];

  const ids = blockRows.map(r => r.blocked_id);
  const { data: profileRows } = await supabase
    .from('profiles').select('id, name, photos').in('id', ids);
  const profileMap = {};
  profileRows?.forEach(p => { profileMap[p.id] = p; });

  return blockRows.map(r => ({
    id: r.blocked_id,
    name: profileMap[r.blocked_id]?.name ?? 'Unknown',
    photo: Array.isArray(profileMap[r.blocked_id]?.photos) ? profileMap[r.blocked_id].photos[0] ?? null : null,
  }));
}
