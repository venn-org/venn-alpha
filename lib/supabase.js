import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { auth } from './firebase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (url, options = {}) => {
      const user = auth.currentUser;
      const urlStr = typeof url === 'string' ? url : (url && url.url) ? url.url : '';
      const isSupabase = urlStr.startsWith(supabaseUrl);

      if (user && isSupabase) {
        try {
          const token = await user.getIdToken();
          const headersObj = {};

          if (options.headers) {
            if (typeof Headers !== 'undefined' && options.headers instanceof Headers) {
              options.headers.forEach((value, key) => {
                headersObj[key.toLowerCase()] = value;
              });
            } else if (Array.isArray(options.headers)) {
              options.headers.forEach(([key, value]) => {
                headersObj[key.toLowerCase()] = value;
              });
            } else {
              for (const key of Object.keys(options.headers)) {
                headersObj[key.toLowerCase()] = options.headers[key];
              }
            }
          }

          headersObj['authorization'] = `Bearer ${token}`;
          headersObj['apikey'] = supabaseAnonKey;
          options.headers = headersObj;
        } catch (e) {
          console.warn('Failed to inject Firebase auth token:', e);
        }
      }
      return fetch(url, options);
    },
  },
});
