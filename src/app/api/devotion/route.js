import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SCHEDULED_FILE = path.join(process.cwd(), 'data', 'scheduled-devotions.json');
const MAX_DEVOTIONS = 10;

// Read scheduled devotions data
function readScheduledData() {
  try {
    if (fs.existsSync(SCHEDULED_FILE)) {
      const data = JSON.parse(fs.readFileSync(SCHEDULED_FILE, 'utf8'));
      return data;
    }
  } catch (error) {
    console.error('Error reading scheduled data:', error);
  }
  return { scheduled: [], published: [] };
}

// Write to scheduled devotions data
function writeScheduledData(data) {
  try {
    const dir = path.dirname(SCHEDULED_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SCHEDULED_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing scheduled data:', error);
    return false;
  }
}

// Format the story with proper paragraph breaks (for backward compatibility)
function formatStory(story) {
  if (!story) return '';
  
  let paragraphs = story.split(/\n\n/).filter(p => p.trim());
  
  if (paragraphs.length <= 1) {
    paragraphs = story.split(/\n/).filter(p => p.trim());
  }
  
  if (paragraphs.length <= 1) {
    const sentences = story.split(/\.\s+/).filter(s => s.trim());
    const sentencesPerParagraph = 4;
    paragraphs = [];
    for (let i = 0; i < sentences.length; i += sentencesPerParagraph) {
      const group = sentences.slice(i, i + sentencesPerParagraph);
      const paragraphText = group.map((s, idx) => {
        const trimmed = s.trim();
        if (idx < group.length - 1 && !trimmed.endsWith('.')) {
          return trimmed + '.';
        }
        return trimmed;
      }).join('. ');
      if (paragraphText.trim()) {
        paragraphs.push(paragraphText.trim());
      }
    }
  }
  
  return paragraphs.filter(p => p.trim()).join('\n\n');
}

export async function GET() {
  try {
    const data = readScheduledData();
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Check if there's a scheduled devotion for today
    let todayDevotion = data.scheduled.find(d => d.scheduleDate === today);
    
    // If there's a scheduled devotion for today, auto-publish it
    if (todayDevotion) {
      // Remove from scheduled
      data.scheduled = data.scheduled.filter(d => d.id !== todayDevotion.id);
      
      // Add to published
      const publishedDevotion = {
        ...todayDevotion,
        publishedDate: today,
        publishedAt: new Date().toISOString()
      };
      delete publishedDevotion.scheduleDate;
      delete publishedDevotion.scheduleTime;
      
      data.published.push(publishedDevotion);
      writeScheduledData(data);
    }
    
    // Find today's devotion from published list
    let todayPublished = data.published.find(d => d.publishedDate === today);
    
    // If no published devotion for today, show the most recent published
    if (!todayPublished && data.published.length > 0) {
      todayPublished = data.published[data.published.length - 1];
    }

    // Get recent devotions (last 10)
    const recent = data.published.slice(-MAX_DEVOTIONS).reverse();

    return NextResponse.json({
      success: true,
      today: todayPublished || null,
      recent: recent,
      count: data.published.length,
      max: MAX_DEVOTIONS,
      note: 'Devotions are managed through the admin dashboard'
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

    const data = readScheduledData();
    
    // Format the story with proper paragraph breaks
    const formattedDevotion = {
      ...devotion,
      story: formatStory(devotion.story || ''),
      id: devotion.id || `dev_${Date.now()}`,
      publishedDate: new Date().toISOString().split('T')[0],
      publishedAt: new Date().toISOString()
    };
    
    data.published.push(formattedDevotion);
    writeScheduledData(data);
    
    return NextResponse.json({
      success: true,
      devotion: formattedDevotion,
      recent: data.published.slice(-MAX_DEVOTIONS).reverse(),
      count: data.published.length,
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