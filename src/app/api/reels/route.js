import { NextResponse } from 'next/server';

// Your playlist ID
const PLAYLIST_ID = 'PLifoTByOCDdyfNHO-SDHcXhA9qpyzy3m';

// Cache the videos to reduce API calls
let cachedVideos = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }

    // Check cache
    const now = Date.now();
    if (cachedVideos && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('📦 Returning cached videos');
      return NextResponse.json({
        success: true,
        videos: cachedVideos.slice(0, 20),
        count: cachedVideos.length,
        cached: true
      });
    }

    console.log('📡 Fetching from YouTube API...');

    // Fetch from YouTube
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?key=${apiKey}&playlistId=${PLAYLIST_ID}&part=snippet&maxResults=50`
    );

    // Handle API errors properly
    if (!response.ok) {
      let errorMessage = `YouTube API error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        // If we can't parse the error, use the status text
        errorMessage = `YouTube API error: ${response.status} ${response.statusText}`;
      }
      
      // If we have cached videos, return them instead of failing
      if (cachedVideos) {
        console.warn('⚠️ API failed, returning cached videos');
        return NextResponse.json({
          success: true,
          videos: cachedVideos.slice(0, 20),
          count: cachedVideos.length,
          cached: true,
          note: 'Using cached data'
        });
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Handle empty response
    if (!data.items || data.items.length === 0) {
      // If we have cached videos, return them
      if (cachedVideos) {
        console.warn('⚠️ No videos from API, returning cached videos');
        return NextResponse.json({
          success: true,
          videos: cachedVideos.slice(0, 20),
          count: cachedVideos.length,
          cached: true,
          note: 'Using cached data'
        });
      }
      
      return NextResponse.json(
        { error: 'No videos found in playlist' },
        { status: 404 }
      );
    }

    // Filter and map videos
    const videos = data.items
      .filter(item => {
        const title = item.snippet?.title || '';
        return title !== 'Private video' && 
               title !== 'Deleted video' && 
               title.trim() !== '';
      })
      .map((item) => ({
        id: item.snippet?.resourceId?.videoId || '',
        title: item.snippet?.title || 'Untitled',
        description: item.snippet?.description || '',
        thumbnail: item.snippet?.thumbnails?.medium?.url || 
                   item.snippet?.thumbnails?.default?.url || '',
        channelTitle: '', // Empty to hide channel name
        channelId: item.snippet?.channelId || '',
        publishedAt: item.snippet?.publishedAt || '',
      }))
      .filter(video => video.id !== ''); // Remove any videos without an ID

    // Shuffle and cache
    const shuffled = videos.sort(() => Math.random() - 0.5);
    cachedVideos = shuffled;
    cacheTimestamp = now;

    console.log(`✅ Fetched ${shuffled.length} videos from playlist`);

    return NextResponse.json({
      success: true,
      videos: shuffled.slice(0, 20),
      count: shuffled.length,
      cached: false
    });

  } catch (error) {
    console.error('Reels API Error:', error);
    
    // If we have cached videos, return them instead of failing
    if (cachedVideos) {
      console.warn('⚠️ Exception occurred, returning cached videos');
      return NextResponse.json({
        success: true,
        videos: cachedVideos.slice(0, 20),
        count: cachedVideos.length,
        cached: true,
        note: 'Using cached data'
      });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}