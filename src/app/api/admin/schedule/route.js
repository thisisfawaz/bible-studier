import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'scheduled-devotions.json');

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return data;
    }
  } catch (error) {
    console.error('Error reading data:', error);
  }
  return { scheduled: [], published: [] };
}

function writeData(data) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing data:', error);
    return false;
  }
}

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

export async function POST(request) {
  try {
    const { devotion, scheduled, scheduleDate, scheduleTime } = await request.json();

    console.log('📡 Schedule:', devotion?.title);
    console.log('Scheduled:', scheduled);
    console.log('Date:', scheduleDate);

    if (!devotion || !devotion.title) {
      return NextResponse.json(
        { success: false, error: 'Invalid devotion data' },
        { status: 400 }
      );
    }

    const data = readData();

    const formattedDevotion = {
      ...devotion,
      story: formatStory(devotion.story || '')
    };

    if (scheduled) {
      // 🔥 CHECK IF THIS DEVOTION ALREADY EXISTS IN SCHEDULED
      const existingIndex = data.scheduled.findIndex(d => d.id === formattedDevotion.id);
      
      if (existingIndex !== -1) {
        // UPDATE EXISTING
        data.scheduled[existingIndex] = {
          ...formattedDevotion,
          id: formattedDevotion.id,
          scheduleDate: scheduleDate || data.scheduled[existingIndex].scheduleDate,
          scheduleTime: scheduleTime || data.scheduled[existingIndex].scheduleTime,
          published: false,
          updatedAt: new Date().toISOString()
        };
        console.log('✅ Updated scheduled:', formattedDevotion.title);
      } else {
        // ADD NEW
        const newDevotion = {
          ...formattedDevotion,
          id: formattedDevotion.id || `dev_${Date.now()}`,
          scheduleDate: scheduleDate || new Date().toISOString().split('T')[0],
          scheduleTime: scheduleTime || '08:00',
          published: false,
          createdAt: new Date().toISOString()
        };
        data.scheduled.push(newDevotion);
        console.log('✅ Added to scheduled:', newDevotion.title);
      }
    } else {
      // PUBLISH IMMEDIATELY
      // Check if already published
      const existingPublished = data.published.findIndex(d => d.id === formattedDevotion.id);
      
      if (existingPublished !== -1) {
        // Update existing published
        data.published[existingPublished] = {
          ...formattedDevotion,
          id: formattedDevotion.id,
          publishedDate: new Date().toISOString().split('T')[0],
          publishedAt: new Date().toISOString()
        };
        console.log('✅ Updated published:', formattedDevotion.title);
      } else {
        // Add new published
        const newDevotion = {
          ...formattedDevotion,
          id: formattedDevotion.id || `dev_${Date.now()}`,
          publishedDate: new Date().toISOString().split('T')[0],
          publishedAt: new Date().toISOString()
        };
        data.published.push(newDevotion);
        console.log('✅ Published immediately:', newDevotion.title);
      }
      
      // Also remove from scheduled if it exists there
      data.scheduled = data.scheduled.filter(d => d.id !== formattedDevotion.id);
    }

    writeData(data);

    return NextResponse.json({ success: true, data: data });

  } catch (error) {
    console.error('Error in schedule:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}