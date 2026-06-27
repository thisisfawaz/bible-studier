// src/app/api/admin/reels/schedule/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Function to extract video ID from YouTube URL
function extractVideoId(url) {
  if (!url) return null;
  
  // Trim whitespace
  const trimmedUrl = url.trim();
  
  // If it's already just an ID (no slashes or query params, and looks like a video ID)
  if (!trimmedUrl.includes('/') && !trimmedUrl.includes('?') && trimmedUrl.length <= 20) {
    return trimmedUrl;
  }
  
  // Try all YouTube URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]+)/,
    /(?:youtu\.be\/)([\w-]+)/,
    /(?:youtube\.com\/shorts\/)([\w-]+)/,
    /(?:youtube\.com\/embed\/)([\w-]+)/,
    /(?:youtube\.com\/v\/)([\w-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = trimmedUrl.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // If no pattern matches, return the original (maybe it's just an ID)
  return trimmedUrl;
}

export async function POST(request) {
  try {
    const { reel, scheduled, scheduleDate, scheduleTime } = await request.json();

    console.log('📡 Received reel:', reel);

    if (!reel || !reel.videoId) {
      return NextResponse.json(
        { success: false, error: 'Missing videoId' },
        { status: 400 }
      );
    }

    // Extract the video ID from the URL
    const videoId = extractVideoId(reel.videoId);
    
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    console.log('📡 Extracted video ID:', videoId);

    const data = {
      id: reel.id || `reel_${Date.now()}`,
      video_id: videoId,  // ← Store just the video ID
      title: reel.title || `Reel ${new Date().toISOString()}`,
      status: scheduled ? 'scheduled' : 'published',
      schedule_date: scheduled ? scheduleDate : null,
      schedule_time: scheduled ? scheduleTime : null,
      published_date: scheduled ? null : new Date().toISOString().split('T')[0],
      published_at: scheduled ? null : new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    // Remove undefined fields
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });

    console.log('📡 Saving to Supabase:', data);

    const { data: result, error } = await supabase
      .from('reels')
      .upsert(data, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('❌ Supabase error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Convert video_id back to videoId for frontend
    const savedReel = result?.[0];
    if (savedReel) {
      savedReel.videoId = savedReel.video_id;
    }

    console.log('✅ Reel saved:', savedReel);

    return NextResponse.json({
      success: true,
      reel: savedReel || data
    });

  } catch (error) {
    console.error('❌ Error saving reel:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}