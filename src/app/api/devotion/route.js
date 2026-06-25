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

// Check if a devotion exists for today
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
    const today = getTodayDate();
    let todayDevotion = getTodayDevotion(devotions);
    
    // If no devotion for today, generate one
    if (!todayDevotion) {
      console.log(`🔄 Generating devotion for ${today}`);
      
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
            date: genData.devotion.date || today
          };
          
          // Remove any existing devotion with the same date
          const filteredDevotions = devotions.filter(d => d.date !== today);
          filteredDevotions.push(formattedDevotion);
          
          // Save (keeps last 10)
          const saved = saveDevotions(filteredDevotions);
          todayDevotion = saved.find(d => d.date === today);
          
          console.log(`✅ Devotion generated for ${today}`);
          console.log(`📖 Title: "${todayDevotion?.title}"`);
        } else {
          console.error('Failed to generate devotion:', genData.error);
          if (devotions.length > 0) {
            todayDevotion = devotions[devotions.length - 1];
          }
        }
      } catch (genError) {
        console.error('Error generating devotion:', genError);
        if (devotions.length > 0) {
          todayDevotion = devotions[devotions.length - 1];
        }
      }
    } else {
      console.log(`✅ Devotion already exists for ${today}: "${todayDevotion?.title}"`);
    }

    return NextResponse.json({
      success: true,
      today: todayDevotion || null,
      recent: devotions.slice(-MAX_DEVOTIONS).reverse(),
      count: devotions.length,
      max: MAX_DEVOTIONS
    });

  } catch (error) {
    console.error('Error in GET:', error);
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