// src/app/api/admin/publish/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { devotion } = await request.json();

    console.log('📡 Publishing:', devotion?.title);

    if (!devotion || !devotion.id) {
      return NextResponse.json(
        { success: false, error: 'Invalid devotion data' },
        { status: 400 }
      );
    }

    // Update the devotion status to 'published'
    const { data, error } = await supabase
      .from('devotions')
      .update({
        status: 'published',
        published_date: new Date().toISOString().split('T')[0],
        published_at: new Date().toISOString(),
        schedule_date: null,
        schedule_time: null
      })
      .eq('id', devotion.id)
      .select();

    if (error) throw error;

    console.log('✅ Published successfully:', devotion.title);

    return NextResponse.json({
      success: true,
      devotion: data?.[0] || devotion
    });

  } catch (error) {
    console.error('Error publishing devotion:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}