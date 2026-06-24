export async function POST(request) {
  try {
    const { messages } = await request.json();

    const apiKey = process.env.DEEPSEEK_API_KEY;

    // Better debug message (helps confirm Vercel issue clearly)
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing DEEPSEEK_API_KEY in Vercel environment variables",
          hint: "Add it in Vercel → Settings → Environment Variables → Redeploy",
        }),
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat", // safer default than deepseek-v4-flash (often causes issues)
          messages: [
            {
              role: "system",
              content:
                "You are a warm, encouraging Bible study assistant. Answer questions about scripture, explain biblical concepts, and provide spiritual guidance. Always cite book, chapter, and verse. Keep responses clear and helpful.",
            },
            ...messages,
          ],
          temperature: 0.7,
          max_tokens: 800,
          stream: false,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: data.error?.message || "DeepSeek API request failed",
        }),
        { status: response.status }
      );
    }

    return new Response(
      JSON.stringify({
        reply: data.choices?.[0]?.message?.content || "",
      }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || "Server error",
      }),
      { status: 500 }
    );
  }
}