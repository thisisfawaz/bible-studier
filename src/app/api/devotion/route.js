import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'devotions.json');
const MAX_DEVOTIONS = 10;

// Ensure data directory exists
function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Read devotions from file
function getDevotions() {
  try {
    ensureDataDir();
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return data.devotions || [];
    }
  } catch (error) {
    console.error('Error reading devotions:', error);
  }
  return [];
}

// Save devotions to file
function saveDevotions(devotions) {
  try {
    ensureDataDir();
    // Keep only the last MAX_DEVOTIONS
    const trimmed = devotions.slice(-MAX_DEVOTIONS);
    fs.writeFileSync(DATA_FILE, JSON.stringify({ devotions: trimmed }, null, 2));
    return trimmed;
  } catch (error) {
    console.error('Error saving devotions:', error);
    return devotions;
  }
}

// Get today's date as string
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// FOR TESTING: Get current minute timestamp (acts like a "day" for testing)
function getCurrentMinute() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// Check if a devotion exists for today (production)
function getTodayDevotion(devotions) {
  const today = getTodayDate();
  return devotions.find(d => d.date === today) || null;
}

// Format the story with proper paragraph breaks
function formatStory(story) {
  if (!story) return '';
  const paragraphs = story.split(/\n\n|\n/).filter(p => p.trim());
  return paragraphs.join('\n\n');
}

export async function GET() {
  try {
    const devotions = getDevotions();
    
    // ============================================================
    // FOR TESTING: Use minute as "day" - one devotion per minute
    // To switch back to 24 hours, replace currentMinute with today
    // and timestamp with date
    // ============================================================
    const currentMinute = getCurrentMinute();
    console.log(`🔍 Checking for devotion at minute: ${currentMinute}`);
    
    // Check if devotion exists for this minute (like checking for today)
    let todayDevotion = devotions.find(d => d.timestamp === currentMinute);
    
    // If no devotion for this minute, generate one (like a new day)
    if (!todayDevotion) {
      console.log(`🔄 No devotion found for ${currentMinute}. Generating...`);
      
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const genResponse = await fetch(`${baseUrl}/api/generate-devotion`, {
          method: 'POST'
        });
        const genData = await genResponse.json();
        
        if (genData.success) {
          const formattedDevotion = {
            ...genData.devotion,
            story: formatStory(genData.devotion.story || ''),
            timestamp: currentMinute, // ← This acts like the "day" identifier
            date: genData.devotion.date || new Date().toISOString().split('T')[0]
          };
          
          // Remove any existing devotion with the same timestamp (like replacing today's)
          const filteredDevotions = devotions.filter(d => d.timestamp !== currentMinute);
          filteredDevotions.push(formattedDevotion);
          
          // Save (keeps last 10)
          const saved = saveDevotions(filteredDevotions);
          todayDevotion = saved.find(d => d.timestamp === currentMinute);
          
          console.log(`✅ Devotion generated and saved for ${currentMinute}`);
          console.log(`📖 Title: "${todayDevotion?.title}"`);
          console.log(`📚 Total devotions: ${saved.length}`);
        } else {
          console.error('❌ Failed to generate devotion:', genData.error);
          if (devotions.length > 0) {
            todayDevotion = devotions[devotions.length - 1];
          }
        }
      } catch (genError) {
        console.error('❌ Error generating devotion:', genError.message);
        if (devotions.length > 0) {
          todayDevotion = devotions[devotions.length - 1];
        }
      }
    } else {
      console.log(`✅ Devotion already exists for ${currentMinute}: "${todayDevotion?.title}"`);
    }

    return NextResponse.json({
      success: true,
      today: todayDevotion || null,
      recent: devotions.slice(-MAX_DEVOTIONS).reverse(),
      count: devotions.length,
      max: MAX_DEVOTIONS,
      timestamp: currentMinute,
      note: 'TESTING MODE - One devotion per minute (acts like 24 hours)'
    });

  } catch (error) {
    console.error('❌ Error in GET:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { devotion } = await request.json();
    
    if (!devotion || !devotion.title) {
      return NextResponse.json(
        { success: false, error: 'Invalid devotion data' },
        { status: 400 }
      );
    }

    let devotions = getDevotions();
    
    const formattedDevotion = {
      ...devotion,
      story: formatStory(devotion.story || '')
    };
    
    const today = getTodayDate();
    const existingIndex = devotions.findIndex(d => d.date === today);
    
    if (existingIndex !== -1) {
      devotions[existingIndex] = { ...formattedDevotion, date: today };
    } else {
      devotions.push({ ...formattedDevotion, date: today });
    }
    
    const saved = saveDevotions(devotions);
    
    return NextResponse.json({
      success: true,
      devotion: saved.find(d => d.date === today),
      recent: saved.slice(-MAX_DEVOTIONS).reverse(),
      count: saved.length,
      max: MAX_DEVOTIONS
    });
    
  } catch (error) {
    console.error('Error in POST:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}