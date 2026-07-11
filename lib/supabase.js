import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { auth } from './firebase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // Third-party auth: Supabase verifies the Firebase JWT on every request.
  // This replaces Supabase's own auth module entirely — supabase.auth.* methods
  // are disabled when accessToken is provided.
  accessToken: async () => {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(/* forceRefresh */ false);
  },
});
