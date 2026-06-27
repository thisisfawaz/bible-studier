// src/app/api/admin/devotions/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get scheduled devotions
    const { data: scheduled, error: scheduledError } = await supabase
      .from('devotions')
      .select('*')
      .eq('status', 'scheduled')
      .order('schedule_date', { ascending: false, nullsFirst: false });

    if (scheduledError) throw scheduledError;

    // Get published devotions
    const { data: published, error: publishedError } = await supabase
      .from('devotions')
      .select('*')
      .eq('status', 'published')
      .order('published_date', { ascending: false, nullsFirst: false });

    if (publishedError) throw publishedError;

    return NextResponse.json({
      success: true,
      data: { 
        scheduled: scheduled || [], 
        published: published || [] 
      }
    });

  } catch (error) {
    console.error('Error loading devotions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}