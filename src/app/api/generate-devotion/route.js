import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CATEGORIES = [
  'Healing', 'Miracle', 'Wealth', 'Trust', 'Faith', 
  'Hope', 'Love', 'Forgiveness', 'Grace', 'Courage',
  'Peace', 'Joy', 'Patience', 'Kindness', 'Wisdom',
  'Strength', 'Deliverance', 'Provision', 'Protection', 'Guidance'
];

// Path to the devotions file
const DATA_FILE = path.join(process.cwd(), 'data', 'devotions.json');
const MIN_DEVOTION_GAP = 120; // Number of devotions that must pass before reusing a person

// Helper to read devotions
function getDevotions() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return data.devotions || [];
    }
  } catch (error) {
    console.error('Error reading devotions:', error);
  }
  return [];
}

// Extract the person/subject from a devotion
function extractPerson(devotion) {
  if (!devotion || !devotion.story) return null;
  
  const story = devotion.story;
  
  const patterns = [
    /In\s+([A-Z][a-z]+)\s*,\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /A\s+(man|woman|boy|girl|young\s+(?:man|woman))\s+named\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+from\s+([A-Z][a-z]+)/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+was\s+/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+lost\s+/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+survived\s+/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+became\s+/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+found\s+/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+said\s+/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+recalls\s+/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+was\s+born\s+/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+grew\s+up\s+/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+is\s+/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+has\s+/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+will\s+/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+did\s+/,
  ];
  
  for (const pattern of patterns) {
    const match = story.match(pattern);
    if (match) {
      const name = match[2] || match[1];
      if (name && name.length > 1) {
        return name.trim();
      }
    }
  }
  
  return null;
}

// Robust JSON parsing
function extractDevotionFromContent(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      } catch (e) {
        let cleaned = jsonMatch[0];
        cleaned = cleaned.replace(/"title":\s*"([^"]*)",\s*"title":/g, '"title":');
        cleaned = cleaned.replace(/"scripture":\s*"([^"]*)",\s*"scripture":/g, '"scripture":');
        cleaned = cleaned.replace(/"story":\s*"([^"]*)",\s*"story":/g, '"story":');
        cleaned = cleaned.replace(/"prayer":\s*"([^"]*)",\s*"prayer":/g, '"prayer":');
        cleaned = cleaned.replace(/"category":\s*"([^"]*)",\s*"category":/g, '"category":');
        cleaned = cleaned.replace(/"person":\s*"([^"]*)",\s*"person":/g, '"person":');
        cleaned = cleaned.replace(/,(\s*})/g, '$1');
        cleaned = cleaned.replace(/"story":\s*""/g, '"story": "A reflection on faith."');
        
        try {
          return JSON.parse(cleaned);
        } catch (e2) {
          console.error('Still invalid JSON after cleanup:', e2);
          return null;
        }
      }
    }
    return null;
  } catch (e) {
    console.error('Error extracting devotion:', e);
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

    // Get all devotions
    const allDevotions = getDevotions();
    const totalDevotions = allDevotions.length;
    
    // Get the last MIN_DEVOTION_GAP devotions (or all if less than MIN_DEVOTION_GAP)
    const recentDevotions = allDevotions.slice(-MIN_DEVOTION_GAP);
    
    // Extract used people from recent devotions
    const usedPeopleMap = new Map();
    
    for (let i = 0; i < recentDevotions.length; i++) {
      const devotion = recentDevotions[i];
      const person = extractPerson(devotion) || devotion.person || null;
      if (person) {
        const devotionsAgo = totalDevotions - (allDevotions.indexOf(devotion) + 1);
        usedPeopleMap.set(person, devotionsAgo);
      }
    }
    
    // Build the avoid list
    const avoidPeople = [];
    for (const [person, devotionsAgo] of usedPeopleMap) {
      if (devotionsAgo < MIN_DEVOTION_GAP) {
        avoidPeople.push({
          name: person,
          devotionsAgo: devotionsAgo,
          availableIn: MIN_DEVOTION_GAP - devotionsAgo
        });
      }
    }
    
    avoidPeople.sort((a, b) => a.devotionsAgo - b.devotionsAgo);
    
    // Pick a random category
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Build the avoid-people instruction
    let avoidPeopleInstruction = '';
    if (avoidPeople.length > 0) {
      const instructions = avoidPeople.map(p => 
        `- ${p.name} (used ${p.devotionsAgo} devotions ago, available in ${p.availableIn} devotions)`
      ).join('\n');
      
      avoidPeopleInstruction = `
IMPORTANT - AVOID THESE PEOPLE (they were used recently):
${instructions}

These people were used within the last ${MIN_DEVOTION_GAP} devotions. Choose a DIFFERENT person - someone from a different country, time period, or background.
If ${MIN_DEVOTION_GAP}+ devotions have passed since someone was used, they can be reused with a completely different story.`;
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
            content: `You are a devotional writer. Create inspiring daily devotionals based on REAL faith stories from around the world. Return ONLY valid JSON.`
          },
          {
            role: 'user',
            content: `Create a daily devotional for ${dateStr} on the theme of **${category}**.

The devotional must be about ONE SPECIFIC REAL PERSON (historical, biblical, or modern) who has an inspiring faith story.

${avoidPeopleInstruction}

IMPORTANT RULES:
1. The person can be from the BIBLE (Peter, Paul, Moses, David, Esther, etc.) OR from modern history (missionaries, reformers, modern-day believers)
2. Use a DIFFERENT person from different time periods, countries, and backgrounds
3. The story should be about one specific person's faith journey
4. Include specific details about their life, struggle, and faith
5. If a person was used before, tell a COMPLETELY DIFFERENT story about them (different event, different aspect of their life)
6. **IMPORTANT: The story MUST be between 200-250 words. Do NOT exceed 250 words.**
7. **MUST include a scripture verse with the FULL TEXT of the verse, book, chapter, and verse number. Example: "I can do all things through Christ who strengthens me." — Philippians 4:13**

BIBLICAL FIGURES TO CHOOSE FROM (but you can also use others):
- Old Testament: Moses, Abraham, David, Daniel, Esther, Ruth, Elijah, Hezekiah, Nehemiah
- New Testament: Peter, Paul, James, John, Mary Magdalene, Stephen, Barnabas, Timothy, Lydia

MODERN FIGURES TO CHOOSE FROM:
- Missionaries: William Carey, Hudson Taylor, Amy Carmichael, David Livingstone
- Reformers: Martin Luther, John Wesley, Charles Spurgeon
- Modern: Corrie ten Boom, Dietrich Bonhoeffer, Eric Liddell, Jim Elliot

The devotional should have:
1. A title (that includes the person's name if possible)
2. **A scripture verse with the FULL TEXT, followed by the reference. Example: "The Lord is my shepherd; I shall not want." — Psalm 23:1**
3. A 200-250 word story about this person's faith journey
4. A prayer

Format the response as a JSON object with these fields:
{
  "title": "...",
  "scripture": "...",
  "story": "...",
  "prayer": "...",
  "category": "${category}",
  "person": "Full name of the person the story is about"
}

Make the story inspiring and faith-based. Use real historical, biblical, or modern faith stories from ANY time period. Keep the story strictly between 200-250 words.`
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

    // If parsing failed, use fallback
    if (!devotion) {
      console.error('Failed to parse AI response, using fallback');
      devotion = {
        title: `${category} Devotion - ${dateStr}`,
        scripture: '"Trust in the Lord with all your heart." — Proverbs 3:5',
        story: `A reflection on ${category}. This is a story about faith and trust in God. Even in difficult times, we can find hope and strength through our faith. The journey of faith is not always easy, but God is with us every step of the way.`,
        prayer: 'Lord, help us to trust in You and to walk in faith. Amen.',
        category: category,
        person: 'A faithful servant'
      };
    }

    // Ensure person field exists
    if (!devotion.person) {
      devotion.person = extractPerson(devotion) || 'A faithful servant';
    }

    return NextResponse.json({
      success: true,
      devotion: {
        ...devotion,
        date: dateStr,
        person: devotion.person || extractPerson(devotion) || 'A faithful servant'
      },
      category: category,
      avoidList: avoidPeople,
      totalDevotions: totalDevotions
    });

  } catch (error) {
    console.error('Generate Devotion Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}