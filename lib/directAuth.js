import { supabase } from './supabase';

export async function enterWithoutAuth(router) {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) return { error };

  const uid = data?.user?.id;
  if (!uid) {
    return { error: new Error('Could not start an anonymous session.') };
  }

  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert({ id: uid }, { onConflict: 'id', ignoreDuplicates: true });
  if (upsertError) return { error: upsertError };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('id', uid)
    .single();
  if (profileError) return { error: profileError };

  router.replace(profile?.onboarding_done ? '/(tabs)/feed' : '/(onboarding)/name');
  return { error: null };
}
