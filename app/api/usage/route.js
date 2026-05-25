import { getSupabaseAdmin, getUserFromRequest } from '@/app/lib/supabaseServer';

const DAILY_LIMIT = 500;

export async function GET(request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
      console.error('Missing Supabase environment variables for usage endpoint');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const user = await getUserFromRequest(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const date = new Date().toISOString().slice(0, 10);
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('daily_usage')
      .select('words_used')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle();

    if (error) {
      console.error('Supabase usage read error:', error);
      const message = process.env.NODE_ENV === 'development' ? error.message || 'Failed to read usage data' : 'Failed to read usage data';
      return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const usedToday = data?.words_used ?? 0;
    const remainingWords = Math.max(0, DAILY_LIMIT - usedToday);

    return new Response(JSON.stringify({ remainingWords }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Usage API error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
