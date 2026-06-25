import { NextResponse } from 'next/server';

const CATEGORIES = [
  'Healing', 'Miracle', 'Wealth', 'Trust', 'Faith', 
  'Hope', 'Love', 'Forgiveness', 'Grace', 'Courage',
  'Peace', 'Joy', 'Patience', 'Kindness', 'Wisdom',
  'Strength', 'Deliverance', 'Provision', 'Protection', 'Guidance'
];

export async function POST() {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'DeepSeek API key not configured' },
        { status: 500 }
      );
    }

    // Pick a random category
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

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
            content: `You are a devotional writer. Create inspiring daily devotionals based on real faith stories or biblical principles.`
          },
          {
            role: 'user',
            content: `Create a daily devotional for ${dateStr} on the theme of **${category}**.

The devotional should have:
1. A title
2. A scripture verse (with book, chapter, and verse)
3. A 300-word real faith story or biblical reflection about ${category}
4. A prayer

Format the response as a JSON object with these fields:
{
  "title": "...",
  "scripture": "...",
  "story": "...",
  "prayer": "...",
  "category": "${category}"
}

Make the story inspiring and faith-based. Use a real historical or modern faith story if possible, or a powerful biblical reflection. Keep it around 300 words.`
          }
        ],
        temperature: 0.8,
        max_tokens: 1000,
        stream: false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error?.message || 'Failed to generate devotion' },
        { status: response.status }
      );
    }

    const content = data.choices[0].message.content;
    let devotion;

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        devotion = JSON.parse(jsonMatch[0]);
      } else {
        devotion = JSON.parse(content);
      }
    } catch (parseError) {
      const lines = content.split('\n').filter(line => line.trim());
      devotion = {
        title: lines.find(l => l.toLowerCase().includes('title'))?.replace(/^.*?title[:\s]*/i, '').trim() || `${category} Devotion`,
        scripture: lines.find(l => l.toLowerCase().includes('scripture') || l.toLowerCase().includes('verse'))?.replace(/^.*?(?:scripture|verse)[:\s]*/i, '').trim() || '"Trust in the Lord." — Proverbs 3:5',
        story: lines.filter(l => l.length > 50).join(' ').trim() || `A reflection on ${category}...`,
        prayer: lines.find(l => l.toLowerCase().includes('prayer'))?.replace(/^.*?prayer[:\s]*/i, '').trim() || 'Lord, help us to trust in You. Amen.',
        category: category
      };
    }

    return NextResponse.json({
      success: true,
      devotion: {
        ...devotion,
        date: dateStr
      },
      category: category
    });

  } catch (error) {
    console.error('Generate Devotion Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}