"use client";

import { useState, useEffect, useRef } from 'react';
import ReelsFeed from './components/ReelsFeed';
import { fetchStudyPackage, getBookName, getAvailableTranslations } from '@/app/utils/bibleStudyApi';
import ScripturePane from '@/app/components/ScripturePane';
import CommentaryPane from '@/app/components/CommentaryPane';

// Helper: Parse scripture reference from user input
function parseScriptureReference(input) {
  // Try formats: "Book Chapter:Verse", "Book Chapter Verse", "Book Chapter"
  const patterns = [
    // Book Chapter:Verse (e.g., "John 3:16")
    /^(.*?)\s+(\d+):(\d+)$/,
    // Book Chapter Verse (e.g., "John 3 16")
    /^(.*?)\s+(\d+)\s+(\d+)$/,
    // Book Chapter (e.g., "John 3")
    /^(.*?)\s+(\d+)$/,
    // Book only (e.g., "John")
    /^(.*?)$/
  ];
  
  for (const pattern of patterns) {
    const match = input.trim().match(pattern);
    if (match) {
      const bookName = match[1].trim();
      const chapter = match[2] ? parseInt(match[2]) : null;
      const verse = match[3] ? parseInt(match[3]) : null;
      
      // Find book ID from name
      const bookIds = ['GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH','EST','JOB','PSA','PRO','ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO','OBA','JON','MIC','NAM','HAB','ZEP','HAG','ZEC','MAL','MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'];
      
      let foundBookId = null;
      for (const id of bookIds) {
        const name = getBookName(id);
        if (name.toLowerCase() === bookName.toLowerCase() ||
            id.toLowerCase() === bookName.toLowerCase()) {
          foundBookId = id;
          break;
        }
      }
      
      // Try partial match if exact match not found
      if (!foundBookId) {
        for (const id of bookIds) {
          const name = getBookName(id);
          if (name.toLowerCase().includes(bookName.toLowerCase()) ||
              bookName.toLowerCase().includes(name.toLowerCase())) {
            foundBookId = id;
            break;
          }
        }
      }
      
      if (foundBookId) {
        return {
          bookId: foundBookId,
          chapter: chapter || 1,
          verse: verse || null  // Now capturing the verse
        };
      }
    }
  }
  return null;
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================
function renderInlineContent(text) {
  if (!text) return "";

  const parts = [];
  let remaining = text;
  let boldRegex = /\*\*(.*?)\*\"/g;
  let match;
  let lastIndex = 0;

  while ((match = boldRegex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push(remaining.substring(lastIndex, match.index));
    }
    parts.push(<strong key={`bold-${match.index}`}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < remaining.length) {
    parts.push(remaining.substring(lastIndex));
  }

  if (parts.length === 0) {
    return text;
  }

  return parts;
}

function renderMessage(text) {
  if (!text) return "";

  let processedText = text;
  
  if (!processedText.includes('\n\n')) {
    const lines = processedText.split('\n').filter(line => line.trim());
    const paragraphs = [];
    let currentParagraph = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const isBullet = line.startsWith('-') || line.startsWith('•') || line.startsWith('*');
      const isBoldHeading = line.startsWith('**') && line.includes('**:');
      const isShortLine = line.length < 30 && !isBullet;
      const isNewParagraph = isBullet || isBoldHeading || 
                            (isShortLine && i > 0 && lines[i-1].length > 30) ||
                            (line.match(/^[A-Z]/) && i > 0 && lines[i-1].length > 30);
      
      if (isNewParagraph && currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
      
      currentParagraph.push(line);
    }
    
    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(' '));
    }
    
    processedText = paragraphs.join('\n\n');
  }
  
  const paragraphs = processedText.split(/\n\n/).filter(p => p.trim());
  
  return paragraphs.map((paragraph, index) => {
    if (paragraph.includes('•') || paragraph.includes('-')) {
      const lines = paragraph.split('\n');
      return (
        <div key={index} className="msg-paragraph" style={{ marginBottom: '25px', lineHeight: '1.8' }}>
          {lines.map((line, i) => {
            const cleanLine = line.replace(/^[•\-]\s*/, '').trim();
            if (cleanLine) {
              return (
                <div key={i} className="flex items-start gap-2 mb-1">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span className="flex-1">{renderInlineContent(cleanLine)}</span>
                </div>
              );
            }
            return null;
          })}
        </div>
      );
    }
    
    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
      return (
        <p key={index} className="msg-paragraph" style={{ marginBottom: '25px', lineHeight: '1.8', fontWeight: 'bold', fontSize: '18px' }}>
          {renderInlineContent(paragraph.replace(/\*\*/g, ''))}
        </p>
      );
    }
    
    if (paragraph.includes('**:')) {
      const parts = paragraph.split('**:');
      if (parts.length === 2) {
        return (
          <p key={index} className="msg-paragraph" style={{ marginBottom: '25px', lineHeight: '1.8' }}>
            <strong>{parts[0].replace('**', '')}:</strong>{renderInlineContent(parts[1])}
          </p>
        );
      }
    }
    
    return (
      <p key={index} className="msg-paragraph" style={{ marginBottom: '15px', lineHeight: '1.8' }}>
        {renderInlineContent(paragraph)}
      </p>
    );
  });
}

// ============================================================
// HOME COMPONENT
// ============================================================
export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('devotions');
  const [darkMode, setDarkMode] = useState(true);
  const [showReels, setShowReels] = useState(false);

  const [chatSessions, setChatSessions] = useState([
    {
      id: 1,
      title: "New Chat",
      date: "Just now",
      active: true,
      messages: []
    },
  ]);

  const [currentSessionId, setCurrentSessionId] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [dailyDevotion, setDailyDevotion] = useState(null);
  const [recentDevotions, setRecentDevotions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);

  const [selectedDevotionId, setSelectedDevotionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

   // ===== Study Bible State =====
  const [studyData, setStudyData] = useState(null);
  const [studyLoading, setStudyLoading] = useState(false);
  const [studyBook, setStudyBook] = useState('GEN');
  const [studyChapter, setStudyChapter] = useState(1);
  const [recentScriptures, setRecentScriptures] = useState([]);
  const [studyBookInput, setStudyBookInput] = useState('Genesis');
  const [showBookSuggestions, setShowBookSuggestions] = useState(false);
  const [bookSuggestions, setBookSuggestions] = useState([]);
  const [studySearchInput, setStudySearchInput] = useState('Genesis 1');
  const [studyVerse, setStudyVerse] = useState(null);
  const [studyTranslation, setStudyTranslation] = useState('kjv');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const isLoadingFromSidebarRef = useRef(false);
  const isNavigatingRef = useRef(false);
  const isTranslationChangeRef = useRef(false);

  const currentSession = chatSessions.find(s => s.id === currentSessionId);
  const messages = currentSession ? currentSession.messages : [];

  const updateMessages = (newMessages) => {
    setChatSessions(prev => prev.map(session =>
      session.id === currentSessionId
        ? { ...session, messages: newMessages }
        : session
    ));
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updateUrl = (devotionId) => {
    const url = new URL(window.location);
    if (devotionId && devotionId !== 'daily' && devotionId !== null) {
      url.searchParams.set('devotion', devotionId);
    } else {
      url.searchParams.delete('devotion');
    }
    window.history.replaceState({}, '', url);
  };

  const selectDevotion = (id) => {
    setSelectedDevotionId(id);
    setActiveTab('devotions');
    updateUrl(id);
  };

  useEffect(() => {
    async function loadDailyDevotion() {
      try {
        const response = await fetch('/api/devotion', { cache: 'no-store' });
        const data = await response.json();
        console.log('📖 Devotion data:', data);
        
        if (data.success) {
          setDailyDevotion(data.today);
          setRecentDevotions(data.recent || []);
          
          const params = new URLSearchParams(window.location.search);
          const devotionParam = params.get('devotion');
          if (devotionParam) {
            const foundRecent = data.recent?.find(d => d.timestamp === devotionParam || d.id === devotionParam);
            if (foundRecent) {
              setSelectedDevotionId(devotionParam);
              return;
            }
          }
          
          if (data.today) {
            const id = data.today.id || data.today.timestamp || 'daily';
            setSelectedDevotionId(id);
          } else if (data.recent && data.recent.length > 0) {
            const mostRecent = data.recent[0];
            const id = mostRecent.id || mostRecent.timestamp || 'daily';
            setSelectedDevotionId(id);
          }
        }
      } catch (err) {
        console.error('Failed to load devotion:', err);
      } finally {
        setIsGenerating(false);
      }
    }
    loadDailyDevotion();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/devotion', { cache: 'no-store' });
        const data = await response.json();
        if (data.success) {
          setDailyDevotion(data.today);
          setRecentDevotions(data.recent || []);
          if (data.today) {
            const id = data.today.id || data.today.timestamp || 'daily';
            setSelectedDevotionId(id);
          }
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const devotionParam = params.get('devotion');
    if (devotionParam) {
      const foundRecent = recentDevotions.find(d => d.timestamp === devotionParam || d.id === devotionParam);
      if (foundRecent) {
        setSelectedDevotionId(devotionParam);
        setActiveTab('devotions');
      }
    }
  }, [recentDevotions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ===== TEST: Bible Study API =====
  useEffect(() => {
    async function testStudy() {
      console.log('🧪 Testing Study Bible...');
      const result = await fetchStudyPackage('JHN', 3);
      console.log('📖 Study result:', result);
    }
    testStudy();
  }, []);

  // ===== NEW: Load Study Bible data =====
    useEffect(() => {
    // If loading from sidebar, navigating, or translation change, skip this useEffect
    if (isLoadingFromSidebarRef.current || isNavigatingRef.current || isTranslationChangeRef.current) {
      isTranslationChangeRef.current = false; // Reset the flag
      return;
    }
    
    async function loadStudy() {
      setStudyLoading(true);
      try {
        const result = await fetchStudyPackage(studyBook, studyChapter, studyTranslation);
        setStudyData(result);
        
        const bookName = getBookName(studyBook);
        if (bookName) {
          setStudyBookInput(bookName);
        }
      } catch (error) {
        console.error('Error loading study:', error);
      } finally {
        setStudyLoading(false);
      }
    }
    loadStudy();
  }, [studyBook, studyChapter, studyTranslation, studyVerse]);

  const getSelectedDevotion = () => {
    if (selectedDevotionId === 'daily' && dailyDevotion) {
      return dailyDevotion;
    }
    if (selectedDevotionId !== null && typeof selectedDevotionId === 'string' && selectedDevotionId !== 'daily') {
      let found = recentDevotions.find(d => d.id === selectedDevotionId);
      if (!found) {
        found = recentDevotions.find(d => d.timestamp === selectedDevotionId);
      }
      if (found) return found;
    }
    return null;
  };

  const selectedDevotion = getSelectedDevotion();

  // ===== LOAD STUDY DATA FUNCTION =====
  const loadStudyData = async (bookId, chapter, verse = null, skipRecent = false, skipLoading = false) => {
  // Only show loading if skipLoading is false
  if (!skipLoading) {
    setStudyLoading(true);
  }
  
  try {
    const result = await fetchStudyPackage(bookId, chapter, studyTranslation);
    setStudyData(result);
    
    const bookName = getBookName(bookId);
    const scriptureRef = verse ? `${bookName} ${chapter}:${verse}` : `${bookName} ${chapter}`;
    
    // Only add to recent if skipRecent is false
    if (!skipRecent) {
      setRecentScriptures(prev => {
        const filtered = prev.filter(item => item !== scriptureRef);
        return [scriptureRef, ...filtered].slice(0, 20);
      });
    }
    
    if (bookName) {
      setStudyBookInput(bookName);
      const displayRef = verse ? `${bookName} ${chapter}:${verse}` : `${bookName} ${chapter}`;
      setStudySearchInput(displayRef);
    }
    
    if (verse) {
      setStudyVerse(verse);
    } else {
      setStudyVerse(null);
    }
  } catch (error) {
    console.error('Error loading study:', error);
  } finally {
    setStudyLoading(false);
    isLoadingFromSidebarRef.current = false;
  }
};
// ===== END LOAD STUDY DATA =====

  if (!isMounted) {
    return <div style={{ backgroundColor: '#101012', minHeight: '100vh' }} />;
  }

  const handleSendMessage = async (userMessage) => {
    const updatedMessages = [...messages, { text: userMessage, isUser: true }];
    updateMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({
              role: m.isUser ? 'user' : 'assistant',
              content: m.text
            })),
            { role: 'user', content: userMessage }
          ]
        })
      });

      const data = await response.json();
      if (response.ok) {
        const finalMessages = [...updatedMessages, { text: data.reply, isUser: false }];
        updateMessages(finalMessages);

        if (messages.length === 0) {
          const newTitle = userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '');
          setChatSessions(prev => prev.map(session =>
            session.id === currentSessionId
              ? { ...session, title: newTitle }
              : session
          ));
        }
      } else {
        const errorMessages = [...updatedMessages, { text: `Error: ${data.error || 'Something went wrong'}`, isUser: false }];
        updateMessages(errorMessages);
      }
    } catch (error) {
      const errorMessages = [...updatedMessages, { text: 'Error: Could not connect to the AI. Please try again.', isUser: false }];
      updateMessages(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    const newId = Math.max(...chatSessions.map(s => s.id), 0) + 1;
    const newSession = {
      id: newId,
      title: "New Chat",
      date: "Just now",
      active: true,
      messages: []
    };
    setChatSessions(prev => [
      ...prev.map(s => ({ ...s, active: false })),
      newSession
    ]);
    setCurrentSessionId(newId);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const switchChat = (id) => {
    setChatSessions(prev => prev.map(s => ({ ...s, active: s.id === id })));
    setCurrentSessionId(id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleDownloadPDF = async (devotion) => {
    try {
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devotion })
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${devotion.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleShare = async (devotion) => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/?devotion=${devotion.id || devotion.timestamp}`;
    const text = `📖 ${devotion.title}\n\n${devotion.scripture}\n\nRead the full devotion at Bible Studier`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: devotion.title,
          text: text,
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n\n${shareUrl}`);
        alert('Link copied to clipboard! Share it with your friends.');
      } catch (err) {
        console.error('Copy failed:', err);
        prompt('Copy this link to share:', `${text}\n\n${shareUrl}`);
      }
    }
  };

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <style jsx>{`
        .app {
          --bg-primary: #101012;
          --bg-secondary: #0a0a0c;
          --bg-card: #18181c;
          --bg-hover: rgba(255,255,255,0.04);
          --bg-active: rgba(255,255,255,0.06);
          --text-primary: #f7f4ef;
          --text-secondary: #a3a3a3;
          --text-muted: #6a6a6a;
          --border-color: rgba(255,255,255,0.06);
          --border-light: rgba(255,255,255,0.1);
          --accent-pink: #fd429c;
          --accent-purple: #7f22fe;
          --accent-gradient: linear-gradient(135deg, #fd429c, #7f22fe);
          --shadow: rgba(0,0,0,0.5);
          --radius: 12px;
          --radius-full: 9999px;
          --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          
          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: var(--font);
          display: flex;
          height: 100vh;
          overflow: hidden;
          transition: background 0.3s ease, color 0.3s ease;
        }

        .app.light {
          --bg-primary: #f0f0f2;
          --bg-secondary: #ffffff;
          --bg-card: #ffffff;
          --bg-hover: rgba(0,0,0,0.04);
          --bg-active: rgba(0,0,0,0.06);
          --text-primary: #1a1a24;
          --text-secondary: #4a4a5e;
          --text-muted: #8a8a9e;
          --border-color: rgba(0,0,0,0.1);
          --border-light: rgba(0,0,0,0.18);
          --shadow: rgba(0,0,0,0.06);
          --accent-pink: #fd429c;
          --accent-purple: #7c22fe;
          --accent-gradient: linear-gradient(135deg, #fd429c, #7c22fe);
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 9999px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        .app.light ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); }
        .app.light ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.25); }

        .hamburger-btn {
          display: none;
          flex-direction: column;
          gap: 4px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          width: 28px;
          height: 28px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .hamburger-line {
          width: 20px;
          height: 2px;
          background: var(--text-primary);
          border-radius: 2px;
          transition: all 0.25s ease;
        }
        .hamburger-btn.open .hamburger-line:nth-child(1) {
          transform: rotate(45deg) translate(4px, 4px);
        }
        .hamburger-btn.open .hamburger-line:nth-child(2) {
          opacity: 0;
        }
        .hamburger-btn.open .hamburger-line:nth-child(3) {
          transform: rotate(-45deg) translate(4px, -4px);
        }

        .sidebar-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 4px 24px 10px;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 16px;
          flex-shrink: 0;
        }

        .sidebar-close {
          display: none;
          align-items: center;
          justify-content: center;
          padding: 4px 8px;
          font-size: 20px;
          cursor: pointer;
          color: var(--text-secondary);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .sidebar-close:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }

        .sidebar-app-title {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          cursor: pointer;
          transition: opacity 0.2s;
          flex: 1;
        }

        .sidebar-app-title:hover {
          opacity: 0.8;
        }

        .sidebar-app-title .sidebar-bible-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-gradient);
          border-radius: 4px;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
        }

        .sidebar-app-title .sidebar-title-text {
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.02em;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 99;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .sidebar-overlay.open {
          display: block;
          opacity: 1;
        }

        .sidebar {
          width: 260px;
          min-width: 260px;
          background: var(--bg-primary);
          border-right: 1px solid var(--border-color);
          padding: 20px 12px;
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          transition: background 0.3s ease, border-color 0.3s ease;
          overflow: hidden;
        }

        .sidebar-header {
          padding: 0 4px 16px;
          margin-bottom: 16px;
          flex-shrink: 0;
        }

        .sidebar-title {
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
        }

        .new-chat-btn {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px !important;
          border: 1px solid var(--border-color);
          background: #1a1a1f;
          color: #ffffff;
          font-size: 13px;
          font-weight: 450;
          cursor: pointer;
          transition: all 0.2s;
          font-family: var(--font);
          margin-bottom: 4px;
        }
        .new-chat-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--border-light);
        }

        .app.light .new-chat-btn {
          background: #141414;
          color: #ffffff;
          border-color: #a5a5a5;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          padding: 10px 16px;
          font-weight: 500;
        }

        .sidebar-sessions {
          flex: 1;
          overflow-y: auto;
          padding: 0 4px;
          min-height: 0;
        }

        .session-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px !important;
          cursor: pointer;
          transition: all 0.15s;
          color: var(--text-secondary);
          font-size: 13px;
        }
        .session-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .session-item.active {
          background: var(--bg-active);
          color: var(--text-primary);
        }
        .session-item .icon { 
          display: none;
        }
        .session-info { flex: 1; min-width: 0; }
        .session-title { 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis;
          font-size: 13px;
          font-weight: 500;
        }
        .session-item .session-date {
          display: none !important;
        }

        .sidebar-footer {
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
          margin-top: 12px;
          flex-shrink: 0;
        }

        .btn-upgrade {
          display: block;
          text-align: center;
          padding: 8px 16px;
          border-radius: 8px !important;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 450;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 8px;
          width: 100%;
          font-family: var(--font);
        }
        .btn-upgrade:hover {
          background: var(--bg-hover);
          border-color: var(--border-light);
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px !important;
          cursor: pointer;
          transition: background 0.2s;
        }
        .sidebar-user:hover { background: var(--bg-hover); }
        .sidebar-user .avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--accent-gradient);
          flex-shrink: 0;
        }
        .sidebar-user .info { flex: 1; min-width: 0; }
        .sidebar-user .info .name { font-size: 13px; font-weight: 500; line-height: 1.2; }
        .sidebar-user .info .plan { font-size: 11px; color: var(--text-secondary); line-height: 1.2; }

        .devotions-scroll {
          flex: 1;
          overflow-y: auto;
          padding-right: 4px;
          min-height: 0;
        }

        .devotions-scroll::-webkit-scrollbar {
          width: 4px;
        }

        .devotions-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .devotions-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
        }

        .app.light .devotions-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
        }

        .main {
          flex: 1;
          padding: 24px 32px 0;
          width: 100%;
          transition: background 0.3s ease;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          height: 100vh;
        }

        .main-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          min-height: 40px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }

        .main-header .tabs {
          display: flex !important;
          gap: 0 !important;
          background: transparent !important;
          padding: 0 !important;
          border-radius: 0 !important;
          border: none !important;
          border-bottom: 1px solid var(--border-color) !important;
          transition: border-color 0.3s ease !important;
          flex: 1 !important;
          min-width: 0 !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
          scrollbar-width: none !important;
          flex-direction: row !important;
          margin-bottom: 0 !important;
        }
        .main-header .tabs::-webkit-scrollbar {
          display: none !important;
        }

        .main-header .tab-btn {
          flex: none !important;
          padding: 12px 20px !important;
          border: none !important;
          border-radius: 0 !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: all 0.25s ease !important;
          background: transparent !important;
          color: var(--text-secondary) !important;
          font-family: var(--font) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          position: relative !important;
          padding-bottom: 16px !important;
          white-space: nowrap !important;
          box-shadow: none !important;
          width: auto !important;
        }

        .main-header .tab-btn:hover { 
          color: var(--text-primary) !important;
          background: transparent !important;
        }

        .main-header .tab-btn.active {
          color: var(--text-primary) !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .main-header .tab-btn::after {
          content: '' !important;
          position: absolute !important;
          bottom: 0 !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: 0 !important;
          height: 2px !important;
          background: #ffffff !important;
          transition: width 0.3s ease !important;
          border-radius: 2px !important;
        }

        .app.light .main-header .tab-btn::after {
          background: #1a1a24 !important;
        }

        .main-header .tab-btn.active::after {
          width: 60% !important;
        }

        .main-header .tab-btn .icon {
          display: none !important;
        }

        .main-header .tab-btn .icon-label {
          font-size: 14px !important;
        }

        .devotion-card {
          background: var(--bg-card);
          border-radius: var(--radius);
          padding: 24px;
          margin-bottom: 16px;
          border: 1px solid var(--border-color);
          transition: all 0.25s;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 6px;
        }
        .card-category {
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 3px 10px;
          border-radius: var(--radius-full);
          background: rgba(255,255,255,0.04);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }
        .app.light .card-category {
          background: rgba(0,0,0,0.04);
          color: var(--text-secondary);
        }
        .card-category.today {
          background: rgba(255, 255, 255, 0.06);
          color: #a3a3a3;
          border-color: rgba(255, 255, 255, 0.1);
        }
        .app.light .card-category.today {
          background: rgba(0,0,0,0.06);
          color: #6a6a7e;
          border-color: rgba(0,0,0,0.1);
        }
        .card-date {
          font-size: 12px;
          color: var(--text-muted);
        }
        .card-title {
          font-size: 22px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 16px;
          letter-spacing: -0.01em;
        }
        .card-scripture {
          background: rgba(255,255,255,0.03);
          border-left: 3px solid #ffffff;
          padding: 8px 14px;
          margin-bottom: 24px;
          border-radius: 0 6px 6px 0;
          font-size: 14px;
          color: #f7f4ef;
          font-style: italic;
        }
        .app.light .card-scripture {
          background: rgba(0,0,0,0.02);
          border-left: 3px solid #1a1919;
          color: #4a4a5e;
        }
        
        .card-story .story-paragraph {
          margin-bottom: 15px !important;
          line-height: 1.8 !important;
        }
        .card-story .story-paragraph:last-child {
          margin-bottom: 0 !important;
        }
        
        .app.light .card-story .story-paragraph {
        color: #303030;
        }
        .prayer-section {
          background: rgba(255,255,255,0.02);
          border-left: 3px solid #ffffff;
          padding: 12px 16px;
          border-radius: 0 6px 6px 0;
          margin-top: 16px;
        }
        .app.light .prayer-section {
          border-left: 3px solid #1a1919;
          background: rgba(0,0,0,0.02);
        }
        .prayer-title {
          font-size: 13px;
          font-weight: 500;
          color: #ffffff;
          margin-bottom: 4px;
          letter-spacing: 0.02em;
        }
        .app.light .prayer-title {
          color: #1a1919;
        }
        .prayer-text {
          color: #f7f4ef;
          font-size: 14px;
          line-height: 1.7;
          font-style: italic;
        }
        .app.light .prayer-text {
          color: #4a4a5e;
        }

        .action-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
          align-items: center;
        }

        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 13px;
          font-weight: 450;
          transition: all 0.2s;
          font-family: var(--font);
        }
        .action-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--border-light);
        }
        .action-btn .btn-icon {
          width: 18px;
          height: 18px;
          stroke: currentColor;
          stroke-width: 1.5;
          fill: none;
          flex-shrink: 0;
        }
        .action-btn.active {
          background: rgba(124, 58, 237, 0.15);
          color: var(--accent-purple);
          border-color: rgba(124, 58, 237, 0.2);
        }
        .action-btn.active:hover {
          background: rgba(124, 58, 237, 0.2);
        }

        .download-btn {
          margin-top: 12px;
          padding: 8px 16px;
          border-radius: 9999px;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 13px;
          font-weight: 450;
          transition: all 0.2s;
          font-family: var(--font);
        }
        .download-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--border-light);
        }

        .chat-container {
          background: var(--bg-card);
          border-radius: var(--radius);
          border: 1px solid var(--border-color);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          transition: background 0.3s ease, border-color 0.3s ease;
        }
        
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          background: var(--bg-primary);
          transition: background 0.3s ease;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .chat-messages .msg-paragraph {
          margin-bottom: 20px !important;
          line-height: 1.8 !important;
        }
        .chat-messages .msg-paragraph:last-child {
          margin-bottom: 0 !important;
        }

        .welcome-screen {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 20px;
          min-height: 200px;
        }
        .welcome-screen .welcome-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }
        .welcome-screen .welcome-title {
          font-size: 28px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }
        .welcome-screen .welcome-subtitle {
          font-size: 16px;
          color: var(--text-secondary);
          max-width: 480px;
          line-height: 1.6;
        }
        .welcome-screen .welcome-subtitle span {
          color: var(--accent-pink);
        }

        .chat-message {
          display: flex;
          margin-bottom: 12px;
          animation: fadeIn 0.25s ease;
        }
        .chat-message.user { justify-content: flex-end; }
        .chat-message .bubble {
          max-width: 78%;
          padding: 10px 16px;
          border-radius: var(--radius);
          font-size: 15px;
          line-height: 1.6;
          word-wrap: break-word;
        }
        
        .chat-message.user .bubble {
          background: #2a2a2e !important;
          color: #f7f4ef !important;
          border-bottom-right-radius: 4px;
        }
        
        .chat-message.assistant .bubble {
          background: var(--bg-secondary);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
          border: 1px solid var(--border-color);
        }
        
        .chat-message .bubble .timestamp {
          font-size: 11px;
          opacity: 0.35;
          margin-top: 4px;
          display: block;
        }
        .chat-message.user .bubble .timestamp { 
          text-align: right;
          color: #ffffff !important;
        }
        .chat-message .bubble .sender {
          font-size: 11px;
          font-weight: 500;
          color: var(--accent-purple);
          margin-bottom: 2px;
          display: block;
        }

        .typing-indicator-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 0 12px;
        }
        .typing-indicator-wrapper .typing-label {
          font-size: 13px;
          color: var(--text-muted);
          font-weight: 450;
        }
        .typing-dots {
          display: flex;
          gap: 4px;
        }
        .typing-dots span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--text-muted);
          animation: bounce 1.4s infinite ease-in-out both;
        }
        .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
        .typing-dots span:nth-child(3) { animation-delay: 0s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .chat-input {
          flex-shrink: 0;
          display: flex;
          gap: 8px;
          padding: 12px 20px;
          border-top: 1px solid var(--border-color);
          background: var(--bg-card);
          transition: background 0.3s ease, border-color 0.3s ease;
        }
        .chat-input input {
          flex: 1;
          padding: 8px 14px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          outline: none;
          font-size: 14px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-family: var(--font);
          transition: all 0.2s;
        }
        .chat-input input:focus {
          border-color: var(--accent-pink);
          box-shadow: 0 0 0 3px rgba(253, 66, 156, 0.1);
        }
        .chat-input input::placeholder { color: var(--text-muted); }

        .send-btn {
          padding: 8px 20px;
          border-radius: var(--radius-full);
          border: none;
          background: #4a4a4e !important;
          color: #ffffff !important;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: var(--font);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .send-btn:hover:not(:disabled) {
          background: #5a5a5e !important;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .msg-paragraph { margin-bottom: 5px; line-height: 1.8; }
        .msg-h2 { font-size: 18px; font-weight: 500; margin: 8px 0 4px; color: var(--text-primary); }
        .msg-h3 { font-size: 15px; font-weight: 500; margin: 6px 0 3px; color: var(--text-primary); }
        .msg-list-item { margin: 2px 0; padding-left: 4px; color: var(--text-secondary); }
        .code-block {
          background: var(--bg-secondary);
          border-radius: 6px;
          padding: 8px 12px;
          overflow: auto;
          font-size: 13px;
          font-family: monospace;
          margin: 4px 0;
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }

        .loading { text-align: center; padding: 40px 0; color: var(--text-muted); font-size: 15px; }
        .error {
          background: rgba(239, 68, 68, 0.06);
          border-left: 3px solid #ef4444;
          padding: 12px 16px;
          border-radius: 0 6px 6px 0;
          color: #ef4444;
          font-size: 14px;
        }

        .app.light .action-btn {
          background: #ffffff;
          color: #1a1a24;
          border-color: #d0d0d8;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          padding: 8px 18px;
          font-weight: 500;
        }
        .app.light .action-btn:hover {
          background: #f0f0f2;
          border-color: #b0b0b8;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .app.light .btn-upgrade {
          background: #ffffff;
          color: #1a1a24;
          border-color: #a5a5a5;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          padding: 10px 16px;
          font-weight: 500;
        }
        .app.light .btn-upgrade:hover {
          background: #f0f0f2;
          border-color: #b0b0b8;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .app.light .download-btn {
          background: #ffffff;
          color: #1a1a24;
          border-color: #d0d0d8;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          font-weight: 500;
        }
        .app.light .download-btn:hover {
          background: #f0f0f2;
          border-color: #b0b0b8;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .app.light .chat-container {
          background: #ffffff !important;
          border-color: #e0e0e8 !important;
        }

        .app.light .chat-messages {
          background: #ffffff !important;
        }

        .app.light .chat-message.assistant .bubble {
          background: #f5f5f8 !important;
          color: #1a1a24 !important;
          border-color: #e0e0e8 !important;
        }

        .app.light .chat-message.user .bubble {
          background: #141414 !important;
          color: #ffffff !important;
        }

        .app.light .chat-input {
          background: #ffffff !important;
          border-top-color: #e0e0e8 !important;
        }

        .app.light .chat-input input {
          background: #f5f5f8 !important;
          color: #1a1a24 !important;
          border-color: #a1a1a1 !important;
        }

        .app.light .chat-input input::placeholder {
          color: #484848 !important;
        }

        .app.light .send-btn {
          background: #141414 !important;
          color: #ffffff !important;
        }

        .app.light .send-btn:hover:not(:disabled) {
          background: #3a3a3e !important;
          box-shadow: none;
        }

        .app.light .welcome-screen .welcome-title {
          color: #1a1a24 !important;
        }

        .app.light .welcome-screen .welcome-subtitle {
          color: #4a4a5e !important;
        }

        .app.light .chat-message.assistant .bubble .timestamp {
          color: #353535 !important;
          opacity: 1 !important;
        }

        .app.light .chat-message.user .bubble .timestamp {
          color: #b5b5b5 !important;
          opacity: 1 !important;
        }

        /* Study Bible Navigation */
        .study-nav-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .study-nav-row .go-to-group {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 0 1 auto;
          min-width: 120px;
          position: relative;
        }

        .study-nav-row input {
          padding: 6px 10px;
          background: #1a1a1f;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          color: #f7f4ef;
          font-size: 13px;
          outline: none;
        }

        .study-nav-row input:focus {
          border-color: #7c3aed;
        }

        .study-nav-row .go-to-input {
          flex: 1;
          min-width: 80px;
          max-width: 120px;
        }

        .study-nav-row select {
          padding: 6px 10px;
          background: #1a1a1f;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          color: #f7f4ef;
          font-size: 13px;
          outline: none;
          cursor: pointer;
          max-width: 160px;
        }

        .study-nav-row select:focus {
          border-color: #7c3aed;
        }

        .study-nav-row select option {
          background: #1a1a1f;
          color: #f7f4ef;
        }

        .study-nav-btn {
          padding: 6px 14px;
          border-radius: 8px;
          border: none;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: var(--font);
        }

        .study-nav-btn.nav {
          background: #2a2a2e;
          color: #f7f4ef;
          margin-right: 8px;
        }

        .study-nav-btn.nav:hover {
          background: #3a3a3e;
        }

        .study-nav-row-2 {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        @media (max-width: 768px) {
          .app {
            height: 100dvh !important;
            overflow: hidden !important;
          }
          
          .hamburger-btn { 
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 2px !important;
            margin: 0 !important;
          }

          .sidebar-top-row {
            padding: 8px 4px 16px 10px !important;
            margin-bottom: 12px !important;
          }

          .sidebar-close {
            display: flex !important;
            width: 32px !important;
            height: 32px !important;
            font-size: 18px !important;
          }

          .sidebar-app-title .sidebar-bible-icon {
            width: 24px !important;
            height: 24px !important;
            font-size: 12px !important;
          }
          .sidebar-app-title .sidebar-title-text {
            font-size: 16px !important;
          }
          .sidebar-app-title {
            gap: 8px !important;
          }
          
          .sidebar {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            height: 100vh !important;
            transform: translateX(-100%) !important;
            width: 280px !important;
            z-index: 100 !important;
            background: var(--bg-primary) !important;
            border-right: 1px solid var(--border-color) !important;
            transition: transform 0.3s ease !important;
            overflow: hidden !important;
            padding: 16px 12px !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .sidebar.open { transform: translateX(0) !important; }
          .sidebar.closed { transform: translateX(-100%) !important; }
          
          .sidebar-overlay.open { display: block !important; opacity: 1 !important; }
          
          .main { 
            padding: 16px 16px 0 !important; 
            height: 100dvh !important;
            max-height: 100dvh !important;
            overflow: hidden !important;
          }
          
          .main-header { 
            display: flex !important;
            align-items: center !important;
            justify-content: flex-start !important;
            gap: 6px !important;
            margin-bottom: 16px !important;
            min-height: 36px !important;
            flex-wrap: nowrap !important;
            width: 100% !important;
            padding: 0 !important;
            flex-shrink: 0 !important;
          }
          
          .header-left {
            flex-shrink: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            height: 100% !important;
            gap: 6px !important;
          }
          
          .main-header .tabs {
            flex: 1 !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: flex-start !important;
            gap: 2px !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: none !important;
            border-bottom: none !important;
            padding: 0 !important;
            flex-wrap: nowrap !important;
            height: 100% !important;
            background: transparent !important;
            border-radius: 0 !important;
            margin-bottom: 0 !important;
          }
          .main-header .tabs::-webkit-scrollbar {
            display: none !important;
          }
          
          .main-header .tab-btn {
            flex: 0 0 auto !important;
            padding: 4px 12px !important;
            font-size: 14px !important;
            padding-bottom: 6px !important;
            white-space: nowrap !important;
            min-width: auto !important;
            border-bottom: none !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            height: auto !important;
            line-height: 1.2 !important;
            background: transparent !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          
          .main-header .tab-btn .icon-label {
            font-size: 14px !important;
            white-space: nowrap !important;
            line-height: 1.2 !important;
          }
          
          .main-header .tab-btn::after {
            display: none !important;
          }
          
          .main-header .tab-btn.active {
            background: transparent !important;
            box-shadow: none !important;
            position: relative !important;
          }
          
          .main-header .tab-btn.active::after {
            display: block !important;
            content: '' !important;
            position: absolute !important;
            bottom: -2px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: 60% !important;
            height: 2px !important;
            background: #ffffff !important;
            border-radius: 2px !important;
          }
          
          .app.light .main-header .tab-btn.active::after {
            background: #1a1a24 !important;
          }
          
          .devotion-card { padding: 14px !important; }
          .card-title { font-size: 17px !important; }

          .sidebar-sessions {
            flex: 1 !important;
            overflow-y: auto !important;
            padding: 0 4px !important;
            min-height: 0 !important;
          }

          .sidebar-footer {
            border-top: 1px solid var(--border-color) !important;
            padding-top: 16px !important;
            margin-top: 12px !important;
            flex-shrink: 0 !important;
          }
          
          .chat-container { 
            flex: 1 !important;
            min-height: 0 !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
          }
          
          .chat-messages { 
            flex: 1 !important;
            overflow-y: auto !important;
            padding: 12px !important;
            min-height: 0 !important;
            height: auto !important;
            max-height: 100% !important;
          }
          
          .chat-input { 
            padding: 8px 12px !important;
            flex-shrink: 0 !important;
            gap: 8px !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            background: var(--bg-card) !important;
            border-top: 1px solid var(--border-color) !important;
            min-height: 50px !important;
          }
          .chat-input input {
            flex: 1 !important;
            padding: 10px 14px !important;
            font-size: 14px !important;
            min-width: 0 !important;
            height: 40px !important;
          }
          .send-btn {
            padding: 10px 14px !important;
            font-size: 13px !important;
            white-space: nowrap !important;
            width: auto !important;
            flex-shrink: 0 !important;
            height: 40px !important;
            background: #4a4a4e !important;
            color: #ffffff !important;
          }
          .send-btn:hover:not(:disabled) {
            background: #5a5a5e !important;
          }
          
          .welcome-screen {
            min-height: 150px !important;
            padding: 20px 16px !important;
          }
          .welcome-screen .welcome-title { font-size: 22px !important; }
          .welcome-screen .welcome-icon { font-size: 48px !important; }
          .welcome-screen .welcome-subtitle { font-size: 14px !important; }

          .action-buttons {
            gap: 6px !important;
          }
          .action-btn {
            font-size: 12px !important;
            padding: 5px 10px !important;
          }
          .action-btn .btn-icon {
            width: 16px !important;
            height: 16px !important;
          }
        }

        @media (max-width: 480px) {
          .main { 
            padding: 14px 10px 0 !important; 
            height: 100dvh !important;
            max-height: 100dvh !important;
            overflow: hidden !important;
          }
          
          .main-header { 
            gap: 4px !important;
            min-height: 32px !important;
            margin-bottom: 16px !important;
          }

          .sidebar-top-row {
            padding: 6px 4px 12px 10px !important;
            margin-bottom: 10px !important;
          }

          .sidebar-close {
            width: 28px !important;
            height: 28px !important;
            font-size: 16px !important;
          }

          .sidebar-app-title .sidebar-bible-icon {
            width: 20px !important;
            height: 20px !important;
            font-size: 10px !important;
          }
          .sidebar-app-title .sidebar-title-text {
            font-size: 14px !important;
          }
          .sidebar-app-title {
            gap: 6px !important;
          }

          .sidebar-sessions {
            flex: 1 !important;
            overflow-y: auto !important;
            padding: 0 4px !important;
            min-height: 0 !important;
          }

          .sidebar-footer {
            border-top: 1px solid var(--border-color) !important;
            padding-top: 16px !important;
            margin-top: 12px !important;
            flex-shrink: 0 !important;
          }
          
          .hamburger-btn {
            width: 24px !important;
            height: 24px !important;
            padding: 2px !important;
          }
          .hamburger-line {
            width: 16px !important;
            height: 1.5px !important;
          }
          
          .main-header .tabs {
            gap: 1px !important;
          }
          
          .main-header .tab-btn {
            padding: 2px 10px !important;
            font-size: 14px !important;
            padding-bottom: 4px !important;
          }
          
          .main-header .tab-btn .icon-label {
            font-size: 14px !important;
          }
          
          .main-header .tab-btn.active::after {
            width: 60% !important;
          }
          
          .devotion-card { padding: 12px !important; }
          .card-title { font-size: 16px !important; }
          .card-scripture { font-size: 13px !important; }
          .card-story .story-paragraph { font-size: 14px !important; }
          
          .chat-container { 
            flex: 1 !important;
            min-height: 0 !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
          }
          .chat-messages { 
            padding: 10px !important;
            flex: 1 !important;
            overflow-y: auto !important;
            min-height: 0 !important;
            max-height: 100% !important;
          }
          .chat-input { 
            padding: 6px 10px !important;
            flex-shrink: 0 !important;
            min-height: 44px !important;
          }
          .chat-input input {
            padding: 8px 12px !important;
            font-size: 13px !important;
            height: 36px !important;
          }
          .send-btn {
            padding: 8px 12px !important;
            font-size: 12px !important;
            height: 36px !important;
            background: #4a4a4e !important;
            color: #ffffff !important;
          }
          .send-btn:hover:not(:disabled) {
            background: #5a5a5e !important;
          }
          .chat-message .bubble { max-width: 92% !important; font-size: 13px !important; }
          .welcome-screen .welcome-title { font-size: 20px !important; }
          .welcome-screen .welcome-subtitle { font-size: 14px !important; }
        }
        
        /* Bible text highlight */
        .highlight-verse {
          background: rgba(124, 58, 237, 0.2) !important;
          border-left: 4px solid #7c3aed !important;
          padding: 6px 10px !important;
          border-radius: 8px !important;
          margin: 0 -8px !important;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.15) !important;
        }

        /* Suggestions dropdown scrollbar */
        .go-to-group .suggestions-dropdown::-webkit-scrollbar {
          width: 4px;
        }

        .go-to-group .suggestions-dropdown::-webkit-scrollbar-track {
          background: transparent;
        }

        .go-to-group .suggestions-dropdown::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 9999px;
        }
      `}</style>

      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={toggleSidebar}></div>

      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-top-row">
          <a 
            href="/" 
            className="sidebar-app-title" 
            onClick={(e) => {
              e.preventDefault();
              const url = new URL(window.location);
              url.searchParams.delete('devotion');
              window.history.replaceState({}, '', url);
              window.location.href = '/';
            }}
          >
            <span className="sidebar-bible-icon">✝</span>
            <span className="sidebar-title-text">Bible Studier</span>
          </a>
          <div className="sidebar-close" onClick={toggleSidebar}>✕</div>
        </div>

        <div className="sidebar-header">
          {activeTab === 'chat' ? (
            <button className="new-chat-btn" onClick={startNewChat}>+ New Chat</button>
          ) : activeTab === 'study' ? (
            <div className="sidebar-title">📖 Recent Scriptures</div>
          ) : (
            <div className="sidebar-title">📖 Devotionals</div>
          )}
        </div>

        <div className="sidebar-sessions">
          {activeTab === 'chat' ? (
            chatSessions.map((session) => (
              <div
                key={session.id}
                className={`session-item ${session.active ? 'active' : ''}`}
                onClick={() => switchChat(session.id)}
              >
                <span className="icon">💬</span>
                <div className="session-info">
                  <div className="session-title">{session.title}</div>
                  <div className="session-date">{session.date}</div>
                </div>
              </div>
            ))
          ) : activeTab === 'study' ? (
            // Study Bible recent scriptures
            recentScriptures.length === 0 ? (
              <div className="text-sm text-gray-500 p-4 text-center">No recent scriptures.</div>
            ) : (
              recentScriptures.map((ref, index) => {
                // Parse the reference (e.g., "John 3" or "John 3:16")
                const parts = ref.split(' ');
                const lastPart = parts.pop();
                let chapter = parseInt(lastPart);
                let verse = null;
                
                // Check if there's a verse (e.g., "3:16")
                if (lastPart.includes(':')) {
                  const [ch, v] = lastPart.split(':');
                  chapter = parseInt(ch);
                  verse = parseInt(v);
                }
                
                const bookName = parts.join(' ');
                
                return (
                  <div
                    key={index}
                    className="session-item"
                    onClick={() => {
                      // Find book ID from name
                      const bookIds = ['GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH','EST','JOB','PSA','PRO','ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO','OBA','JON','MIC','NAM','HAB','ZEP','HAG','ZEC','MAL','MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'];
                      let found = null;
                      for (const id of bookIds) {
                        if (getBookName(id) === bookName) {
                          found = { id, name: bookName };
                          break;
                        }
                      }
                      if (found) {
                        isLoadingFromSidebarRef.current = true;
                        isNavigatingRef.current = true;
                        setStudyBook(found.id);
                        setStudyChapter(chapter);
                        setStudyBookInput(bookName);
                        loadStudyData(found.id, chapter, verse, false, true);
                        setStudyVerse(verse ? verse : null);
                      }
                    }}
                  >
                    <span className="icon">📖</span>
                    <div className="session-info">
                      <div className="session-title">{ref}</div>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            // Devotionals
            recentDevotions.map((devotion, index) => {
              const devotionId = devotion.id || devotion.timestamp || `dev_${index}`;
              return (
                <div
                  key={devotionId}
                  className={`session-item ${selectedDevotionId === devotionId ? 'active' : ''}`}
                  onClick={() => selectDevotion(devotionId)}
                >
                  <span className="icon">✨</span>
                  <div className="session-info">
                    <div className="session-title">{devotion.title || 'Generated Devotion'}</div>
                    <div className="session-date">{devotion.category || ''} • {devotion.date || ''}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="sidebar-footer">
          <button className="btn-upgrade" onClick={toggleTheme}>
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <div className="sidebar-user">
            <div className="avatar"></div>
            <div className="info">
              <div className="name">Bible Studier</div>
              <div className="plan">Free Plan</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="main-header">
          <div className="header-left">
            <button className={`hamburger-btn ${isSidebarOpen ? 'open' : ''}`} onClick={toggleSidebar}>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
          </div>

          <div className="tabs">
            <button
              onClick={() => {
                setActiveTab('devotions');
                setShowReels(false);
                if (!selectedDevotionId) setSelectedDevotionId('daily');
              }}
              className={`tab-btn ${activeTab === 'devotions' ? 'active' : ''}`}
            >
              <span className="icon tab-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6h16v14H4z" />
                  <path d="M4 6V4h16v2" />
                  <path d="M8 10h8" />
                  <path d="M8 14h6" />
                  <path d="M8 18h4" />
                  <path d="M12 6v14" />
                </svg>
              </span>
              <span className="icon-label">Devotionals</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('chat');
                setShowReels(false);
              }}
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            >
              <span className="icon tab-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span className="icon-label">Bible Teacher</span>
            </button>
            
            <button onClick={() => setActiveTab('study')} className={`tab-btn ${activeTab === 'study' ? 'active' : ''}`}>
              <span className="icon-label">Study Bible</span>
            </button>

            <button
              onClick={() => {
                setShowReels(true);
                setActiveTab('reels');
              }}
              className={`tab-btn reels-tab ${activeTab === 'reels' ? 'active' : ''}`}
            >
              <span className="icon tab-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" />
                  <line x1="8" y1="2" x2="8" y2="22" />
                  <line x1="16" y1="2" x2="16" y2="22" />
                  <line x1="2" y1="8" x2="22" y2="8" />
                  <line x1="2" y1="16" x2="22" y2="16" />
                </svg>
              </span>
              <span className="icon-label">Message Reels</span>
            </button>
          </div>
        </div>

        {activeTab === 'devotions' && (
          <div className="devotions-scroll">
            {error ? (
              <div className="error">⚠️ {error}</div>
            ) : selectedDevotion ? (
              <div className="devotion-card">
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className={`card-category ${selectedDevotionId === 'daily' ? 'today' : ''}`}>
                      {selectedDevotion.category || 'Faith'}
                    </span>
                    {selectedDevotionId === 'daily' && (
                      <span className="card-category" style={{ background: 'rgba(124, 58, 237, 0.2)', color: '#a78bfa', borderColor: 'rgba(124, 58, 237, 0.3)' }}>
                        🌟 Today's Devotion
                      </span>
                    )}
                  </div>
                  <span className="card-date">📅 {selectedDevotion.published_date || selectedDevotion.date || ''}</span>
                </div>
                <h2 className="card-title">{selectedDevotion.title}</h2>
                <div className="card-scripture">{selectedDevotion.scripture}</div>
                
                <div className="card-story">
                  {selectedDevotion.story && (() => {
                    let storyText = selectedDevotion.story;
                    if (!storyText.includes('\n\n') && storyText.includes('\n')) {
                      storyText = storyText.replace(/\n/g, '\n\n');
                    }
                    return storyText.split(/\n\n/).filter(p => p.trim()).map((paragraph, idx) => (
                      <p key={idx} className="story-paragraph">{paragraph}</p>
                    ));
                  })()}
                </div>
                
                {selectedDevotion.prayer && (
                  <div className="prayer-section">
                    <div className="prayer-title">🙏 Prayer</div>
                    <div className="prayer-text">{selectedDevotion.prayer}</div>
                  </div>
                )}

                <div className="action-buttons">
                  <button
                    onClick={() => handleDownloadPDF(selectedDevotion)}
                    className="action-btn"
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <polyline points="9 15 12 18 15 15" />
                    </svg>
                    PDF
                  </button>

                  <button
                    onClick={() => handleShare(selectedDevotion)}
                    className="action-btn"
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    Share
                  </button>
                </div>
              </div>
            ) : (
              <div className="loading">Loading devotional...</div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="chat-container">
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="welcome-screen">
                  <div className="welcome-icon">📖</div>
                  <h1 className="welcome-title">Ask Paul anything</h1>
                  <p className="welcome-subtitle">
                    Your Bible Study teacher. Ask about scripture, theology, or faith — and get clear, thoughtful answers from <span>Paul</span>.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <div key={index} className={`chat-message ${message.isUser ? 'user' : 'assistant'}`}>
                      <div className="bubble">
                        {!message.isUser && <span className="sender">Paul</span>}
                        {message.isUser ? (
                          message.text
                        ) : (
                          <div>{renderMessage(message.text)}</div>
                        )}
                        <span className="timestamp">
                          {message.isUser ? 'You' : 'Paul'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="typing-indicator-wrapper">
                      <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span className="typing-label">Paul is typing...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            <form className="chat-input" onSubmit={(e) => {
              e.preventDefault();
              const input = e.target.elements.message.value;
              if (input.trim() && !isLoading) {
                handleSendMessage(input.trim());
                e.target.elements.message.value = '';
              }
            }}>
              <input name="message" type="text" placeholder="Ask a Bible question..." disabled={isLoading} autoComplete="off" />
              <button type="submit" disabled={isLoading} className="send-btn">
                {isLoading ? '...' : 'Send →'}
              </button>
            </form>
          </div>
        )}
        
        {activeTab === 'study' && (
          <div className="devotions-scroll">
            {/* Navigation Card */}
            <div className="devotion-card" style={{ marginBottom: '16px' }}>
              <div className="card-header">
                <span className="card-category">📖 Study Bible</span>
                <span className="card-date"></span>
              </div>
              
              <div className="study-nav-row">
                <div className="go-to-group" style={{ position: 'relative', display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label className="text-sm text-gray-400">Go to:</label>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flex: 1, minWidth: '120px' }}>
                  <input
                    type="text"
                    placeholder="John 3:16"
                    value={studySearchInput}
                    autoComplete="off"
                    onChange={(e) => {
                      const value = e.target.value;
                      setStudySearchInput(value);

                      // If input is empty, clear everything but DON'T load
                      if (value.length === 0) {
                        setShowSuggestions(false);
                        setSuggestions([]);
                        // DO NOT load anything
                        return;
                      }

                      // Show suggestions when typing
                      const bookIds = ['GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH','EST','JOB','PSA','PRO','ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO','OBA','JON','MIC','NAM','HAB','ZEP','HAG','ZEC','MAL','MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'];

                      if (value.length > 0 && !value.includes(':')) {
                        const matches = bookIds.filter(id => {
                          const name = getBookName(id);
                          return name.toLowerCase().includes(value.toLowerCase()) ||
                                id.toLowerCase().includes(value.toLowerCase());
                        });
                        setSuggestions(matches.slice(0, 8));
                        setShowSuggestions(matches.length > 0);
                      } else {
                        setShowSuggestions(false);
                      }

                      // DO NOT parse or change anything here - just show suggestions
                      // The display should stay static until Enter is pressed
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const parsed = parseScriptureReference(studySearchInput);
                        if (parsed) {
                          isNavigatingRef.current = true;
                          setStudyBook(parsed.bookId);
                          setStudyChapter(parsed.chapter);
                          const verseNum = parsed.verse ? parseInt(parsed.verse, 10) : null;
                          setStudyVerse(verseNum);
                          loadStudyData(parsed.bookId, parsed.chapter, verseNum, false, true);
                          setShowSuggestions(false);
                        }
                      }
                    }}
                    className="go-to-input"
                    inputMode="search"
                    enterKeyHint="go"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const parsed = parseScriptureReference(studySearchInput);
                      if (parsed) {
                        isNavigatingRef.current = true;
                        setStudyBook(parsed.bookId);
                        setStudyChapter(parsed.chapter);
                        const verseNum = parsed.verse ? parseInt(parsed.verse, 10) : null;
                        setStudyVerse(verseNum);
                        loadStudyData(parsed.bookId, parsed.chapter, verseNum, false, true);
                        setShowSuggestions(false);
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#7c3aed',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0
                    }}
                  >
                    Go
                  </button>
                </div>
                
                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#1a1a1f',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 50,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                  }}>
                    {suggestions.map((bookId) => {
                      const bookName = getBookName(bookId);
                      return (
                        <div
                          key={bookId}
                          onClick={() => {
                            // ONLY update the input - do NOT load anything
                            setStudyBookInput(bookName);
                            setStudySearchInput(bookName);
                            setShowSuggestions(false);
                            // DO NOT change studyBook or studyChapter
                            // DO NOT load anything
                            // The current scripture should stay displayed
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            color: '#f7f4ef',
                            fontSize: '13px',
                            transition: 'background 0.15s',
                            fontFamily: 'var(--font)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {bookName} <span style={{ color: '#6a6a6a', fontSize: '11px' }}>({bookId})</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
                
                {/* Translation Selector */}
                <select
                  value={studyTranslation}
                  onChange={(e) => {
                    const newTranslation = e.target.value;
                    isTranslationChangeRef.current = true; // Set the flag
                    setStudyTranslation(newTranslation);
                    // Load without showing loading spinner
                    fetchStudyPackage(studyBook, studyChapter, newTranslation)
                      .then(result => {
                        setStudyData(result);
                      })
                      .catch(error => {
                        console.error('Error loading study:', error);
                      });
                  }}
                  className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  {getAvailableTranslations().map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const newChapter = Math.max(1, studyChapter - 1);
                      isNavigatingRef.current = true;
                      setStudyChapter(newChapter);
                      setStudyVerse(null);
                      loadStudyData(studyBook, newChapter, null, true, true);
                    }}
                    className="study-nav-btn nav"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => {
                      const newChapter = studyChapter + 1;
                      isNavigatingRef.current = true;
                      setStudyChapter(newChapter);
                      setStudyVerse(null);
                      loadStudyData(studyBook, newChapter, null, true, true);
                    }}
                    className="study-nav-btn nav"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>

            {/* Study Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-8">
              {/* Scripture Panel */}
              <div className="devotion-card">
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="card-category">
                      {studyData?.scripture?.translation || 'BSB'}
                    </span>
                    <span className="card-date">
                      {studyData?.scripture?.book} {studyData?.scripture?.chapter}
                      {studyVerse && <span className="text-purple-400 text-sm ml-2">(Verse {studyVerse})</span>}
                    </span>
                  </div>
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                  <ScripturePane
                    scriptureData={studyData?.scripture || null}
                    isLoading={studyLoading}
                    highlightVerse={studyVerse}
                    className="h-full"
                  />
                </div>
              </div>

              {/* Commentary Panel */}
              <div className="devotion-card">
                <div className="card-header">
                  <span className="card-category">
                    {studyData?.commentary?.commentary || 'Commentary'}
                  </span>
                  <span className="card-date">
                    {studyData?.commentary?.book} {studyData?.commentary?.chapter}
                  </span>
                </div>
                <h2 className="card-title" style={{ fontSize: '18px', marginBottom: '12px' }}>
                  Commentary
                </h2>
                <div className="max-h-[500px] overflow-y-auto">
                  <CommentaryPane
                    commentaryData={studyData?.commentary || null}
                    isLoading={studyLoading}
                    className="h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showReels && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          background: '#000',
        }}>
          <ReelsFeed onClose={() => {
            setShowReels(false);
            setActiveTab('devotions');
          }} />
        </div>
      )}
    </div>
  );
}