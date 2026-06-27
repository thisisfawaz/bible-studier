// src/app/api/admin/reels/schedule/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { reel, scheduled, scheduleDate, scheduleTime } = await request.json();

    if (!reel || !reel.videoId) {
      return NextResponse.json(
        { success: false, error: 'Invalid reel data' },
        { status: 400 }
      );
    }

    const data = {
      id: reel.id || `reel_${Date.now()}`,
      video_id: reel.videoId,  // ← CHANGE: use video_id, not videoId
      title: reel.title || `Reel ${new Date().toISOString()}`,
      status: scheduled ? 'scheduled' : 'published',
      schedule_date: scheduled ? scheduleDate : null,
      schedule_time: scheduled ? scheduleTime : null,
      published_date: scheduled ? null : new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    // Remove undefined fields
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

    console.log('📡 Saving reel:', data);

    const { data: result, error } = await supabase
      .from('reels')
      .upsert(data, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('✅ Reel saved:', result);

    return NextResponse.json({
      success: true,
      reel: result?.[0] || data
    });

  } catch (error) {
    console.error('Error saving reel:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}