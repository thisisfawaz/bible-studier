// src/app/api/admin/schedule/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('📡 Full request body:', body);

    const { devotion, scheduled, scheduleDate, scheduleTime } = body;

    console.log('📡 Saving devotion:', devotion?.title);
    console.log('📡 Scheduled:', scheduled);
    console.log('📡 Schedule Date:', scheduleDate);
    console.log('📡 Schedule Time:', scheduleTime);

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
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });

    console.log('📡 Data being saved:', data);

    const { data: result, error } = await supabase
      .from('devotions')
      .upsert(data, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('❌ Supabase error details:', error);
      throw error;
    }

    console.log('✅ Save successful:', result?.[0]?.title);

    return NextResponse.json({
      success: true,
      devotion: result?.[0] || data
    });

  } catch (error) {
    console.error('❌ Error saving devotion:', error);
    // Return the full error for debugging
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: error.stack 
      },
      { status: 500 }
    );
  }
}