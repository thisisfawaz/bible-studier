"use client";

import { useState, useEffect, useRef } from 'react';
import { devotions } from './data/devotions';
import ReelsFeed from './components/ReelsFeed';

// ============================================================
// RENDER FUNCTIONS
// ============================================================
function renderInlineContent(text) {
  if (!text) return "";

  const parts = [];
  let remaining = text;
  let boldRegex = /\*\*(.*?)\*\*/g;
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

  const paragraphs = text.split(/\n\n|\n/).filter(p => p.trim());
  
  return paragraphs.map((paragraph, index) => {
    // Check if it's a bullet point list
    if (paragraph.includes('•') || paragraph.includes('-')) {
      const lines = paragraph.split('\n');
      return (
        <div key={index} className="mb-4">
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
    
    // Check if it's a heading
    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
      return (
        <p key={index} className="msg-paragraph font-bold text-lg mt-3 mb-3">
          {renderInlineContent(paragraph.replace(/\*\*/g, ''))}
        </p>
      );
    }
    
    // Regular paragraph
    return (
      <p key={index} className="msg-paragraph mb-5">
        {renderInlineContent(paragraph)}
      </p>
    );
  });
}

// ============================================================
// HOME COMPONENT
// ============================================================
export default function Home() {
  // ============================================================
  // STATE — All useState hooks first
  // ============================================================
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
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);

  const [selectedDevotionId, setSelectedDevotionId] = useState(devotions[0]?.id || null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const currentSession = chatSessions.find(s => s.id === currentSessionId);
  const messages = currentSession ? currentSession.messages : [];

  const updateMessages = (newMessages) => {
    setChatSessions(prev => prev.map(session =>
      session.id === currentSessionId
        ? { ...session, messages: newMessages }
        : session
    ));
  };

  // ============================================================
  // ALL useEffect Hooks
  // ============================================================
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ============================================================
  // URL HANDLING — Update URL when devotion is selected
  // ============================================================
  const updateUrl = (devotionId) => {
    const url = new URL(window.location);
    if (devotionId && devotionId !== 'daily') {
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

  // ============================================================
  // LOAD DAILY DEVOTION
  // ============================================================
  useEffect(() => {
    async function loadDailyDevotion() {
      try {
        const response = await fetch('/api/devotion');
        const data = await response.json();
        if (data.success) {
          setDailyDevotion(data.devotion);
          // Only set to 'daily' if no other selection exists
          if (selectedDevotionId === null || selectedDevotionId === devotions[0]?.id) {
            // Check if URL has a devotion param
            const params = new URLSearchParams(window.location.search);
            const devotionParam = params.get('devotion');
            if (devotionParam) {
              const id = parseInt(devotionParam);
              const found = devotions.find(d => d.id === id);
              if (found) {
                setSelectedDevotionId(id);
                return;
              }
            }
            setSelectedDevotionId('daily');
          }
        }
      } catch (err) {
        // Keep showing first devotion if API fails
        console.error('Failed to load devotion:', err);
      } finally {
        setIsGenerating(false);
      }
    }
    loadDailyDevotion();
  }, []);

  // ============================================================
  // HANDLE SHARED LINK FROM URL
  // ============================================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const devotionParam = params.get('devotion');
    if (devotionParam) {
      const id = parseInt(devotionParam);
      const found = devotions.find(d => d.id === id);
      if (found) {
        setSelectedDevotionId(id);
        setActiveTab('devotions');
      }
    }
  }, [devotions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ============================================================
  // GET SELECTED DEVOTION
  // ============================================================
  const getSelectedDevotion = () => {
    // If 'daily' is selected and dailyDevotion exists, show it
    if (selectedDevotionId === 'daily' && dailyDevotion) {
      return dailyDevotion;
    }
    
    // If a specific devotion is selected (number), find it
    if (selectedDevotionId !== null && typeof selectedDevotionId === 'number') {
      const found = devotions.find(d => d.id === selectedDevotionId);
      if (found) {
        return found;
      }
    }
    
    // If nothing else works, show the first devotion
    if (devotions.length > 0) {
      return devotions[0];
    }
    
    return null;
  };

  const selectedDevotion = getSelectedDevotion();

  // ============================================================
  // EARLY RETURN — AFTER ALL HOOKS
  // ============================================================
  if (!isMounted) {
    return <div style={{ backgroundColor: '#101012', minHeight: '100vh' }} />;
  }

  // ============================================================
  // FUNCTIONS
  // ============================================================
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

  // ============================================================
  // SHARE FUNCTION — Direct Link to Specific Devotion
  // ============================================================
  const handleShare = async (devotion) => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/?devotion=${devotion.id}`;
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
        /* ============================================================
           DARK THEME (Default)
           ============================================================ */
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

        /* ============================================================
           LIGHT THEME — Improved Contrast
           ============================================================ */
        .app.light {
          --bg-primary: #e8e8ea;
          --bg-secondary: #f5f5f7;
          --bg-card: #ffffff;
          --bg-hover: rgba(0,0,0,0.06);
          --bg-active: rgba(0,0,0,0.08);
          --text-primary: #1a1a24;
          --text-secondary: #4a4a5e;
          --text-muted: #8a8a9e;
          --border-color: rgba(0,0,0,0.15);
          --border-light: rgba(0,0,0,0.25);
          --shadow: rgba(0,0,0,0.08);
          --accent-pink: #fd429c;
          --accent-purple: #7f22fe;
          --accent-gradient: linear-gradient(135deg, #fd429c, #7f22fe);
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 9999px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        .app.light ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); }
        .app.light ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.25); }

        /* ============================================================
           HAMBURGER MENU
           ============================================================ */
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

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* ============================================================
           SIDEBAR OVERLAY (Mobile)
           ============================================================ */
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

        /* ============================================================
           SIDEBAR
           ============================================================ */
        .sidebar {
          width: 260px;
          min-width: 260px;
          background: var(--bg-primary);
          border-right: 1px solid var(--border-color);
          padding: 20px 12px;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          height: 100vh;
          position: sticky;
          top: 0;
          transition: background 0.3s ease, border-color 0.3s ease;
        }

        .sidebar-close {
          display: none;
          align-items: center;
          justify-content: flex-end;
          padding: 4px 8px 12px;
          font-size: 20px;
          cursor: pointer;
          color: var(--text-secondary);
        }
        .sidebar-close:hover {
          color: var(--text-primary);
        }

        .sidebar-logo {
          padding: 4px 10px 16px;
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.02em;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sidebar-header {
          padding: 0 4px 8px;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 8px;
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
          border-radius: var(--radius-full);
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-secondary);
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

        .sidebar-sessions {
          flex: 1;
          overflow-y: auto;
          padding: 0 4px;
        }
        .session-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 10px;
          border-radius: var(--radius-full);
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
        .session-item .icon { font-size: 14px; flex-shrink: 0; opacity: 0.5; }
        .session-item.active .icon { opacity: 1; }
        .session-info { flex: 1; min-width: 0; }
        .session-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .session-date { font-size: 11px; color: var(--text-muted); }

        .sidebar-footer {
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
          margin-top: 4px;
        }

        .btn-upgrade {
          display: block;
          text-align: center;
          padding: 8px 16px;
          border-radius: var(--radius-full);
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
          border-radius: var(--radius-full);
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

        /* ============================================================
           DEVOTIONS SCROLL CONTAINER
           ============================================================ */
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

        /* ============================================================
           MAIN CONTENT
           ============================================================ */
        .main {
          flex: 1;
          padding: 24px 32px 0;
          width: 100%;
          transition: background 0.3s ease;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          height: 98vh;
        }

        .main-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .main-header .title {
          font-size: 22px;
          font-weight: 500;
          letter-spacing: -0.02em;
        }
        .main-header .title .gradient-text {
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .header-actions .theme-btn {
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
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .header-actions .theme-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--border-light);
        }
        .header-actions .theme-btn .icon { font-size: 14px; }

        .tabs {
          flex-shrink: 0;
          display: flex;
          gap: 4px;
          background: var(--bg-secondary);
          padding: 4px;
          border-radius: var(--radius);
          border: 1px solid var(--border-color);
          margin-bottom: 24px;
          transition: background 0.3s ease, border-color 0.3s ease;
        }
        .app.light .tabs {
          background: #dddde0;
          border-color: rgba(0,0,0,0.12);
        }
        .tab-btn {
          flex: 1;
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 450;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: var(--text-secondary);
          font-family: var(--font);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .tab-btn:hover { 
          color: var(--text-primary);
          background: rgba(124, 58, 237, 0.06);
        }
        .tab-btn.active {
          background: #7c3aed;
          color: #ffffff;
          box-shadow: 0 2px 12px rgba(124, 58, 237, 0.3);
        }
        .tab-btn.active:hover {
          background: #6d28d9;
        }
        .tab-btn .icon { 
          font-size: 16px; 
          font-weight: 400; 
          opacity: 0.6;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tab-btn .tab-icon svg {
          width: 18px;
          height: 18px;
          stroke: currentColor;
        }
        .tab-btn.active .icon { 
          opacity: 1; 
        }
        .tab-btn.active .tab-icon svg {
          stroke: #ffffff;
        }

        /* ============================================================
           DEVOTION CARD
           ============================================================ */
        .devotion-card {
          background: var(--bg-card);
          border-radius: var(--radius);
          padding: 24px;
          margin-bottom: 16px;
          border: 1px solid var(--border-color);
          transition: all 0.25s;
        }
        .devotion-card:hover {
          border-color: var(--border-light);
          background: rgba(255,255,255,0.02);
        }
        .app.light .devotion-card:hover {
          background: rgba(0,0,0,0.01);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
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
        }
        .card-category.today {
          background: rgba(253, 66, 156, 0.12);
          color: var(--accent-pink);
          border-color: rgba(253, 66, 156, 0.2);
        }
        .card-date {
          font-size: 12px;
          color: var(--text-muted);
        }
        .card-title {
          font-size: 22px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 6px;
          letter-spacing: -0.01em;
        }
        .card-scripture {
          background: rgba(255,255,255,0.03);
          border-left: 3px solid var(--accent-pink);
          padding: 8px 14px;
          margin-bottom: 12px;
          border-radius: 0 6px 6px 0;
          font-size: 14px;
          color: var(--text-secondary);
          font-style: italic;
        }
        .app.light .card-scripture {
          background: rgba(0,0,0,0.02);
        }
        .card-story {
          color: var(--text-secondary);
          font-size: 15px;
          line-height: 1.7;
          margin-bottom: 12px;
        }
        .prayer-section {
          background: rgba(255,255,255,0.02);
          border-left: 3px solid var(--accent-purple);
          padding: 12px 16px;
          border-radius: 0 6px 6px 0;
          margin-top: 4px;
        }
        .app.light .prayer-section {
          background: rgba(0,0,0,0.02);
        }
        .prayer-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--accent-purple);
          margin-bottom: 4px;
          letter-spacing: 0.02em;
        }
        .prayer-text {
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.7;
          font-style: italic;
        }

        /* ============================================================
           ACTION BUTTONS ROW
           ============================================================ */
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

        /* ============================================================
           CHAT — Welcome Screen + Messages
           ============================================================ */
        .chat-container {
          background: var(--bg-card);
          border-radius: var(--radius);
          border: 1px solid var(--border-color);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          flex: 1;
          height: calc(100vh - 180px);
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
        }

        /* Welcome Screen */
        .welcome-screen {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 20px;
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

        /* Chat Message */
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
          background: var(--accent-gradient);
          color: #fff;
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
        .chat-message.user .bubble .timestamp { text-align: right; }
        .chat-message .bubble .sender {
          font-size: 11px;
          font-weight: 500;
          color: var(--accent-purple);
          margin-bottom: 2px;
          display: block;
        }

        /* "Paul is typing..." */
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
          background: #7c3aed;
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: var(--font);
          white-space: nowrap;
        }
        .send-btn:hover:not(:disabled) {
          background: #6d28d9;
          box-shadow: 0 2px 12px rgba(124, 58, 237, 0.3);
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .msg-paragraph { margin-bottom: 1.5rem; line-height: 1.8; }
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

        /* ============================================================
           MOBILE RESPONSIVE
           ============================================================ */
        @media (max-width: 768px) {
          .hamburger-btn { display: flex; }
          
          .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            height: 100vh;
            transform: translateX(-100%);
            width: 280px !important;
            z-index: 100;
            background: var(--bg-primary);
            border-right: 1px solid var(--border-color);
            transition: transform 0.3s ease;
            overflow-y: auto;
            padding: 16px 12px;
          }
          .sidebar.open { transform: translateX(0); }
          .sidebar.closed { transform: translateX(-100%); }
          
          .sidebar-close { display: flex; }
          .sidebar-overlay.open { display: block; opacity: 1; }
          
          .main { 
            padding: 16px 16px 0; 
            height: 95vh; 
            overflow: hidden; 
          }
          .main-header .title { font-size: 18px; }
          
          /* ============================================================
            TABS — Mobile Layout
            ============================================================ */
          .tabs {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px;
            background: var(--bg-secondary);
            padding: 4px;
            border-radius: var(--radius);
            border: 1px solid var(--border-color);
            margin-bottom: 12px;
            transition: background 0.3s ease, border-color 0.3s ease;
            flex-shrink: 0;
          }
          
          /* Reels tab — spans full width */
          .tab-btn.reels-tab {
            grid-column: 1 / -1;
            padding: 10px;
          }
          
          .tab-btn {
            padding: 10px 8px;
            font-size: 13px;
            font-weight: 500;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            background: transparent;
            color: var(--text-secondary);
            font-family: var(--font);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }
          
          .tab-btn .icon { 
            font-size: 16px; 
            font-weight: 400; 
            opacity: 0.6;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .tab-btn .tab-icon svg {
            width: 18px;
            height: 18px;
            stroke: currentColor;
          }
          .tab-btn.active .icon { 
            opacity: 1; 
          }
          .tab-btn.active .tab-icon svg {
            stroke: #ffffff;
          }
          
          .tab-btn .icon-label {
            font-size: 12px;
          }
          
          .devotion-card { padding: 14px; }
          .card-title { font-size: 17px; }
          
          .chat-container { 
            flex: 1;
            min-height: 0;
            height: 100%;
          }
          .chat-messages { padding: 12px; }
          
          /* ============================================================
            CHAT INPUT — Mobile
            ============================================================ */
          .chat-input { 
            padding: 8px 12px;
            flex-shrink: 0;
            gap: 8px;
            display: flex !important;
            flex-direction: row !important;
            align-items: center;
          }
          .chat-input input {
            flex: 1;
            padding: 10px 14px;
            font-size: 14px;
            min-width: 0;
          }
          .send-btn {
            padding: 10px 14px;
            font-size: 13px;
            white-space: nowrap;
            width: auto;
          }
          
          .chat-message .bubble { max-width: 90%; font-size: 14px; }
          .welcome-screen .welcome-title { font-size: 22px; }
          .welcome-screen .welcome-icon { font-size: 48px; }

          .action-buttons {
            gap: 6px;
          }
          .action-btn {
            font-size: 12px;
            padding: 5px 10px;
          }
          .action-btn .btn-icon {
            width: 16px;
            height: 16px;
          }
        }

        @media (max-width: 480px) {
          .main { 
            padding: 12px 12px 0; 
            height: 95vh; 
            overflow: hidden; 
          }
          .main-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .header-actions { width: 100%; justify-content: flex-start; }
          
          .tabs { flex-direction: column; }
          .tab-btn { padding: 10px; }
          
          .devotion-card { padding: 12px; }
          .card-title { font-size: 16px; }
          .card-scripture { font-size: 13px; }
          .card-story { font-size: 14px; }
          
          .chat-container { 
            flex: 1;
            min-height: 0;
            height: 100%;
          }
          .chat-messages { padding: 10px; }
          .chat-input { 
            padding: 6px 10px;
            flex-shrink: 0;
          }
          .chat-message .bubble { max-width: 92%; font-size: 13px; }
          .welcome-screen .welcome-title { font-size: 20px; }
          .welcome-screen .welcome-subtitle { font-size: 14px; }
        }
      `}</style>

      {/* ===== SIDEBAR OVERLAY ===== */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={toggleSidebar}></div>

      {/* ===== SIDEBAR ===== */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-close" onClick={toggleSidebar}>✕</div>
        <div className="sidebar-logo">✦ Bible Studier</div>

        <div className="sidebar-header">
          {activeTab === 'chat' ? (
            <button className="new-chat-btn" onClick={startNewChat}>+ New Chat</button>
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
          ) : (
            <>
              {dailyDevotion && (
                <div
                  className={`session-item ${selectedDevotionId === 'daily' ? 'active' : ''}`}
                  onClick={() => selectDevotion('daily')}
                >
                  <span className="icon">⭐</span>
                  <div className="session-info">
                    <div className="session-title">Today's Devotion</div>
                    <div className="session-date">{dailyDevotion.date || new Date().toLocaleDateString()}</div>
                  </div>
                </div>
              )}
              {devotions.map((devotion) => (
                <div
                  key={devotion.id}
                  className={`session-item ${selectedDevotionId === devotion.id ? 'active' : ''}`}
                  onClick={() => selectDevotion(devotion.id)}
                >
                  <span className="icon">📖</span>
                  <div className="session-info">
                    <div className="session-title">{devotion.title}</div>
                    <div className="session-date">{devotion.category} • {devotion.date || ''}</div>
                  </div>
                </div>
              ))}
            </>
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

      {/* ===== MAIN CONTENT ===== */}
      <main className="main">
        <div className="main-header">
          <div className="header-left">
            <button className={`hamburger-btn ${isSidebarOpen ? 'open' : ''}`} onClick={toggleSidebar}>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
            <a href="/" style={{ textDecoration: 'none' }}>
              <div className="title">
                <span style={{ color: 'var(--text-primary)' }}>Bible </span>
                <span className="gradient-text">Studier</span>
              </div>
            </a>
          </div>
        </div>

        {/* Tabs */}
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
            <span className="icon-label">Paul (Bible Assistant)</span>
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

        {/* Devotionals */}
        {activeTab === 'devotions' && (
          <div className="devotions-scroll">
            {error ? (
              <div className="error">⚠️ {error}</div>
            ) : selectedDevotion ? (
              <div className="devotion-card">
                <div className="card-header">
                  <span className={`card-category ${selectedDevotionId === 'daily' ? 'today' : ''}`}>
                    {selectedDevotionId === 'daily' ? '🌟 Today\'s Devotion' : (selectedDevotion.category || 'Faith')}
                  </span>
                  <span className="card-date">📅 {selectedDevotion.date || ''}</span>
                </div>
                <h2 className="card-title">{selectedDevotion.title}</h2>
                <div className="card-scripture">{selectedDevotion.scripture}</div>
                <p className="card-story">{selectedDevotion.story}</p>
                {selectedDevotion.prayer && (
                  <div className="prayer-section">
                    <div className="prayer-title">🙏 Prayer</div>
                    <div className="prayer-text">{selectedDevotion.prayer}</div>
                  </div>
                )}

                {/* ACTION BUTTONS — PDF & Share */}
                <div className="action-buttons">
                  {/* Download PDF */}
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

                  {/* Share */}
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
              <div className="loading">No devotion selected.</div>
            )}
          </div>
        )}

        {/* Chat */}
        {activeTab === 'chat' && (
          <div className="chat-container">
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="welcome-screen">
                  <div className="welcome-icon">📖</div>
                  <h1 className="welcome-title">Ask Paul anything</h1>
                  <p className="welcome-subtitle">
                    Your Bible Study assistant. Ask about scripture, theology, or faith — and get clear, thoughtful answers from <span>Paul</span>.
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

        {/* Reels Fullscreen Modal */}
        {showReels && (
          <ReelsFeed onClose={() => {
            setShowReels(false);
            setActiveTab('devotions');
          }} />
        )}
      </main>
    </div>
  );
}