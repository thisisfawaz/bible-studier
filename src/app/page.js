"use client";

import { useState, useEffect, useRef } from 'react';
import { devotions } from './data/devotions';

function renderMessage(text) {
  if (!text) return "";

  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  let inCodeBlock = false;
  let codeContent = [];

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeContent = [];
        i++;
        continue;
      } else {
        inCodeBlock = false;
        elements.push(
          <pre key={`code-${i}`} className="code-block">
            <code>{codeContent.join("\n")}</code>
          </pre>
        );
        i++;
        continue;
      }
    }

    if (inCodeBlock) {
      codeContent.push(line);
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="msg-h3">{line.replace("### ", "")}</h3>);
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="msg-h2">{line.replace("## ", "")}</h2>);
      i++;
      continue;
    }

    if (line.trim() === "") {
      elements.push(<div key={i} style={{height: "4px"}}></div>);
      i++;
      continue;
    }

    const numbered = line.match(/^(\d+)\.\s(.*)/);
    if (numbered) {
      elements.push(
        <div key={i} className="msg-list-item">
          <b>{numbered[1]}.</b> {renderInlineContent(numbered[2])}
        </div>
      );
      i++;
      continue;
    }

    const bullet = line.match(/^-\s(.*)/);
    if (bullet) {
      elements.push(
        <div key={i} className="msg-list-item">
          • {renderInlineContent(bullet[1])}
        </div>
      );
      i++;
      continue;
    }

    if (line.trim()) {
      elements.push(
        <p key={i} className="msg-paragraph">
          {renderInlineContent(line)}
        </p>
      );
    }
    i++;
  }

  return elements;
}

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

export default function Home() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('devotions');
  
  const [chatSessions, setChatSessions] = useState([
    { 
      id: 1, 
      title: "New Chat", 
      date: "Just now", 
      active: true,
      messages: [
        { text: "Hello! I'm your Bible study assistant. Ask me any question about scripture, and I'll help you understand it.", isUser: false }
      ]
    },
  ]);
  
  const [currentSessionId, setCurrentSessionId] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [dailyDevotion, setDailyDevotion] = useState(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);
  
  const [selectedDevotionId, setSelectedDevotionId] = useState(null);
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

  useEffect(() => {
    async function loadDailyDevotion() {
      try {
        const response = await fetch('/api/devotion');
        const data = await response.json();
        if (data.success) {
          setDailyDevotion(data.devotion);
          setSelectedDevotionId('daily');
        } else {
          setError(data.error || 'Failed to load devotion');
        }
      } catch (err) {
        setError(err.message || 'Failed to load devotion');
      } finally {
        setIsGenerating(false);
      }
    }
    loadDailyDevotion();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const getSelectedDevotion = () => {
    if (selectedDevotionId === 'daily' && dailyDevotion) {
      return dailyDevotion;
    }
    const found = devotions.find(d => d.id === selectedDevotionId);
    if (found) {
      return found;
    }
    if (dailyDevotion) {
      return dailyDevotion;
    }
    return null;
  };

  const selectedDevotion = getSelectedDevotion();

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
        
        if (messages.length === 1) {
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
      messages: [
        { text: "Hello! I'm your Bible study assistant. Ask me any question about scripture, and I'll help you understand it.", isUser: false }
      ]
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

  const themeClasses = darkMode ? 'dark' : 'light';

  return (
    <div className={`app-container ${themeClasses}`}>
      <style jsx>{`
        /* ============================================================
           THEME VARIABLES — DeepSeek-style Dark Mode
           ============================================================ */
        .app-container {
          --bg-primary: #0a0a0f;
          --bg-secondary: #14141c;
          --bg-tertiary: #1c1c26;
          --bg-card: #181820;
          --bg-input: #1c1c26;
          --bg-hover: #22222e;
          --bg-active: #2a2a38;
          --bg-elevated: #20202a;
          
          --text-primary: #e8e8f0;
          --text-secondary: #9a9ab0;
          --text-muted: #6a6a80;
          --text-inverse: #0a0a0f;
          
          --border-color: #2a2a38;
          --border-light: #3a3a4a;
          
          --shadow-color: rgba(0, 0, 0, 0.5);
          --shadow-glow: rgba(120, 120, 200, 0.06);
          
          --bubble-user: #2a2a3e;
          --bubble-user-text: #e8e8f0;
          --bubble-assistant: #1a1a26;
          
          --accent: #a78bfa;
          --accent-hover: #c4b5fd;
          --accent-dim: rgba(167, 139, 250, 0.08);
          --accent-glow: rgba(167, 139, 250, 0.15);
          
          --scrollbar-track: #1a1a26;
          --scrollbar-thumb: #3a3a4e;
          
          --header-bg: #0e0e16;
          --code-bg: #1a1a26;
          --prayer-bg: rgba(167, 139, 250, 0.06);
          
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-xl: 20px;
          
          --font: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Light theme — warm, clean, premium */
        .app-container.light {
          --bg-primary: #f5f5f7;
          --bg-secondary: #ffffff;
          --bg-tertiary: #f0f0f2;
          --bg-card: #ffffff;
          --bg-input: #f0f0f2;
          --bg-hover: #e8e8ea;
          --bg-active: #e0e0e4;
          --bg-elevated: #f8f8fa;
          
          --text-primary: #1a1a24;
          --text-secondary: #6a6a7e;
          --text-muted: #9a9aae;
          
          --border-color: #e4e4e8;
          --border-light: #d0d0d6;
          
          --shadow-color: rgba(0, 0, 0, 0.05);
          --shadow-glow: rgba(120, 120, 200, 0.04);
          
          --bubble-user: #2a2a3e;
          --bubble-user-text: #f5f5f7;
          --bubble-assistant: #f0f0f2;
          
          --accent: #7c3aed;
          --accent-hover: #6d28d9;
          --accent-dim: rgba(124, 58, 237, 0.06);
          --accent-glow: rgba(124, 58, 237, 0.08);
          
          --scrollbar-track: #e8e8ea;
          --scrollbar-thumb: #c8c8d0;
          
          --header-bg: #ffffff;
          --code-bg: #f0f0f2;
          --prayer-bg: rgba(124, 58, 237, 0.04);
        }

        /* ============================================================
           BASE
           ============================================================ */
        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: var(--font);
          transition: background 0.3s ease, color 0.3s ease;
        }

        /* ============================================================
           SCROLLBAR
           ============================================================ */
        ::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        ::-webkit-scrollbar-track {
          background: var(--scrollbar-track);
        }
        ::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }

        /* ============================================================
           HEADER
           ============================================================ */
        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.7rem 1.5rem;
          background: var(--header-bg);
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
          z-index: 10;
          transition: background 0.3s ease;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .sidebar-toggle {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 0.3rem 0.5rem;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .sidebar-toggle:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .app-header h1 {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        .app-header h1 span {
          color: var(--accent);
        }
        .header-badge {
          font-size: 0.6rem;
          font-weight: 500;
          color: var(--text-muted);
          background: var(--bg-tertiary);
          padding: 0.2rem 0.7rem;
          border-radius: 9999px;
          border: 1px solid var(--border-color);
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        @media (max-width: 480px) {
          .header-badge { display: none; }
          .app-header h1 { font-size: 1rem; }
          .app-header { padding: 0.5rem 1rem; }
        }

        /* ============================================================
           THEME TOGGLE — Minimal, clean
           ============================================================ */
        .theme-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.8rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 500;
          transition: all 0.2s ease;
          white-space: nowrap;
          font-family: var(--font);
        }
        .theme-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--border-light);
        }
        .theme-btn .icon { font-size: 0.9rem; }
        .theme-btn .label { display: inline; }
        @media (max-width: 640px) {
          .theme-btn { padding: 0.35rem 0.6rem; }
          .theme-btn .label { display: none; }
          .theme-btn .icon { font-size: 1rem; }
        }

        /* ============================================================
           MAIN LAYOUT
           ============================================================ */
        .main-layout {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* ============================================================
           SIDEBAR — DeepSeek style
           ============================================================ */
        .sidebar {
          width: 260px;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          overflow: hidden;
          height: calc(100vh - 57px);
          position: sticky;
          top: 57px;
          transition: width 0.3s ease, opacity 0.2s ease, transform 0.3s ease;
        }
        .sidebar.closed {
          width: 0;
          opacity: 0;
          padding: 0;
          border: none;
        }
        .sidebar.open {
          width: 260px;
          opacity: 1;
        }
        .sidebar-header {
          padding: 1rem 1rem 0.75rem;
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
        }
        .sidebar-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          padding: 0.3rem 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .new-chat-btn {
          width: 100%;
          padding: 0.6rem;
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          font-weight: 500;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: var(--font);
        }
        .new-chat-btn:hover {
          background: var(--bg-hover);
          border-color: var(--border-light);
        }
        .sidebar-sessions {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }
        .session-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 0.7rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.15s;
          margin-bottom: 0.1rem;
          color: var(--text-secondary);
        }
        .session-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .session-item.active {
          background: var(--bg-active);
          color: var(--text-primary);
        }
        .session-item .session-icon {
          font-size: 0.8rem;
          opacity: 0.6;
          flex-shrink: 0;
        }
        .session-item.active .session-icon {
          opacity: 1;
        }
        .session-info {
          flex: 1;
          min-width: 0;
        }
        .session-title {
          font-size: 0.82rem;
          font-weight: 450;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .session-item.active .session-title {
          color: var(--text-primary);
        }
        .session-date {
          font-size: 0.65rem;
          color: var(--text-muted);
        }
        .sidebar-footer {
          padding: 0.75rem 1rem;
          border-top: 1px solid var(--border-color);
          flex-shrink: 0;
        }
        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .user-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }
        .user-name {
          font-size: 0.8rem;
          font-weight: 450;
          color: var(--text-secondary);
        }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            top: 57px;
            left: 0;
            height: calc(100vh - 57px);
            z-index: 20;
            transform: translateX(-100%);
            width: 280px !important;
            box-shadow: 0 8px 32px var(--shadow-color);
            border-right: none;
            background: var(--bg-secondary);
          }
          .sidebar.open { transform: translateX(0); }
          .sidebar.closed { transform: translateX(-100%); width: 280px !important; opacity: 1; }
        }

        /* ============================================================
           MAIN CONTENT
           ============================================================ */
        .main-content {
          flex: 1;
          padding: 1.5rem 2rem;
          overflow-y: auto;
          height: calc(100vh - 57px);
          background: var(--bg-primary);
          transition: background 0.3s ease;
        }
        @media (max-width: 768px) { .main-content { padding: 1rem; } }
        @media (max-width: 480px) { .main-content { padding: 0.75rem; } }

        /* ============================================================
           TABS — Clean, minimal
           ============================================================ */
        .tabs {
          display: flex;
          gap: 0.25rem;
          margin-bottom: 1.5rem;
          background: var(--bg-secondary);
          padding: 0.25rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          transition: background 0.3s ease;
        }
        .tab-btn {
          flex: 1;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          font-family: var(--font);
        }
        .tab-btn:hover { color: var(--text-primary); }
        .tab-btn.active {
          background: var(--bg-active);
          color: var(--text-primary);
          box-shadow: none;
        }
        .tab-btn .icon { font-size: 0.9rem; }
        @media (max-width: 480px) {
          .tab-btn { font-size: 0.7rem; padding: 0.4rem 0.5rem; }
        }

        /* ============================================================
           DEVOTION CARD — Clean, minimal, no blue
           ============================================================ */
        .devotion-card {
          background: var(--bg-card);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          margin-bottom: 1.25rem;
          border: 1px solid var(--border-color);
          transition: all 0.25s ease;
        }
        .devotion-card:hover {
          border-color: var(--border-light);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.6rem;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .card-category {
          font-size: 0.65rem;
          font-weight: 500;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          padding: 0.2rem 0.7rem;
          border-radius: 9999px;
          border: 1px solid var(--border-color);
          letter-spacing: 0.02em;
        }
        .card-category.today {
          background: var(--accent-dim);
          color: var(--accent);
          border-color: rgba(167, 139, 250, 0.15);
        }
        .card-date {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .card-title {
          font-size: 1.4rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.4rem;
          letter-spacing: -0.01em;
        }
        .card-scripture {
          background: var(--bg-tertiary);
          border-left: 3px solid var(--accent);
          padding: 0.5rem 1rem;
          margin-bottom: 0.8rem;
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-style: italic;
        }
        .card-story {
          color: var(--text-secondary);
          font-size: 0.88rem;
          line-height: 1.7;
          margin-bottom: 1rem;
        }
        .prayer-section {
          background: var(--prayer-bg);
          border-left: 3px solid var(--accent);
          padding: 1rem 1.2rem;
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          margin-top: 0.75rem;
        }
        .prayer-title {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--accent);
          margin-bottom: 0.3rem;
          letter-spacing: 0.02em;
        }
        .prayer-text {
          color: var(--text-secondary);
          font-size: 0.88rem;
          line-height: 1.7;
          font-style: italic;
        }
        @media (max-width: 480px) {
          .devotion-card { padding: 1rem; }
          .card-title { font-size: 1.1rem; }
        }

        /* ============================================================
           CHAT — Minimal, clean, like DeepSeek
           ============================================================ */
        .chat-container {
          background: var(--bg-card);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 57px - 3rem - 55px);
          transition: background 0.3s ease;
        }
        @media (max-width: 768px) {
          .chat-container { height: calc(100vh - 57px - 2rem - 50px); }
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1.25rem 1.5rem;
          background: var(--bg-primary);
          transition: background 0.3s ease;
        }
        @media (max-width: 480px) { .chat-messages { padding: 0.75rem 1rem; } }

        .chat-message {
          display: flex;
          margin-bottom: 1rem;
          animation: fadeIn 0.25s ease;
        }
        .chat-message.user { justify-content: flex-end; }
        .chat-message .bubble {
          max-width: 80%;
          padding: 0.6rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.88rem;
          line-height: 1.6;
          word-wrap: break-word;
        }
        .chat-message.user .bubble {
          background: var(--bubble-user);
          color: var(--bubble-user-text);
          border-bottom-right-radius: 4px;
        }
        .chat-message.assistant .bubble {
          background: var(--bubble-assistant);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
          border: 1px solid var(--border-color);
        }
        .chat-message .bubble .timestamp {
          font-size: 0.6rem;
          opacity: 0.4;
          margin-top: 0.2rem;
          display: block;
        }
        .chat-message.user .bubble .timestamp { text-align: right; }
        @media (max-width: 480px) {
          .chat-message .bubble { max-width: 92%; font-size: 0.82rem; padding: 0.5rem 0.8rem; }
        }

        /* ============================================================
           CHAT INPUT
           ============================================================ */
        .chat-input {
          display: flex;
          gap: 0.6rem;
          padding: 0.75rem 1.25rem;
          border-top: 1px solid var(--border-color);
          background: var(--bg-card);
          flex-shrink: 0;
          transition: background 0.3s ease;
        }
        @media (max-width: 480px) {
          .chat-input { padding: 0.6rem 0.8rem; gap: 0.4rem; }
        }
        .chat-input input {
          flex: 1;
          padding: 0.6rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          outline: none;
          font-size: 0.85rem;
          transition: all 0.2s;
          background: var(--bg-input);
          color: var(--text-primary);
          font-family: var(--font);
        }
        .chat-input input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .chat-input input::placeholder { color: var(--text-muted); }
        .chat-input button {
          padding: 0.6rem 1.4rem;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          font-weight: 500;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          font-family: var(--font);
        }
        .chat-input button:hover:not(:disabled) {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--border-light);
        }
        .chat-input button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        @media (max-width: 480px) {
          .chat-input button { padding: 0.5rem 1rem; font-size: 0.75rem; }
          .chat-input input { padding: 0.5rem 0.8rem; font-size: 0.8rem; }
        }

        /* ============================================================
           TYPING INDICATOR
           ============================================================ */
        .typing-indicator {
          display: flex;
          gap: 0.35rem;
          padding: 0.2rem 0;
        }
        .typing-indicator span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--text-muted);
          animation: bounce 1.4s infinite ease-in-out both;
        }
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ============================================================
           MESSAGE RENDER STYLES
           ============================================================ */
        .msg-paragraph { margin: 3px 0; line-height: 1.6; }
        .msg-h2 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 6px 0 3px;
          color: var(--text-primary);
        }
        .msg-h3 {
          font-size: 0.95rem;
          font-weight: 500;
          margin: 4px 0 2px;
          color: var(--text-primary);
        }
        .msg-list-item {
          margin: 2px 0;
          padding-left: 4px;
          color: var(--text-secondary);
        }
        .code-block {
          background: var(--code-bg);
          border-radius: var(--radius-sm);
          padding: 6px 10px;
          overflow: auto;
          font-size: 0.75rem;
          font-family: monospace;
          margin: 4px 0;
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }

        /* ============================================================
           LOADING & ERROR
           ============================================================ */
        .loading {
          text-align: center;
          padding: 2rem 0;
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .error {
          background: rgba(239, 68, 68, 0.06);
          border-left: 3px solid #ef4444;
          padding: 0.8rem 1.2rem;
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          color: #ef4444;
          font-size: 0.85rem;
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <header className="app-header">
        <div className="header-left">
          <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
            </svg>
          </button>
          <h1>Bible<span>Studier</span></h1>
        </div>
        <div className="header-right">
          <span className="header-badge">✦ Daily</span>
          <button className="theme-btn" onClick={toggleTheme}>
            <span className="icon">{darkMode ? '☀️' : '🌙'}</span>
            <span className="label">{darkMode ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </header>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="main-layout">

        {/* ===== SIDEBAR ===== */}
        <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
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
                  <span className="session-icon">💬</span>
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
                    onClick={() => setSelectedDevotionId('daily')}
                  >
                    <span className="session-icon">⭐</span>
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
                    onClick={() => setSelectedDevotionId(devotion.id)}
                  >
                    <span className="session-icon">📖</span>
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
            <div className="sidebar-user">
              <span className="user-avatar">👤</span>
              <span className="user-name">Bible Studier</span>
            </div>
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="main-content">

          <div className="tabs">
            <button
              onClick={() => {
                setActiveTab('devotions');
                if (!selectedDevotionId) setSelectedDevotionId('daily');
              }}
              className={`tab-btn ${activeTab === 'devotions' ? 'active' : ''}`}
            >
              <span className="icon">📖</span> Devotionals
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            >
              <span className="icon">🤖</span> Bible AI
            </button>
          </div>

          {activeTab === 'devotions' && (
            <div>
              {isGenerating ? (
                <div className="loading">Loading today's devotion...</div>
              ) : error ? (
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
                </div>
              ) : (
                <div className="loading">No devotion selected. Click one from the sidebar.</div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="chat-container">
              <div className="chat-messages">
                {messages.map((message, index) => (
                  <div key={index} className={`chat-message ${message.isUser ? 'user' : 'assistant'}`}>
                    <div className="bubble">
                      {message.isUser ? (
                        message.text
                      ) : (
                        <div>{renderMessage(message.text)}</div>
                      )}
                      <span className="timestamp">
                        {message.isUser ? 'You' : 'Assistant'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="chat-message assistant">
                    <div className="bubble">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
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
                <button type="submit" disabled={isLoading}>{isLoading ? '...' : 'Send →'}</button>
              </form>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}