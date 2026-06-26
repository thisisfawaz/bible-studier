import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const SCHEDULED_FILE = path.join(process.cwd(), 'data', 'scheduled-reels.json');
const MAX_REELS = 20;

function getScheduledData() {
  try {
    if (fs.existsSync(SCHEDULED_FILE)) {
      const data = JSON.parse(fs.readFileSync(SCHEDULED_FILE, 'utf8'));
      return data;
    }
  } catch (error) {
    console.error('Error reading scheduled reels:', error);
  }
  return { scheduled: [], published: [] };
}

function writeScheduledData(data) {
  try {
    const dir = path.dirname(SCHEDULED_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SCHEDULED_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing scheduled reels:', error);
    return false;
  }
}

export async function GET() {
  try {
    const data = getScheduledData();
    const published = data.published || [];
    const scheduled = data.scheduled || [];

    // Get today's date and current time
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    console.log(`📅 Today: ${today}, Current Time: ${currentTime}`);

    // Auto-publish scheduled reels
    const toPublish = scheduled.filter(d => {
      return d.scheduleDate === today && d.scheduleTime <= currentTime;
    });

    if (toPublish.length > 0) {
      console.log(`📅 Auto-publishing ${toPublish.length} reels`);
      
      for (const reel of toPublish) {
        const publishedReel = {
          ...reel,
          id: reel.id || `reel_${Date.now()}`,
          publishedDate: today,
          publishedAt: new Date().toISOString()
        };
        delete publishedReel.scheduleDate;
        delete publishedReel.scheduleTime;
        delete publishedReel.published;
        delete publishedReel.createdAt;
        delete publishedReel.updatedAt;
        
        data.published.push(publishedReel);
        console.log(`✅ Published reel: "${publishedReel.title}"`);
      }
      
      const publishIds = toPublish.map(d => d.id);
      data.scheduled = data.scheduled.filter(d => !publishIds.includes(d.id));
      
      writeScheduledData(data);
    }

    // Get updated data
    const updatedData = getScheduledData();
    const updatedPublished = updatedData.published || [];

    // Shuffle the reels for variety
    const shuffled = [...updatedPublished].sort(() => Math.random() - 0.5);
    const reels = shuffled.slice(0, MAX_REELS).map(d => ({
      id: d.videoId || d.id,
      videoId: d.videoId,
      title: d.title || 'Untitled Reel'
    }));

    return NextResponse.json({
      success: true,
      videos: reels,
      count: reels.length
    });

  } catch (error) {
    console.error('Error in GET reels:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}