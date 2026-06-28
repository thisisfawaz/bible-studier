// src/app/components/CommentaryPane.jsx
"use client";

import { useState } from 'react';

export default function CommentaryPane({ commentaryData, isLoading = false, className = '' }) {
  const [expandedNotes, setExpandedNotes] = useState({});

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="loading-spinner-small"></div>
          <p className="text-sm text-gray-400">Loading Commentary...</p>
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

  if (!commentaryData || !commentaryData.notes || commentaryData.notes.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <p className="text-sm text-gray-400">No commentary available.</p>
      </div>
    );
  }

  const toggleNote = (index) => {
    setExpandedNotes(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Group notes by verse ranges
  const groupedNotes = [];
  let currentGroup = null;

  commentaryData.notes.forEach((note, index) => {
    const verseMatch = note.verses?.match(/\d+/);
    const verseNum = verseMatch ? parseInt(verseMatch[0]) : index + 1;
    
    if (!currentGroup) {
      currentGroup = { start: verseNum, end: verseNum, notes: [note], indices: [index] };
    } else if (verseNum === currentGroup.end + 1) {
      currentGroup.end = verseNum;
      currentGroup.notes.push(note);
      currentGroup.indices.push(index);
    } else {
      groupedNotes.push(currentGroup);
      currentGroup = { start: verseNum, end: verseNum, notes: [note], indices: [index] };
    }
  });
  if (currentGroup) {
    groupedNotes.push(currentGroup);
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex-1 overflow-y-auto space-y-3">
        {groupedNotes.map((group, groupIndex) => {
          const isExpanded = expandedNotes[groupIndex] || false;
          const verseRange = group.start === group.end 
            ? `Verse ${group.start}` 
            : `Verses ${group.start}-${group.end}`;
          
          return (
            <div
              key={groupIndex}
              className={`commentary-item ${isExpanded ? 'expanded' : ''}`}
              style={{
                background: isExpanded ? '#18181c' : 'transparent',
                borderRadius: '8px',
                border: isExpanded ? '1px solid rgba(255,255,255,0.06)' : 'none',
                overflow: 'hidden',
                transition: 'all 0.2s',
                maxWidth: '100%',
                marginBottom: '12px',
                padding: isExpanded ? '6px 10px 10px 10px' : '0'
              }}
            >
              <button
                onClick={() => toggleNote(groupIndex)}
                className="commentary-toggle"
                style={{
                  width: 'auto',
                  padding: '4px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: 'var(--font)',
                  transition: 'all 0.2s',
                  minHeight: '28px',
                  color: '#f7f4ef'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <span className="commentary-label" style={{
                  fontSize: '11px',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  color: '#f7f4ef'
                }}>
                  {verseRange}
                </span>
                <span style={{
                  fontSize: '10px',
                  color: '#6a6a6a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  {isExpanded ? 'Hide' : 'View'}
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="10" 
                    height="10" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{
                      transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </button>
              
              {isExpanded && (
                <div className="commentary-content" style={{
                  padding: '8px 4px 4px 4px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  marginTop: '6px'
                }}>
                  {group.notes.map((note, idx) => (
                    <div 
                      key={idx} 
                      style={{
                        fontSize: '14px',
                        lineHeight: '1.8',
                        marginBottom: '6px',
                        color: '#c8c8d0'
                      }}
                    >
                      {note.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        /* Dark mode - default */
        .commentary-item {
          background: transparent;
          border: none;
          max-width: 100%;
        }
        
        .commentary-item.expanded {
          background: #18181c;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .commentary-toggle {
          color: #f7f4ef;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .commentary-toggle:hover {
          border-color: rgba(255, 255, 255, 0.3);
        }

        .commentary-label {
          color: #f7f4ef;
        }

        .commentary-content {
          color: #c8c8d0;
        }

        .commentary-content div {
          color: #c8c8d0;
        }

        /* Light mode */
        :global(.app.light) .commentary-item {
          background: transparent;
          border: none;
        }
        
        :global(.app.light) .commentary-item.expanded {
          background: #ffffff !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        
        :global(.app.light) .commentary-toggle {
          color: #1a1a24 !important;
          border-color: rgba(0, 0, 0, 0.15) !important;
        }
        
        :global(.app.light) .commentary-toggle:hover {
          border-color: rgba(0, 0, 0, 0.3) !important;
        }
        
        :global(.app.light) .commentary-label {
          color: #1a1a24 !important;
        }
        
        :global(.app.light) .commentary-content {
          color: #4a4a5e !important;
        }
        
        :global(.app.light) .commentary-content div {
          color: #4a4a5e !important;
        }

        :global(.app.light) .commentary-item .commentary-divider {
          border-color: rgba(0, 0, 0, 0.08);
        }
      `}</style>
    </div>
  );
}