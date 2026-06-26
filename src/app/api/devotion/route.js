import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// ADD THIS LINE - Disables Next.js caching for this route
export const dynamic = 'force-dynamic';

const SCHEDULED_FILE = path.join(process.cwd(), 'data', 'scheduled-devotions.json');
const MAX_DEVOTIONS = 10;

function getScheduledData() {
  try {
    if (fs.existsSync(SCHEDULED_FILE)) {
      const data = JSON.parse(fs.readFileSync(SCHEDULED_FILE, 'utf8'));
      return data;
    }
  } catch (error) {
    console.error('Error reading scheduled devotions:', error);
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
    console.error('Error writing scheduled data:', error);
    return false;
  }
}

export async function GET() {
  try {
    const data = getScheduledData();
    const published = data.published || [];
    const scheduled = data.scheduled || [];

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Get current time (HH:MM format)
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    console.log(`📅 Today: ${today}, Current Time: ${currentTime}`);

    // Check for scheduled devotions to publish (date + time)
    const toPublish = scheduled.filter(d => {
      return d.scheduleDate === today && d.scheduleTime <= currentTime;
    });

    if (toPublish.length > 0) {
      console.log(`📅 Auto-publishing ${toPublish.length} devotions for ${today} at ${currentTime}`);
      
      for (const devotion of toPublish) {
        const publishedDevotion = {
          ...devotion,
          id: devotion.id || `dev_${Date.now()}`,
          publishedDate: today,
          publishedAt: new Date().toISOString()
        };
        delete publishedDevotion.scheduleDate;
        delete publishedDevotion.scheduleTime;
        delete publishedDevotion.published;
        delete publishedDevotion.createdAt;
        delete publishedDevotion.updatedAt;
        
        data.published.push(publishedDevotion);
        console.log(`✅ Published: "${publishedDevotion.title}"`);
      }
      
      // Remove published ones from scheduled
      const publishIds = toPublish.map(d => d.id);
      data.scheduled = data.scheduled.filter(d => !publishIds.includes(d.id));
      
      writeScheduledData(data);
    }

    // Get updated data after auto-publish
    const updatedData = getScheduledData();
    const updatedPublished = updatedData.published || [];

    const formattedDevotions = updatedPublished.map(d => ({
      ...d,
      id: d.id || `dev_${Date.now()}`,
      date: d.publishedDate || d.date || new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }));

    const sorted = [...formattedDevotions].sort((a, b) => {
      const dateA = new Date(b.publishedAt || b.publishedDate || 0);
      const dateB = new Date(a.publishedAt || a.publishedDate || 0);
      return dateA - dateB;
    });

    const todayDevotion = sorted.length > 0 ? sorted[0] : null;
    const recent = sorted.slice(0, MAX_DEVOTIONS);

    console.log(`📖 Today: ${todayDevotion?.title || 'None'}`);
    console.log(`📖 Recent: ${recent.length}`);

    return NextResponse.json({
      success: true,
      today: todayDevotion || null,
      recent: recent,
      count: formattedDevotions.length,
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