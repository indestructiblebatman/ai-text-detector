import { createClient } from '@supabase/supabase-js';

let _supabaseAdminInstance;
function normalizeSupabaseUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    /\/rest\/v1\/?$/.test(parsed.pathname) && (parsed.pathname = parsed.pathname.replace(/\/rest\/v1\/?$/, ''));
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

function getSupabaseAdmin() {
  if (!_supabaseAdminInstance) {
    const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!rawUrl || !key) {
      throw new Error('Missing Supabase server environment variables');
    }
    const url = normalizeSupabaseUrl(rawUrl);
    _supabaseAdminInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return _supabaseAdminInstance;
}

export async function getUserFromRequest(request) {
  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing Supabase server URL environment variable');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase service role key');
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!token) {
    return null;
  }

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }

  return data.user;
}

export { getSupabaseAdmin };
