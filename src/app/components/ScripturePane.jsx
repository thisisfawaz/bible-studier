// src/app/components/ScripturePane.jsx
"use client";

export default function ScripturePane({ scriptureData, isLoading = false, highlightVerse = null, className = '' }) {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="loading-spinner-small"></div>
          <p className="text-sm text-gray-400">Loading Scripture...</p>
          <style jsx>{`
            .loading-spinner-small {
              width: 32px;
              height: 32px;
              border: 2px solid rgba(255,255,255,0.1);
              border-top-color: #7c3aed;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!scriptureData || !scriptureData.verses || scriptureData.verses.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <p className="text-sm text-gray-400">No scripture found.</p>
      </div>
    );
  }

  // Helper function to extract text from verse content
  const getVerseText = (verse) => {
    let content = verse.text || verse.content || '';
    
    if (Array.isArray(content)) {
      let result = '';
      for (const item of content) {
        if (typeof item === 'string') {
          const cleanText = item.replace(/^\d+\s*/, '');
          result += cleanText;
        } else if (typeof item === 'object' && item !== null) {
          result += item.text || item.content || '';
        }
      }
      return result.trim();
    }
    
    if (typeof content === 'object' && content !== null) {
      return content.text || content.content || '';
    }
    
    return content || '';
  };

  // Helper to get verse number
  const getVerseNumber = (verse) => {
    if (verse.number && verse.number > 0) return verse.number;
    if (verse.verse && verse.verse > 0) return verse.verse;
    
    if (Array.isArray(verse.text)) {
      for (const item of verse.text) {
        if (typeof item === 'string') {
          const match = item.match(/^(\d+)/);
          if (match) return parseInt(match[1]);
        }
      }
    }
    
    if (verse.number && typeof verse.number === 'object') {
      return verse.number.number || 0;
    }
    
    return 0;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-gray-700/40">
        <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400">
          {scriptureData.translation || 'BSB'}
        </h2>
        <h1 className="text-lg font-semibold text-white">
          {scriptureData.book} {scriptureData.chapter}
          {highlightVerse && <span className="text-purple-400 text-sm ml-2">(Verse {highlightVerse})</span>}
        </h1>
      </div>

      {/* Verses */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {scriptureData.verses.map((verse, index) => {
          const verseNumber = getVerseNumber(verse);
          const verseText = getVerseText(verse);
          const isHighlighted = highlightVerse && verseNumber === highlightVerse;
          
          if (!verseText) return null;
          
          return (
            <div 
              key={index} 
              className={`flex gap-2 leading-relaxed ${isHighlighted ? 'bg-yellow-400 text-black font-bold rounded-lg p-2 -mx-2 border-l-4 border-red-600' : ''}`}
            >
              <sup className={`text-xs font-mono mt-0.5 min-w-[20px] text-right select-none ${isHighlighted ? 'text-purple-400 font-bold' : 'text-gray-500'}`}>
                {verseNumber || index + 1}
              </sup>
              <span className={`${isHighlighted ? 'text-white font-medium' : 'text-gray-100'} font-serif text-[15px]`}>
                {verseText}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}