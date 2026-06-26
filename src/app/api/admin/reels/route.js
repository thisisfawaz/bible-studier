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

export async function GET() {
  const data = readData();
  return NextResponse.json({
    success: true,
    data: data
  });
}