// src/app/api/admin/generate/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const CATEGORIES = [
  'Healing', 'Miracle', 'Wealth', 'Trust', 'Faith',
  'Hope', 'Love', 'Forgiveness', 'Grace', 'Courage',
  'Peace', 'Joy', 'Patience', 'Kindness', 'Wisdom',
  'Strength', 'Deliverance', 'Provision', 'Protection', 'Guidance'
];

function extractDevotionFromContent(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        let cleaned = jsonMatch[0];
        cleaned = cleaned.replace(/"title":\s*"([^"]*)",\s*"title":/g, '"title":');
        cleaned = cleaned.replace(/"scripture":\s*"([^"]*)",\s*"scripture":/g, '"scripture":');
        cleaned = cleaned.replace(/"story":\s*"([^"]*)",\s*"story":/g, '"story":');
        cleaned = cleaned.replace(/"prayer":\s*"([^"]*)",\s*"prayer":/g, '"prayer":');
        cleaned = cleaned.replace(/"category":\s*"([^"]*)",\s*"category":/g, '"category":');
        cleaned = cleaned.replace(/,(\s*})/g, '$1');
        try {
          return JSON.parse(cleaned);
        } catch (e2) {
          return null;
        }
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function POST() {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'DeepSeek API key not configured' },
        { status: 500 }
      );
    }

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
            content: `You are a devotional writer. Create inspiring devotionals based on REAL faith stories from the Bible or modern history. 
            
            IMPORTANT FORMATTING: Always break the story into 3-4 short paragraphs. Use double line breaks (\n\n) between paragraphs. The story should be easy to read with clear paragraph breaks.
            
            Return ONLY valid JSON.`
          },
          {
            role: 'user',
            content: `Create a daily devotional for ${dateStr} on the theme of **${category}**.

The devotional must be about ONE SPECIFIC REAL PERSON (biblical or modern) who has an inspiring faith story.

IMPORTANT RULES:
1. The person can be from the BIBLE (Peter, Paul, Moses, David, Esther, etc.) OR from modern history
2. Include a scripture verse with the FULL TEXT
3. The story MUST be between 200-250 words
4. Include a prayer
5. **IMPORTANT: Format the story with proper paragraph breaks. Use TWO new lines (\n\n) between each paragraph. The story should have 3-4 short paragraphs, not one giant block of text.**

Format the response as a JSON object with these fields:
{
  "title": "...",
  "scripture": "...",
  "story": "...",  // Use \n\n between paragraphs
  "prayer": "...",
  "category": "${category}",
  "person": "Full name of the person"
}`
          }
        ],
        temperature: 0.8,
        max_tokens: 800,
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
    let devotion = extractDevotionFromContent(content);

    if (!devotion) {
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Save the generated devotion to Supabase as 'scheduled'
    const newDevotion = {
      id: `dev_${Date.now()}`,
      title: devotion.title || 'New Devotion',
      scripture: devotion.scripture || '',
      story: devotion.story || '',
      prayer: devotion.prayer || '',
      category: devotion.category || category,
      person: devotion.person || '',
      status: 'scheduled',
      created_at: new Date().toISOString()
    };

    const { data: savedDevotion, error: saveError } = await supabase
      .from('devotions')
      .insert(newDevotion)
      .select();

    if (saveError) {
      console.error('Error saving devotion:', saveError);
      // Still return the devotion even if save fails
      return NextResponse.json({
        success: true,
        devotion: {
          ...newDevotion,
          date: dateStr
        },
        warning: 'Generated but not saved to database'
      });
    }

    return NextResponse.json({
      success: true,
      devotion: {
        ...(savedDevotion?.[0] || newDevotion),
        date: dateStr
      }
    });

  } catch (error) {
    console.error('Generate Devotion Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}