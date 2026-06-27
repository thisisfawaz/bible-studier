// /app/api/devotion/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Get the most recent published devotion (today's if exists, otherwise latest)
    const { data: todayDevotion, error: todayError } = await supabase
      .from('devotions')
      .select('*')
      .eq('status', 'published')
      .order('published_date', { ascending: false })
      .limit(1);

    if (todayError) throw todayError;

    // Get all recent published devotions (for sidebar)
    const { data: recentDevotions, error: recentError } = await supabase
      .from('devotions')
      .select('*')
      .eq('status', 'published')
      .order('published_date', { ascending: false })
      .limit(10);

    if (recentError) throw recentError;

    return NextResponse.json({
      success: true,
      today: todayDevotion?.[0] || null,
      recent: recentDevotions || []
    });

  } catch (error) {
    console.error('Error fetching devotions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}