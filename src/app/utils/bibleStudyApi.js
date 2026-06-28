// src/app/utils/bibleStudyApi.js

// ============================================================
// API CONFIG
// ============================================================

const DEFAULT_TRANSLATION = 'kjv';  // King James Version (Open Access)
const DEFAULT_COMMENTARY = 'tyndale';

// ============================================================
// UTILITY: Fetch with 24-hour caching
// ============================================================

async function fetchWithCache(url, revalidateTime = 86400) {
  try {
    const response = await fetch(url, {
      next: { revalidate: revalidateTime },
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`[BibleAPI] Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn(`[BibleAPI] Error fetching ${url}:`, error);
    return null;
  }
}

// ============================================================
// MAIN: Fetch Both Scripture and Commentary
// ============================================================

export async function fetchStudyPackage(bookId, chapterNum, translation = 'kjv', commentary = DEFAULT_COMMENTARY) {
  const normalizedBookId = bookId.toUpperCase();
  
  // Use our local API route instead of calling API.Bible directly
  const scriptureUrl = `/api/bible?translation=${translation}&book=${normalizedBookId}&chapter=${chapterNum}`;
  const commentaryUrl = `https://bible.helloao.org/api/c/${commentary}/${normalizedBookId}/${chapterNum}.json`;

  console.log('📡 Fetching scripture from:', scriptureUrl);
  console.log('📡 Fetching commentary from:', commentaryUrl);

  try {
    const [scriptureData, commentaryData] = await Promise.all([
      fetchWithCache(scriptureUrl),
      fetchWithCache(commentaryUrl),
    ]);

    console.log('📡 Scripture data received:', scriptureData ? 'Yes' : 'No');
    console.log('📡 Commentary data received:', commentaryData ? 'Yes' : 'No');

    // Parse API.Bible scripture data
    let scripture = null;
    if (scriptureData && scriptureData.success && scriptureData.data) {
      try {
        const data = scriptureData.data;
        
        // API.Bible returns verses in different structures
        let verses = [];
        if (data.verses && Array.isArray(data.verses)) {
          verses = data.verses.map((v) => ({
            number: v.verse || v.number || 0,
            text: v.text || v.content || '',
            original: v.original || '',
          }));
        } else if (data.content) {
          // Use DOMParser to parse HTML
          const parser = new DOMParser();
          const doc = parser.parseFromString(data.content, 'text/html');
          const verseSpans = doc.querySelectorAll('span[data-number]');
          
          verseSpans.forEach((span) => {
            const verseNum = parseInt(span.getAttribute('data-number'));
            let text = '';
            let next = span.nextSibling;
            while (next && !(next.nodeType === 1 && next.hasAttribute('data-number'))) {
              if (next.nodeType === 3) {
                text += next.textContent;
              } else if (next.nodeType === 1) {
                text += next.textContent || '';
              }
              next = next.nextSibling;
            }
            text = text.trim();
            if (verseNum && text) {
              verses.push({
                number: verseNum,
                text: text,
                original: '',
              });
            }
          });
          
          // Fallback regex if DOMParser fails
          if (verses.length === 0) {
            const regex = /data-number="(\d+)"[^>]*>.*?<\/span>([^<]*)/gs;
            let match;
            while ((match = regex.exec(data.content)) !== null) {
              const verseNum = parseInt(match[1]);
              const verseText = match[2].replace(/<[^>]*>/g, '').trim();
              if (verseNum && verseText) {
                verses.push({
                  number: verseNum,
                  text: verseText,
                  original: '',
                });
              }
            }
          }
        }

        scripture = {
          translation: data.bible?.name || translation,
          translationId: data.bible?.id || translation,
          book: data.book?.name || '',
          bookId: data.book?.id || normalizedBookId,
          chapter: data.chapter || chapterNum,
          verses: verses,
          reference: data.reference || `${data.book?.name} ${data.chapter}`,
          raw: scriptureData,
        };
        
        console.log('📡 Parsed verses:', verses.length);
        
      } catch (e) {
        console.warn('[BibleAPI] Error parsing scripture:', e);
      }
    }

    // Parse commentary data (same as before)
    let commentaryResult = null;
    if (commentaryData) {
      try {
        const notes = commentaryData.notes?.map((n) => ({
          title: n.title || n.heading || 'Note',
          verses: n.verses || n.ref || '',
          content: n.content || n.text || '',
        })) || [];

        commentaryResult = {
          commentary: commentaryData.commentary?.name || commentary,
          commentaryId: commentaryData.commentary?.id || commentary,
          book: commentaryData.book?.name || '',
          bookId: commentaryData.book?.id || normalizedBookId,
          chapter: commentaryData.chapter?.number || chapterNum,
          notes: notes,
          raw: commentaryData,
        };
      } catch (e) {
        console.warn('[BibleAPI] Error parsing commentary:', e);
      }
    }

    return {
      scripture,
      commentary: commentaryResult,
    };

  } catch (error) {
    console.error('[BibleAPI] Error in fetchStudyPackage:', error);
    return {
      scripture: null,
      commentary: null,
      error: error.message || 'Unknown error',
    };
  }
}

// ============================================================
// UTILITY: Get book name from ID
// ============================================================

export function getBookName(bookId) {
  const names = {
    'GEN': 'Genesis', 'EXO': 'Exodus', 'LEV': 'Leviticus',
    'NUM': 'Numbers', 'DEU': 'Deuteronomy', 'JOS': 'Joshua',
    'JDG': 'Judges', 'RUT': 'Ruth', '1SA': '1 Samuel',
    '2SA': '2 Samuel', '1KI': '1 Kings', '2KI': '2 Kings',
    '1CH': '1 Chronicles', '2CH': '2 Chronicles', 'EZR': 'Ezra',
    'NEH': 'Nehemiah', 'EST': 'Esther', 'JOB': 'Job',
    'PSA': 'Psalms', 'PRO': 'Proverbs', 'ECC': 'Ecclesiastes',
    'SNG': 'Song of Solomon', 'ISA': 'Isaiah', 'JER': 'Jeremiah',
    'LAM': 'Lamentations', 'EZK': 'Ezekiel', 'DAN': 'Daniel',
    'HOS': 'Hosea', 'JOL': 'Joel', 'AMO': 'Amos',
    'OBA': 'Obadiah', 'JON': 'Jonah', 'MIC': 'Micah',
    'NAM': 'Nahum', 'HAB': 'Habakkuk', 'ZEP': 'Zephaniah',
    'HAG': 'Haggai', 'ZEC': 'Zechariah', 'MAL': 'Malachi',
    'MAT': 'Matthew', 'MRK': 'Mark', 'LUK': 'Luke',
    'JHN': 'John', 'ACT': 'Acts', 'ROM': 'Romans',
    '1CO': '1 Corinthians', '2CO': '2 Corinthians', 'GAL': 'Galatians',
    'EPH': 'Ephesians', 'PHP': 'Philippians', 'COL': 'Colossians',
    '1TH': '1 Thessalonians', '2TH': '2 Thessalonians', '1TI': '1 Timothy',
    '2TI': '2 Timothy', 'TIT': 'Titus', 'PHM': 'Philemon',
    'HEB': 'Hebrews', 'JAS': 'James', '1PE': '1 Peter',
    '2PE': '2 Peter', '1JN': '1 John', '2JN': '2 John',
    '3JN': '3 John', 'JUD': 'Jude', 'REV': 'Revelation'
  };
  return names[bookId] || bookId;
}

// ============================================================
// UTILITY: Available translations
// ============================================================

export function getAvailableTranslations() {
  return [
    { id: 'kjv', name: 'King James Version' },
    { id: 'niv', name: 'New International Version' },
    { id: 'msg', name: 'The Message' },
    { id: 'amp', name: 'Amplified Bible' },
    //{ id: 'nlt', name: 'New Living Translation' },
    //{ id: 'nkjv', name: 'New King James Version' },
    { id: 'web', name: 'World English Bible' },
    //{ id: 'nasb', name: 'New American Standard Bible' },
    //{ id: 'csb', name: 'Christian Standard Bible' },
    //{ id: 'bsb', name: 'Berean Standard Bible' },
  ];
}

// ============================================================
// UTILITY: Available commentaries
// ============================================================

export function getAvailableCommentaries() {
  return ['tyndale', 'matthew-henry', 'adam-clarke'];
}