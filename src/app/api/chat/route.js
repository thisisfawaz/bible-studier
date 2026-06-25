export async function POST(request) {
  try {
    const { messages } = await request.json();

    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'DeepSeek API key not configured' }),
        { status: 500 }
      );
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          {
            role: 'system',
            content: `You are a warm, encouraging Bible study assistant. Format your responses for maximum readability:

**IMPORTANT FORMATTING RULES:**
1. Use TWO newlines (press Enter twice) between each paragraph to create clear spacing
2. Keep paragraphs short (2-3 sentences each)
3. Use bullet points with a dash (-) for lists, one per line
4. Use **bold** for key terms or scripture references
5. Keep responses under 300 words
6. End with an encouraging thought

Example format (note the double newlines between sections):

"Here's a brief answer to your question.

**Key point:** Scripture says this about it.

- First important point
- Second important point
- Third important point

Remember: This is the encouraging takeaway."

Always use double newlines between paragraphs for proper spacing.`
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 800,
        stream: false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data.error?.message || 'Something went wrong' }),
        { status: response.status }
      );
    }

    return new Response(
      JSON.stringify({ 
        reply: data.choices[0].message.content 
      }),
      { status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}