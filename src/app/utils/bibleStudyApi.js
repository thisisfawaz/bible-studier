// src/app/utils/bibleStudyApi.js

// ============================================================
// API CONFIG
// ============================================================

const BASE_URL = 'https://bible.helloao.org/api';
const DEFAULT_TRANSLATION = 'BSB';
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

export async function fetchStudyPackage(bookId, chapterNum, translation = DEFAULT_TRANSLATION, commentary = DEFAULT_COMMENTARY) {
  const normalizedBookId = bookId.toUpperCase().padStart(3, ' ');
  
  const scriptureUrl = `${BASE_URL}/${translation}/${normalizedBookId}/${chapterNum}.json`;
  const commentaryUrl = `${BASE_URL}/c/${commentary}/${normalizedBookId}/${chapterNum}.json`;

  try {
    const [scriptureData, commentaryData] = await Promise.all([
      fetchWithCache(scriptureUrl),
      fetchWithCache(commentaryUrl),
    ]);

    // Parse scripture data
    let scripture = null;
    if (scriptureData) {
      try {
        // The API has chapter.content as an array of verse objects
        const verses = scriptureData.chapter?.content?.map((v) => ({
          number: v.verse || v.number || 0,
          text: v.text || v.content || '',
          original: v.original || '',
        })) || [];

        scripture = {
          translation: scriptureData.translation?.name || translation,
          translationId: scriptureData.translation?.id || translation,
          book: scriptureData.book?.name || '',
          bookId: scriptureData.book?.id || normalizedBookId,
          chapter: scriptureData.chapter?.number || chapterNum,
          verses: verses,
          totalVerses: scriptureData.numberOfVerses || verses.length,
          reference: {
            translation: scriptureData.translation?.id || translation,
            book: scriptureData.book?.id || normalizedBookId,
            chapter: scriptureData.chapter?.number || chapterNum,
          },
          previousChapter: scriptureData.previousChapterReference || null,
          nextChapter: scriptureData.nextChapterReference || null,
          audioLinks: scriptureData.thisChapterAudioLinks || null,
        };
      } catch (e) {
        console.warn('[BibleAPI] Error parsing scripture:', e);
      }
    }

    // Parse commentary data
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
// UTILITY: Available commentaries
// ============================================================

export function getAvailableCommentaries() {
  return ['tyndale', 'matthew-henry', 'adam-clarke'];
}