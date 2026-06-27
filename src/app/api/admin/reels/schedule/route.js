// src/app/api/admin/reels/schedule/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    const data = {
      id: reel.id || `reel_${Date.now()}`,
      video_id: reel.videoId,  // ← Frontend sends videoId, we save as video_id
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