import { NextResponse } from 'next/server';

// Map human-friendly tokens to API.Bible's mandatory hexadecimal ID format
const BIBLE_ID_MAP = {
  kjv: 'de4e12af7f28f599-01',  // King James Version - Open Access ✅
  nkjv: '63097d2a0a2f7db3-01', // New King James Version
  web: '9879dbb7cfe39e4d-01',  // World English Bible
  msg: '6f11a7de016f942e-01', // The Message
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const translationParam = (searchParams.get('translation') || 'kjv').toLowerCase();
    const bookId = searchParams.get('book')?.toUpperCase();
    const chapter = searchParams.get('chapter');

    console.log('📡 API Route called:', { translationParam, bookId, chapter });

    if (!bookId || !chapter) {
      return NextResponse.json(
        { success: false, error: 'Missing book or chapter parameters' },
        { status: 400 }
      );
    }

    // Resolve the internal system mapping identifier
    const targetBibleId = BIBLE_ID_MAP[translationParam] || translationParam;

    const apiKey = process.env.BIBLE_API_KEY;
    if (!apiKey) {
      console.error('❌ BIBLE_API_KEY environment variable missing');
      return NextResponse.json(
        { success: false, error: 'BIBLE_API_KEY not configured on server' },
        { status: 500 }
      );
    }

    // Format syntax context: Path demands target Bible ID, and target segment sequence token (e.g., JHN.3)
    const url = `https://api.scripture.api.bible/v1/bibles/${targetBibleId}/chapters/${bookId}.${chapter}`;
    console.log('📡 Fetching from Scripture API.Bible:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'api-key': apiKey,
      },
      next: { revalidate: 86400 }, // 24 hours caching layer
    });

    console.log('📡 API.Bible response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API.Bible error response:', errorText);
      return NextResponse.json(
        { success: false, error: `API.Bible upstream error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ API.Bible success: Context Payload Assembled');

    return NextResponse.json({ success: true, data: data.data });

  } catch (error) {
    console.error('❌ Core Route operational failure:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}