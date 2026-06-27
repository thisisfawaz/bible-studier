// src/app/api/admin/reels/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get scheduled reels
    const { data: scheduled, error: scheduledError } = await supabase
      .from('reels')
      .select('*')
      .eq('status', 'scheduled')
      .order('schedule_date', { ascending: false, nullsFirst: false });

    if (scheduledError) throw scheduledError;

    // Get published reels
    const { data: published, error: publishedError } = await supabase
      .from('reels')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false });

    if (publishedError) throw publishedError;

    // Transform video_id to videoId for frontend
    const transformReels = (reels) => {
      return (reels || []).map(reel => ({
        ...reel,
        videoId: reel.video_id  // ← Add videoId for frontend
      }));
    };

    return NextResponse.json({
      success: true,
      data: { 
        scheduled: transformReels(scheduled), 
        published: transformReels(published) 
      }
    });

  } catch (error) {
    console.error('Error loading reels:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}