import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'scheduled-reels.json');

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return data;
    }
  } catch (error) {
    console.error('Error reading reels data:', error);
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
    console.error('Error writing reels data:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    const { reel, scheduled, scheduleDate, scheduleTime } = await request.json();

    console.log('📡 Schedule Reel:', reel?.title);
    console.log('Scheduled:', scheduled);
    console.log('Date:', scheduleDate);

    if (!reel || !reel.videoId) {
      return NextResponse.json(
        { success: false, error: 'Invalid reel data - videoId required' },
        { status: 400 }
      );
    }

    const data = readData();

    // Extract video ID from YouTube URL if needed
    let videoId = reel.videoId;
    if (videoId.includes('youtube.com') || videoId.includes('youtu.be')) {
      const url = new URL(videoId);
      if (url.searchParams.get('v')) {
        videoId = url.searchParams.get('v');
      } else {
        const pathParts = url.pathname.split('/');
        videoId = pathParts[pathParts.length - 1];
      }
    }

    const formattedReel = {
      ...reel,
      videoId: videoId,
      title: reel.title || 'Untitled Reel'
    };

    if (scheduled) {
      const existingIndex = data.scheduled.findIndex(d => d.id === formattedReel.id);
      
      if (existingIndex !== -1) {
        data.scheduled[existingIndex] = {
          ...formattedReel,
          id: formattedReel.id,
          scheduleDate: scheduleDate || data.scheduled[existingIndex].scheduleDate,
          scheduleTime: scheduleTime || data.scheduled[existingIndex].scheduleTime,
          published: false,
          updatedAt: new Date().toISOString()
        };
        console.log('✅ Updated scheduled reel:', formattedReel.title);
      } else {
        const newReel = {
          ...formattedReel,
          id: formattedReel.id || `reel_${Date.now()}`,
          scheduleDate: scheduleDate || new Date().toISOString().split('T')[0],
          scheduleTime: scheduleTime || '08:00',
          published: false,
          createdAt: new Date().toISOString()
        };
        data.scheduled.push(newReel);
        console.log('✅ Added to scheduled reels:', newReel.title);
      }
    } else {
      const newReel = {
        ...formattedReel,
        id: formattedReel.id || `reel_${Date.now()}`,
        publishedDate: new Date().toISOString().split('T')[0],
        publishedAt: new Date().toISOString()
      };
      data.published.push(newReel);
      console.log('✅ Published reel immediately:', newReel.title);
      
      // Remove from scheduled if exists
      data.scheduled = data.scheduled.filter(d => d.id !== formattedReel.id);
    }

    writeData(data);

    return NextResponse.json({ success: true, data: data });

  } catch (error) {
    console.error('Error scheduling reel:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}