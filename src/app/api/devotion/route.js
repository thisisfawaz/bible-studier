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
  
  // First, split by any newlines (both \n\n and \n)
  const paragraphs = story.split(/\n\n|\n/).filter(p => p.trim());
  
  // Join with double newlines for proper paragraph spacing
  return paragraphs.join('\n\n');
}

export async function GET() {
  const devotions = getDevotions();
  const today = getTodayDate();
  const todayDevotion = getTodayDevotion(devotions);

  return NextResponse.json({
    success: true,
    today: todayDevotion,
    recent: devotions.slice(-MAX_DEVOTIONS).reverse(),
    count: devotions.length,
    max: MAX_DEVOTIONS
  });
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
    
    // Format the story with proper paragraph breaks
    const formattedDevotion = {
      ...devotion,
      story: formatStory(devotion.story || '')
    };
    
    // Check if today already has a devotion
    const today = getTodayDate();
    const existingIndex = devotions.findIndex(d => d.date === today);
    
    if (existingIndex !== -1) {
      // Replace today's devotion
      devotions[existingIndex] = { ...formattedDevotion, date: today };
    } else {
      // Add new devotion
      devotions.push({ ...formattedDevotion, date: today });
    }
    
    // Save (automatically keeps last 10)
    const saved = saveDevotions(devotions);
    
    return NextResponse.json({
      success: true,
      devotion: saved.find(d => d.date === today),
      recent: saved.slice(-MAX_DEVOTIONS).reverse(),
      count: saved.length,
      max: MAX_DEVOTIONS
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}