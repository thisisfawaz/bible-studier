"use client";

import { useState, useEffect, useRef } from 'react';
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
          
          // Check URL params first
          const params = new URLSearchParams(window.location.search);
          const devotionParam = params.get('devotion');
          if (devotionParam) {
            // Check if it's a timestamp or id in recent devotions
            const foundRecent = data.recent?.find(d => d.timestamp === devotionParam || d.id === devotionParam);
            if (foundRecent) {
              setSelectedDevotionId(devotionParam);
              return;
            }
            // If not found, default to daily or most recent
          }
          
          // Default to today's devotion if it exists
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

  // Poll every 30 seconds to check for new devotions
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
      {/* All your CSS styles remain the same */}
      <style jsx>{`
        /* ... all your existing styles ... */
      `}</style>

      {/* ===== SIDEBAR OVERLAY ===== */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={toggleSidebar}></div>

      {/* ===== SIDEBAR ===== */}
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
              {recentDevotions.map((devotion, index) => {
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
              })}
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
        </div>

        {/* Devotionals */}
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
                  {selectedDevotion.story && selectedDevotion.story.split(/\n\n|\n/).filter(p => p.trim()).map((paragraph, idx) => (
                    <p key={idx} className="story-paragraph">{paragraph}</p>
                  ))}
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
      </main>

      {/* ===== REELS FULLSCREEN MODAL ===== */}
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