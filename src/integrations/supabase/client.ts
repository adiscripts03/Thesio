import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);

    const inputUrl = typeof input === 'string' ? input : (input as Request).url;

    if (inputUrl.includes('/rest/v1/')) {
      try {
        const remoteRes = await fetch(input, { ...init, headers });
        if (remoteRes.ok) {
          if (init?.method && init.method !== 'GET') {
            return remoteRes;
          }
          const clone = remoteRes.clone();
          const json = await clone.json().catch(() => null);
          if (Array.isArray(json) && json.length > 0) {
            return remoteRes;
          }
          if (json && !Array.isArray(json) && typeof json === 'object') {
            return remoteRes;
          }
        }
      } catch {
      }

      const pathAndQuery = inputUrl.replace(/^https?:\/\/[^\/]+/, '');
      return fetch(pathAndQuery, { ...init, headers });
    }

    return fetch(input, { ...init, headers });
  };
}


function createSupabaseClient() {
  const SUPABASE_URL =
    (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env['VITE_SUPABASE_URL'] : undefined) ||
    process.env['VITE_SUPABASE_URL'] ||
    process.env['SUPABASE_URL'] ||
    'https://xkmesycxmnysrzovfjiy.supabase.co';

  const SUPABASE_PUBLISHABLE_KEY =
    (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] : undefined) ||
    process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
    process.env['SUPABASE_PUBLISHABLE_KEY'] ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrbWVzeWN4bW55c3J6b3Zmaml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NDUxNjUsImV4cCI6MjEwNzIyMTE2NX0.v7-v9JgK1qHUEBi4kYfyFPCYrkoamnGqzIWPh1k_yno';

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});

