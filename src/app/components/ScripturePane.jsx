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
    if (verse.number && verse.number > 0) return parseInt(verse.number, 10);
    if (verse.verse && verse.verse > 0) return parseInt(verse.verse, 10);
    
    if (Array.isArray(verse.text)) {
      for (const item of verse.text) {
        if (typeof item === 'string') {
          const match = item.match(/^(\d+)/);
          if (match) return parseInt(match[1], 10);
        }
      }
    }
    
    if (verse.number && typeof verse.number === 'object') {
      return parseInt(verse.number.number || 0, 10);
    }
    
    return 0;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Verses - No header */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {scriptureData.verses.map((verse, index) => {
          const verseNumber = getVerseNumber(verse);
          const verseText = getVerseText(verse);
          
          // Force conversion of variables to base-10 Integers to avoid string vs number matching failure
          const parsedHighlightVerse = highlightVerse ? parseInt(highlightVerse, 10) : null;
          const isHighlighted = parsedHighlightVerse !== null && verseNumber === parsedHighlightVerse;
          
          if (!verseText) return null;
          
          return (
            <div 
              key={index} 
              style={{
                display: 'flex',
                gap: '8px',
                lineHeight: '1.8',
                padding: isHighlighted ? '6px 10px' : '0',
                margin: isHighlighted ? '0 -8px' : '0',
                borderRadius: isHighlighted ? '8px' : '0',
                backgroundColor: isHighlighted ? 'rgb(225, 171, 10)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              <sup 
                style={{
                  fontSize: '12px',
                  marginTop: '2px',
                  minWidth: '20px',
                  textAlign: 'right',
                  color: isHighlighted ? '#ffffff' : 'var(--text-muted, #6a6a6a)',
                  fontWeight: isHighlighted ? 'bold' : 'normal',
                  userSelect: 'none'
                }}
              >
                {verseNumber || index + 1}
              </sup>
              <span 
                style={{
                  color: isHighlighted ? '#ffffff' : 'var(--text-primary, #e5e5e5)',
                  fontSize: '15px',
                  fontWeight: isHighlighted ? '500' : 'normal'
                }}
              >
                {verseText}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}