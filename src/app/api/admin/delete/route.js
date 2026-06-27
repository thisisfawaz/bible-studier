// src/app/api/admin/delete/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { id, type } = await request.json();

    console.log('📡 Deleting:', id, type);

    if (!id || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing id or type' },
        { status: 400 }
      );
    }

    // Delete from the devotions table (both scheduled and published are in the same table)
    const { error } = await supabase
      .from('devotions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ Deleted successfully:', id);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in delete:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}