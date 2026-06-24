import { NextResponse } from 'next/server';

// Your playlist ID
const PLAYLIST_ID = 'PLifoTByOCDdyfFNH-OsDHcXhA9qpyzy3m';

export async function GET() {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }

    // Fetch directly from your playlist
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?key=${apiKey}&playlistId=${PLAYLIST_ID}&part=snippet&maxResults=50`
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to fetch playlist' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Filter out any private or deleted videos
    const videos = data.items
      .filter(item => item.snippet.title !== 'Private video' && item.snippet.title !== 'Deleted video')
      .map((item) => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        publishedAt: item.snippet.publishedAt,
      }));

    // Shuffle the videos
    const shuffled = videos.sort(() => Math.random() - 0.5);

    return NextResponse.json({
      success: true,
      videos: shuffled.slice(0, 20),
      count: shuffled.length,
    });

  } catch (error) {
    console.error('Reels API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}