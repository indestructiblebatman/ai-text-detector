import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseAdmin, getUserFromRequest } from '@/app/lib/supabaseServer';

const DAILY_LIMIT = 500;

export async function POST(request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
      console.error('Missing Supabase environment variables for detect endpoint');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const user = await getUserFromRequest(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { text } = await request.json();
    if (!text || !text.trim()) {
      return new Response(JSON.stringify({ error: 'No text provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const textWordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const date = new Date().toISOString().slice(0, 10);

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
      console.error('Missing Supabase environment variables for detect endpoint');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: usageData, error: usageError } = await supabaseAdmin
      .from('daily_usage')
      .select('words_used')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle();

    if (usageError) {
      console.error('Supabase usage read error:', usageError);
      const message = process.env.NODE_ENV === 'development' ? usageError.message || 'Failed to read usage data' : 'Failed to read usage data';
      return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const usedToday = usageData?.words_used ?? 0;
    if (usedToday + textWordCount > DAILY_LIMIT) {
      return new Response(
        JSON.stringify({
          error: `You've reached your daily ${DAILY_LIMIT} words limit. Come back tomorrow for more.`,
          remainingWords: Math.max(0, DAILY_LIMIT - usedToday),
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const client = new Anthropic({ apiKey });
    const systemPrompt = `You are an expert AI text detector. Analyze the provided text for signs of AI generation.\n\nReturn ONLY a raw JSON object with no markdown formatting, no code blocks, no backticks, no preamble. Just the JSON.\n\nThe JSON must have exactly these three fields:\n1. "overall_score": integer 0-100 representing overall AI likelihood\n2. "verdict": string, 2-3 sentences summarizing your findings  \n3. "highlighted_text": string, the original text with suspicious phrases wrapped in tags\n\nFor highlighted_text, wrap phrases using these tags only:\n- [HIGH]phrase[/HIGH] for very likely AI-generated\n- [MEDIUM]phrase[/MEDIUM] for possibly AI-generated  \n- [LOW]phrase[/LOW] for slightly AI-like\n- Leave human-written text unwrapped\n\nLook for: overly formal transitions (Furthermore, Moreover, In conclusion), corporate buzzwords, generic phrasing, perfect uniform structure, hollow filler phrases.\n\nExample output format:\n{\"overall_score\": 72, \"verdict\": \"This text shows strong AI patterns...\", \"highlighted_text\": \"Some normal text. [HIGH]Furthermore, it is important to note that[/HIGH] more text here.\"}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Analyze this text:\n\n${text}` }],
    });

    const responseText = message.content[0].text;
    const cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    let result;
    try {
      result = JSON.parse(cleaned);
      if (typeof result === 'string') {
        result = JSON.parse(result);
      }
    } catch (firstError) {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Raw response:', responseText);
        throw new Error('Could not parse response as JSON');
      }
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch (secondError) {
        console.error('Failed JSON.parse on extracted object:', jsonMatch[0]);
        throw new Error('Could not parse response as JSON');
      }
    }

    if (
      typeof result.overall_score !== 'number' ||
      typeof result.verdict !== 'string' ||
      typeof result.highlighted_text !== 'string'
    ) {
      throw new Error('Invalid response structure');
    }

    result.overall_score = Math.max(0, Math.min(100, result.overall_score));

    const supabaseAdminForUpsert = getSupabaseAdmin();
    const { error: updateError } = await supabaseAdminForUpsert.from('daily_usage').upsert(
      {
        user_id: user.id,
        date,
        words_used: usedToday + textWordCount,
      },
      { onConflict: ['user_id', 'date'] }
    );

    if (updateError) {
      console.error('Supabase usage upsert error:', updateError);
    }

    const remaining = Math.max(0, DAILY_LIMIT - (usedToday + textWordCount));
    return new Response(JSON.stringify({ ...result, remainingWords: remaining }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in detect API:', error);
    const errorMessage = error?.message || String(error) || 'An error occurred while analyzing the text';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
