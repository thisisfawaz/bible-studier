// src/app/api/admin/reels/publish/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { reel } = await request.json();

    if (!reel || !reel.id) {
      return NextResponse.json(
        { success: false, error: 'Invalid reel data' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('reels')
      .update({
        status: 'published',
        published_date: new Date().toISOString().split('T')[0],
        published_at: new Date().toISOString(),
        schedule_date: null,
        schedule_time: null
      })
      .eq('id', reel.id)
      .select();

    if (error) throw error;

    // Convert video_id to videoId for frontend
    const savedReel = data?.[0];
    if (savedReel) {
      savedReel.videoId = savedReel.video_id;
    }

    return NextResponse.json({
      success: true,
      reel: savedReel || reel
    });

  } catch (error) {
    console.error('Error publishing reel:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}