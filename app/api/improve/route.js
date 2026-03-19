import Anthropic from '@anthropic-ai/sdk';

export async function POST(request) {
  try {
    const { sentence, level } = await request.json();

    if (!sentence || !sentence.trim()) {
      return new Response(
        JSON.stringify({ error: 'No sentence provided' }),
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

    const systemPrompt = `You are an expert writing coach helping students improve their academic writing. 
A sentence has been flagged as potentially AI-generated or sounding unnatural.

Your task:
1. Explain in ONE short sentence why this sentence sounds AI-generated or unnatural (e.g., "Too formal", "Generic transition", "Overly structured")
2. Provide exactly 3 alternative rewrite suggestions that:
   - Sound more natural and student-like
   - Maintain the same core meaning
   - Vary in tone and structure
   - Are appropriate for academic writing but with human voice

Return ONLY a JSON response (no other text):
{
  "reason": "Why this sounds AI-generated",
  "suggestions": [
    "First alternative rewrite",
    "Second alternative rewrite", 
    "Third alternative rewrite"
  ]
}`;

    const userPrompt = `Sentence to improve: "${sentence}"`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Could not parse response as JSON');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate response structure
    if (
      typeof result.reason !== 'string' ||
      !Array.isArray(result.suggestions) ||
      result.suggestions.length !== 3
    ) {
      throw new Error('Invalid response structure');
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in improve API:', error);

    let errorMessage = 'Failed to generate suggestions';
    if (error instanceof SyntaxError) {
      errorMessage = 'Failed to parse suggestions';
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
