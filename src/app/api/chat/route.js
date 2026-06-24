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

1. Use short paragraphs (2-3 sentences each) with a blank line between each paragraph
2. Use bullet points with a dash (-) for lists, one per line
3. Use **bold** for key terms or scripture references
4. Keep responses under 300 words
5. End with an encouraging thought

Example format:
"Here's a brief answer to your question.

**Key point:** Scripture says this about it.

- First important point
- Second important point
- Third important point

Remember: This is the encouraging takeaway."`
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