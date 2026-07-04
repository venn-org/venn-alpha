import { supabase } from './supabase';

// Ids of users who paused their profile — hidden from feed/standouts, but
// their existing matches and chats stay intact. Fails open (empty set) so
// discovery keeps working before the `paused` column exists
// (see SUPABASE_SQL.md #17) or on a transient error.
export async function getPausedIds() {
  try {
    const { data, error } = await supabase.from('profiles').select('id').eq('paused', true);
    if (error) throw error;
    return new Set((data ?? []).map(r => r.id));
  } catch (e) {
    console.warn('getPausedIds failed:', e?.message ?? e);
    return new Set();
  }
}
