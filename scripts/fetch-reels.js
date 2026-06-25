// scripts/fetch-reels.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const PLAYLIST_ID = process.env.PLAYLIST_ID;

async function fetchReels() {
  console.log('📡 Fetching reels from YouTube...');
  
  if (!YOUTUBE_API_KEY) {
    console.error('❌ YOUTUBE_API_KEY not set');
    process.exit(1);
  }

  if (!PLAYLIST_ID) {
    console.error('❌ PLAYLIST_ID not set');
    process.exit(1);
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${PLAYLIST_ID}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.error('❌ No videos found in playlist');
      process.exit(1);
    }
    
    const videos = data.items.map(item => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle || 'Bible Studier',
    }));
    
    const outputPath = path.join(process.cwd(), 'data', 'reels.json');
    const dataDir = path.join(process.cwd(), 'data');
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify({ 
      videos, 
      updatedAt: new Date().toISOString(),
      count: videos.length 
    }, null, 2));
    
    console.log(`✅ Successfully fetched ${videos.length} videos`);
    return videos;
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fetchReels();
