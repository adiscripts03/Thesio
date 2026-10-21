import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
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
    return fetch(input, { ...init, headers });
  };
}

export async function getAuthenticatedContextFromRequest(request: Request) {
  const SUPABASE_URL =
    process.env['SUPABASE_URL'] ||
    process.env['VITE_SUPABASE_URL'] ||
    'https://xkmesycxmnysrzovfjiy.supabase.co';

  const SUPABASE_PUBLISHABLE_KEY =
    process.env['SUPABASE_PUBLISHABLE_KEY'] ||
    process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrbWVzeWN4bW55c3J6b3Zmaml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NDUxNjUsImV4cCI6MjEwNzIyMTE2NX0.v7-v9JgK1qHUEBi4kYfyFPCYrkoamnGqzIWPh1k_yno';

  const authHeader = request.headers.get('authorization');
  let token = authHeader?.replace('Bearer ', '')?.trim();

  const supabase = createClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
        headers: token && token.split('.').length === 3 ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    }
  );

  let userId = "00000000-0000-0000-0000-000000000000";
  if (token && token.split('.').length === 3) {
    try {
      const { data } = await supabase.auth.getUser(token);
      if (data?.user?.id) {
        userId = data.user.id;
      }
    } catch {
    }
  }

  return { supabase, userId };
}

export async function getAuthenticatedContext(req?: any) {
  const SUPABASE_URL =
    process.env['SUPABASE_URL'] ||
    process.env['VITE_SUPABASE_URL'] ||
    'https://xkmesycxmnysrzovfjiy.supabase.co';

  const SUPABASE_PUBLISHABLE_KEY =
    process.env['SUPABASE_PUBLISHABLE_KEY'] ||
    process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrbWVzeWN4bW55c3J6b3Zmaml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NDUxNjUsImV4cCI6MjEwNzIyMTE2NX0.v7-v9JgK1qHUEBi4kYfyFPCYrkoamnGqzIWPh1k_yno';

  if (req?.headers) {
    const authHeader = typeof req.headers.get === 'function'
      ? req.headers.get('authorization')
      : (req.headers.authorization || req.headers['authorization']);
    let token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '').trim() : '';

    const supabase = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
          headers: token && token.split('.').length === 3 ? { Authorization: `Bearer ${token}` } : {},
        },
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      }
    );

    let userId = "00000000-0000-0000-0000-000000000000";
    if (token && token.split('.').length === 3) {
      try {
        const { data } = await supabase.auth.getUser(token);
        if (data?.user?.id) {
          userId = data.user.id;
        }
      } catch {
      }
    }
    return { supabase, userId };
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return { supabase, userId: "00000000-0000-0000-0000-000000000000" };
}
