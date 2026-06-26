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
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing data:', error);
    return false;
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

    const data = readData();

    // Remove from scheduled if exists
    data.scheduled = data.scheduled.filter(d => d.id !== devotion.id);

    // Add to published
    const publishedDevotion = {
      ...devotion,
      publishedDate: new Date().toISOString().split('T')[0],
      publishedAt: new Date().toISOString()
    };
    data.published.push(publishedDevotion);

    writeData(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}