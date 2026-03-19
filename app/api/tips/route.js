import Anthropic from '@anthropic-ai/sdk';

export async function POST(request) {
  try {
    const { text, analysis } = await request.json();

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

    const systemPrompt = `You are an expert writing coach analyzing patterns in student writing.

Based on the provided text and analysis of AI-sounding content, generate 3-5 specific, actionable writing improvement tips.

Tips should be:
- SPECIFIC and PERSONAL to the patterns found in THIS text (not generic)
- Reference actual details (e.g., "You use 'Furthermore' 4 times" rather than "Use varied transitions")
- Actionable and easy to implement
- Encouraging but honest
- Focused on natural, authentic academic voice

Return ONLY a JSON response (no other text):
{
  "tips": [
    "Specific tip referencing actual patterns in the text",
    "Another specific improvement suggestion",
    ...
  ]
}`;

    const userPrompt = `Here is the student's text:

"${text}"

Focus on patterns that would help them write in a more natural, authentic voice and less like AI. Provide specific, actionable feedback.`;

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
    if (!Array.isArray(result.tips) || result.tips.length === 0) {
      throw new Error('Invalid response structure');
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in tips API:', error);

    let errorMessage = 'Failed to generate tips';
    if (error instanceof SyntaxError) {
      errorMessage = 'Failed to parse tips';
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
