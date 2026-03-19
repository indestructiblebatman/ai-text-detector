import Anthropic from '@anthropic-ai/sdk';

export async function POST(request) {
  try {
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return new Response(
        JSON.stringify({ error: 'No text provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const client = new Anthropic();

    const systemPrompt = `You are an expert AI text detector. Analyze the provided text for signs of AI generation.

Identify phrases and sentences that show signs of AI generation:
- "high": Very likely AI-generated
- "medium": Possibly AI-generated
- "low": Probably human-written
- "human": Clearly human-written

Return a JSON response with:
1. overall_score: Integer 0-100 representing overall likelihood of AI generation
2. verdict: 2-3 sentence summary
3. highlighted_text: The original text with ONLY suspicious phrases wrapped in tags like [HIGH]phrase[/HIGH], [MEDIUM]phrase[/MEDIUM], [LOW]phrase[/LOW]. Leave human text unwrapped.

Focus on highlighting specific AI-characteristic phrases, not entire sentences. Look for:
- Overly formal or generic transitions ("Furthermore", "In conclusion")
- Repetitive patterns and structures
- Unnatural word combinations
- Clichéd expressions
- Perfect prose without personality

Only highlight suspicious sections. Keep most text unmarked if it appears human-written.`;

    const userPrompt = `Analyze this text for AI generation likelihood:\n\n${text}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract the text content from the response
    const responseText = message.content[0].text;

    // Parse the JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse response as JSON');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate the response structure
    if (
      typeof result.overall_score !== 'number' ||
      typeof result.verdict !== 'string' ||
      typeof result.highlighted_text !== 'string'
    ) {
      throw new Error('Invalid response structure');
    }

    // Ensure overall_score is 0-100
    result.overall_score = Math.max(0, Math.min(100, result.overall_score));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in detect API:', error);

    let errorMessage = 'An error occurred while analyzing the text';
    if (error instanceof SyntaxError) {
      errorMessage = 'Failed to parse API response';
    } else if (error.message?.includes('API')) {
      errorMessage = 'API error: ' + error.message;
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
