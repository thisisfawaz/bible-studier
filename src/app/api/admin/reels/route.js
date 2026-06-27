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
      .order('schedule_date', { ascending: false });

    if (scheduledError) throw scheduledError;

    // Get published reels
    const { data: published, error: publishedError } = await supabase
      .from('reels')
      .select('*')
      .eq('status', 'published')
      .order('published_date', { ascending: false });

    if (publishedError) throw publishedError;

    return NextResponse.json({
      success: true,
      data: { scheduled: scheduled || [], published: published || [] }
    });

  } catch (error) {
    console.error('Error loading reels:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}