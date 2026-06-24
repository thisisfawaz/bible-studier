import { NextResponse } from 'next/server';

// Elevation Church Channel ID (your existing one)
const ELEVATION_CHANNEL_ID = 'UCDDSmXjv5vXqXo6OYuu83CA';

export async function GET() {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }

    // The key difference: adding `&videoDuration=short` to the API call
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${ELEVATION_CHANNEL_ID}&part=snippet,id&order=date&maxResults=30&type=video&videoDuration=short`
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to fetch videos' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Map the results to your video format
    const videos = data.items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium.url,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt,
    }));

    // Shuffle the results
    const shuffled = videos.sort(() => Math.random() - 0.5);

    return NextResponse.json({
      success: true,
      videos: shuffled.slice(0, 15), // Return up to 15 videos
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