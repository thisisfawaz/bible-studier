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
        schedule_date: null,
        schedule_time: null
      })
      .eq('id', reel.id)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      reel: data?.[0] || reel
    });

  } catch (error) {
    console.error('Error publishing reel:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}