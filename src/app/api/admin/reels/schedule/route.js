// src/app/api/admin/reels/schedule/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('📡 Full request body:', body);

    const { reel, scheduled, scheduleDate, scheduleTime } = body;

    if (!reel || !reel.videoId) {
      console.log('❌ Missing videoId');
      return NextResponse.json(
        { success: false, error: 'Missing videoId' },
        { status: 400 }
      );
    }

    const data = {
      id: reel.id || `reel_${Date.now()}`,
      video_id: reel.videoId,
      title: reel.title || `Reel ${new Date().toISOString()}`,
      status: scheduled ? 'scheduled' : 'published',
      schedule_date: scheduled ? scheduleDate : null,
      schedule_time: scheduled ? scheduleTime : null,
      published_date: scheduled ? null : new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    // Remove undefined fields
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });

    console.log('📡 Data being saved:', data);

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

    console.log('✅ Reel saved successfully:', result);

    return NextResponse.json({
      success: true,
      reel: result?.[0] || data
    });

  } catch (error) {
    console.error('❌ Error saving reel:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}