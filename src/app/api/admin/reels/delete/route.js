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
    const { id, type } = await request.json();

    console.log('📡 Deleting reel:', id, type);

    if (!id || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing id or type' },
        { status: 400 }
      );
    }

    const data = readData();

    if (type === 'scheduled') {
      data.scheduled = data.scheduled.filter(d => d.id !== id);
    } else if (type === 'published') {
      data.published = data.published.filter(d => d.id !== id);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type' },
        { status: 400 }
      );
    }

    writeData(data);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting reel:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}