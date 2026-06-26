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
    const { reel } = await request.json();

    console.log('📡 Publishing reel:', reel?.title);

    if (!reel || !reel.videoId) {
      return NextResponse.json(
        { success: false, error: 'Invalid reel data' },
        { status: 400 }
      );
    }

    const data = readData();

    // Remove from scheduled
    data.scheduled = data.scheduled.filter(d => d.id !== reel.id);

    // Add to published
    const publishedReel = {
      ...reel,
      id: reel.id || `reel_${Date.now()}`,
      publishedDate: new Date().toISOString().split('T')[0],
      publishedAt: new Date().toISOString()
    };
    delete publishedReel.scheduleDate;
    delete publishedReel.scheduleTime;
    delete publishedReel.published;
    delete publishedReel.createdAt;
    delete publishedReel.updatedAt;

    data.published.push(publishedReel);

    writeData(data);

    return NextResponse.json({ success: true, reel: publishedReel });

  } catch (error) {
    console.error('Error publishing reel:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}