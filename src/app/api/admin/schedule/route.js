// src/app/api/admin/schedule/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { devotion, scheduled, scheduleDate, scheduleTime } = await request.json();

    console.log('📡 Saving devotion:', devotion?.title);
    console.log('📡 Data received:', { scheduled, scheduleDate, scheduleTime });

    if (!devotion || !devotion.title) {
      return NextResponse.json(
        { success: false, error: 'Invalid devotion data' },
        { status: 400 }
      );
    }

    const data = {
      ...devotion,
      id: devotion.id || `dev_${Date.now()}`,
      status: scheduled ? 'scheduled' : 'published',
      schedule_date: scheduled ? scheduleDate : null,
      schedule_time: scheduled ? scheduleTime : null,
      published_date: scheduled ? null : new Date().toISOString().split('T')[0],
      published_at: scheduled ? null : new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    // Remove undefined fields
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

    console.log('📡 Saving to Supabase:', data);

    const { data: result, error } = await supabase
      .from('devotions')
      .upsert(data, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('✅ Saved successfully:', result?.[0]?.title);

    return NextResponse.json({
      success: true,
      devotion: result?.[0] || data
    });

  } catch (error) {
    console.error('❌ Error saving devotion:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}