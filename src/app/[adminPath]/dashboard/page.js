// src/app/[adminPath]/dashboard/page.js

"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const ADMIN_PASSWORD = 'kami9524';

export default function AdminDashboard() {
  const params = useParams();
  const router = useRouter();
  const adminPath = params.adminPath;
  const expectedPath = process.env.NEXT_PUBLIC_ADMIN_PATH || 'admin';

  // Redirect if wrong path
  useEffect(() => {
    if (adminPath !== expectedPath) {
      router.push('/');
    }
  }, [adminPath, expectedPath, router]);

  // YOUR EXISTING STATE
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('devotions');
  const [devotions, setDevotions] = useState({ scheduled: [], published: [] });
  const [reels, setReels] = useState({ scheduled: [], published: [] });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingReel, setEditingReel] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReelDatePicker, setShowReelDatePicker] = useState(false);
  const [reelScheduleDate, setReelScheduleDate] = useState('');
  const [reelScheduleTime, setReelScheduleTime] = useState('08:00');

  // Helper function to sort devotions by ID (newest first)
  const sortDevotionsByNewest = (devotionsList) => {
    return [...devotionsList].sort((a, b) => {
      const timeA = a.createdAt || a.timestamp || a.id || '';
      const timeB = b.createdAt || b.timestamp || b.id || '';
      
      if (typeof timeA === 'number' && typeof timeB === 'number') {
        return timeB - timeA;
      }
      
      if (typeof timeA === 'string' && typeof timeB === 'string') {
        return timeB.localeCompare(timeA);
      }
      
      const dateA = a.publishedDate || a.scheduleDate || '';
      const dateB = b.publishedDate || b.scheduleDate || '';
      
      if (dateA && dateB) {
        const combinedA = `${dateA} ${a.scheduleTime || '00:00'}`;
        const combinedB = `${dateB} ${b.scheduleTime || '00:00'}`;
        return combinedB.localeCompare(combinedA);
      }
      
      const numA = parseInt(a.title?.match(/\d+$/)?.[0] || '0');
      const numB = parseInt(b.title?.match(/\d+$/)?.[0] || '0');
      if (numA && numB) {
        return numB - numA;
      }
      
      return 0;
    });
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDevotions();
      loadReels();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduleDate(tomorrow.toISOString().split('T')[0]);
      setReelScheduleDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  const loadDevotions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/devotions');
      const data = await response.json();
      if (data.success) {
        setDevotions({
          scheduled: sortDevotionsByNewest(data.data.scheduled),
          published: sortDevotionsByNewest(data.data.published)
        });
        console.log('📖 Loaded devotions:', {
          scheduled: data.data.scheduled.length,
          published: data.data.published.length
        });
        console.log('📖 Published devotions:', data.data.published.map(d => d.title));
      } else {
        console.error('Failed to load devotions:', data.error);
      }
    } catch (error) {
      console.error('Error loading devotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/reels');
      const data = await response.json();
      if (data.success) {
        setReels({
          scheduled: sortDevotionsByNewest(data.data.scheduled),
          published: sortDevotionsByNewest(data.data.published)
        });
      }
    } catch (error) {
      console.error('Error loading reels:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDevotion = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/admin/generate', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        setEditing(data.devotion);
        setShowDatePicker(true);
        loadDevotions();
      } else {
        alert('Failed to generate: ' + data.error);
      }
    } catch (error) {
      console.error('Error generating:', error);
      alert('Error generating devotion');
    } finally {
      setGenerating(false);
    }
  };

  const saveDevotion = async (devotion, scheduled = false) => {
    try {
      const response = await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devotion,
          scheduled,
          scheduleDate: scheduled ? scheduleDate : null,
          scheduleTime: scheduled ? scheduleTime : null
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(scheduled ? '✅ Scheduled!' : '✅ Published!');
        setEditing(null);
        setShowDatePicker(false);
        await loadDevotions();
      } else {
        alert('❌ Failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('❌ Error saving: ' + error.message);
    }
  };

  const saveReel = async (reel, scheduled = false) => {
    try {
      const response = await fetch('/api/admin/reels/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reel,
          scheduled,
          scheduleDate: scheduled ? reelScheduleDate : null,
          scheduleTime: scheduled ? reelScheduleTime : null
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(scheduled ? '✅ Reel Scheduled!' : '✅ Reel Published!');
        setEditingReel(null);
        setShowReelDatePicker(false);
        await loadReels();
      } else {
        alert('❌ Failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving reel:', error);
      alert('❌ Error saving reel: ' + error.message);
    }
  };

  const deleteDevotion = async (id, type) => {
    if (!confirm('Delete this?')) return;
    try {
      const response = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type })
      });
      const data = await response.json();
      if (data.success) {
        await loadDevotions();
      } else {
        alert('Failed to delete: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting');
    }
  };

  const deleteReel = async (id, type) => {
    if (!confirm('Delete this reel?')) return;
    try {
      const response = await fetch('/api/admin/reels/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type })
      });
      const data = await response.json();
      if (data.success) {
        await loadReels();
      } else {
        alert('Failed to delete reel: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting reel:', error);
      alert('Error deleting reel');
    }
  };

  const publishDevotion = async (devotion) => {
    console.log('📤 Publishing devotion:', devotion.title);
    
    try {
      const response = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devotion })
      });

      const data = await response.json();
      console.log('📥 Publish response:', data);

      if (data.success) {
        alert('✅ Published successfully!');
        await loadDevotions();
      } else {
        alert('❌ Failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error publishing:', error);
      alert('❌ Error publishing: ' + error.message);
    }
  };

  const publishReel = async (reel) => {
    try {
      const response = await fetch('/api/admin/reels/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reel })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Reel Published!');
        await loadReels();
      } else {
        alert('❌ Failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error publishing reel:', error);
      alert('❌ Error publishing reel: ' + error.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#101012',
        color: '#f7f4ef'
      }}>
        <div style={{
          background: '#18181c',
          padding: '40px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <h2 style={{ marginBottom: '20px' }}>Admin Dashboard</h2>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0a0a0c',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                color: '#f7f4ef',
                fontSize: '16px',
                marginBottom: '16px'
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#101012',
      color: '#f7f4ef',
      minHeight: '100vh',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 32px)' }}>📖 Admin Dashboard</h1>
          <button
            type="button"
            onClick={() => setIsAuthenticated(false)}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#a3a3a3',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0',
          background: '#18181c',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
          marginBottom: '24px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('devotions')}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: activeTab === 'devotions' ? '#7c3aed' : 'transparent',
              color: activeTab === 'devotions' ? '#fff' : '#a3a3a3',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📖 Devotions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reels')}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: activeTab === 'reels' ? '#7c3aed' : 'transparent',
              color: activeTab === 'reels' ? '#fff' : '#a3a3a3',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🎬 Reels
          </button>
        </div>

        {/* ===== DEVOTIONS TAB ===== */}
        {activeTab === 'devotions' && (
          <div style={{
            background: '#18181c',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <h3 style={{ marginBottom: '12px' }}>📖 Devotions</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <button
                type="button"
                onClick={generateDevotion}
                disabled={generating}
                style={{
                  padding: '12px 24px',
                  background: generating ? '#2a2a2e' : '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: generating ? 'not-allowed' : 'pointer'
                }}
              >
                {generating ? 'Generating...' : '✨ Generate New Devotion'}
              </button>
            </div>

            {editing && (
              <div style={{
                background: '#0a0a0c',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: '16px'
              }}>
                <h4 style={{ marginBottom: '12px' }}>Edit Devotion</h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <input
                    value={editing.title || ''}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    placeholder="Title"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#101012',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      color: '#f7f4ef',
                      fontSize: '14px'
                    }}
                  />
                  <textarea
                    value={editing.scripture || ''}
                    onChange={(e) => setEditing({ ...editing, scripture: e.target.value })}
                    placeholder="Scripture"
                    rows="2"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#101012',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      color: '#f7f4ef',
                      fontSize: '14px'
                    }}
                  />
                  <textarea
                    value={editing.story || ''}
                    onChange={(e) => setEditing({ ...editing, story: e.target.value })}
                    placeholder="Story"
                    rows="6"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#101012',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      color: '#f7f4ef',
                      fontSize: '14px'
                    }}
                  />
                  <textarea
                    value={editing.prayer || ''}
                    onChange={(e) => setEditing({ ...editing, prayer: e.target.value })}
                    placeholder="Prayer"
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#101012',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      color: '#f7f4ef',
                      fontSize: '14px'
                    }}
                  />
                  <input
                    value={editing.category || ''}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    placeholder="Category"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#101012',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      color: '#f7f4ef',
                      fontSize: '14px'
                    }}
                  />
                  <input
                    value={editing.person || ''}
                    onChange={(e) => setEditing({ ...editing, person: e.target.value })}
                    placeholder="Person"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#101012',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      color: '#f7f4ef',
                      fontSize: '14px'
                    }}
                  />
                </div>

                {showDatePicker && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    background: '#101012',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div>
                        <label style={{ fontSize: '14px', color: '#6a6a6a', display: 'block', marginBottom: '4px' }}>Schedule Date</label>
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          style={{
                            padding: '10px',
                            background: '#0a0a0c',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px',
                            color: '#f7f4ef',
                            fontSize: '14px',
                            width: '200px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '14px', color: '#6a6a6a', display: 'block', marginBottom: '4px' }}>Schedule Time</label>
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          style={{
                            padding: '10px',
                            background: '#0a0a0c',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px',
                            color: '#f7f4ef',
                            fontSize: '14px',
                            width: '150px'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!showDatePicker) {
                        setShowDatePicker(true);
                      } else {
                        saveDevotion(editing, true);
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#7c3aed',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    {showDatePicker ? '📅 Confirm Schedule' : '📅 Schedule'}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveDevotion(editing, false)}
                    style={{
                      padding: '8px 16px',
                      background: '#22c55e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    🚀 Publish Immediately
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      setShowDatePicker(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: '#a3a3a3',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Scheduled Devotions - Sorted Newest First */}
            <div style={{
              background: '#0a0a0c',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.06)',
              marginBottom: '16px'
            }}>
              <h4 style={{ marginBottom: '12px' }}>📅 Scheduled Devotions ({devotions.scheduled.length})</h4>
              {loading ? (
                <p>Loading...</p>
              ) : devotions.scheduled.length === 0 ? (
                <p>No scheduled devotions</p>
              ) : (
                <div>
                  {devotions.scheduled.map((dev, index) => (
                    <div
                      key={dev.id}
                      style={{
                        padding: '12px',
                        background: '#101012',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '500' }}>#{index + 1} {dev.title}</div>
                        <div style={{ fontSize: '12px', color: '#6a6a6a' }}>
                          {dev.category} • Scheduled: {dev.scheduleDate} at {dev.scheduleTime}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(dev);
                            setShowDatePicker(true);
                            setScheduleDate(dev.scheduleDate || '');
                            setScheduleTime(dev.scheduleTime || '08:00');
                          }}
                          style={{
                            padding: '4px 12px',
                            background: '#4a4a4e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => publishDevotion(dev)}
                          style={{
                            padding: '4px 12px',
                            background: '#22c55e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Publish Now
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteDevotion(dev.id, 'scheduled')}
                          style={{
                            padding: '4px 12px',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Published Devotions - Sorted Newest First */}
            <div style={{
              background: '#0a0a0c',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <h4 style={{ marginBottom: '12px' }}>✅ Published Devotions ({devotions.published.length})</h4>
              {loading ? (
                <p>Loading...</p>
              ) : devotions.published.length === 0 ? (
                <p>No published devotions</p>
              ) : (
                <div>
                  {devotions.published.map((dev, index) => (
                    <div
                      key={dev.id}
                      style={{
                        padding: '12px',
                        background: '#101012',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '500' }}>#{index + 1} {dev.title}</div>
                        <div style={{ fontSize: '12px', color: '#6a6a6a' }}>
                          {dev.category} • Published: {dev.publishedDate}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(dev);
                            setShowDatePicker(false);
                          }}
                          style={{
                            padding: '4px 12px',
                            background: '#4a4a4e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteDevotion(dev.id, 'published')}
                          style={{
                            padding: '4px 12px',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== REELS TAB ===== */}
        {activeTab === 'reels' && (
          <div style={{
            background: '#18181c',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <h3 style={{ marginBottom: '12px' }}>🎬 Reels Manager (20 Slots)</h3>
            <p style={{ color: '#6a6a6a', fontSize: '14px', marginBottom: '16px' }}>
              Paste YouTube URLs below. Each slot will become a reel in the feed. 
              {reels.published.length > 0 && ` ${reels.published.length} reels currently published.`}
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '12px',
              marginBottom: '20px'
            }}>
              {Array(20).fill(null).map((_, index) => {
                const reel = reels.published[index] || { videoId: '', title: '' };
                const isFilled = reel.videoId && reel.videoId.trim() !== '';
                const videoId = isFilled ? reel.videoId.trim() : '';
                
                return (
                  <div
                    key={index}
                    style={{
                      background: '#0a0a0c',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${isFilled ? 'rgba(124, 58, 237, 0.4)' : 'rgba(255,255,255,0.06)'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: isFilled ? '#7c3aed' : '#4a4a4a'
                      }}>
                        #{index + 1}
                      </span>
                      {isFilled && (
                        <span style={{
                          fontSize: '10px',
                          color: '#22c55e',
                          background: 'rgba(34, 197, 94, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          ✓ Filled
                        </span>
                      )}
                    </div>

                    <input
                      type="text"
                      className="reel-input"
                      placeholder="Paste YouTube URL..."
                      defaultValue={reel.videoId || ''}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#101012',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '6px',
                        color: '#f7f4ef',
                        fontSize: '13px',
                        marginBottom: '6px',
                        fontFamily: 'monospace'
                      }}
                    />
                    
                    <input
                      type="text"
                      className="reel-title-input"
                      placeholder="Title (optional)"
                      defaultValue={reel.title || `Reel ${index + 1}`}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        background: '#101012',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '6px',
                        color: '#f7f4ef',
                        fontSize: '12px'
                      }}
                    />

                    {isFilled && videoId && (
                      <div style={{
                        marginTop: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <img 
                          src={`https://img.youtube.com/vi/${videoId}/default.jpg`}
                          alt="Preview"
                          style={{
                            width: '48px',
                            height: '36px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.06)'
                          }}
                        />
                        <span style={{
                          fontSize: '10px',
                          color: '#4a4a4a',
                          fontFamily: 'monospace',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '140px'
                        }}>
                          {videoId}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              padding: '16px',
              background: '#0a0a0c',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <button
                type="button"
                onClick={async () => {
                  const inputs = document.querySelectorAll('.reel-input');
                  const newReels = [];
                  inputs.forEach((input, idx) => {
                    const videoId = input.value.trim();
                    if (videoId) {
                      const titleInput = input.parentElement.querySelector('.reel-title-input');
                      newReels.push({
                        videoId: videoId,
                        title: titleInput ? titleInput.value.trim() || `Reel ${idx + 1}` : `Reel ${idx + 1}`
                      });
                    }
                  });

                  if (newReels.length === 0) {
                    alert('Please add at least one video URL');
                    return;
                  }

                  let successCount = 0;
                  for (const reel of newReels) {
                    try {
                      const response = await fetch('/api/admin/reels/schedule', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          reel: { ...reel, videoId: reel.videoId },
                          scheduled: false
                        })
                      });
                      const data = await response.json();
                      if (data.success) successCount++;
                    } catch (err) {
                      console.error('Error saving reel:', err);
                    }
                  }

                  alert(`✅ ${successCount} reels saved successfully!`);
                  loadReels();
                }}
                style={{
                  padding: '12px 32px',
                  background: '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                💾 Save All Reels
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear all published reels?')) {
                    reels.published.forEach(reel => {
                      fetch('/api/admin/reels/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: reel.id, type: 'published' })
                      });
                    });
                    setTimeout(() => loadReels(), 500);
                  }
                }}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#ef4444',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🗑️ Clear All
              </button>
            </div>

            <div style={{
              background: '#0a0a0c',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.06)',
              marginTop: '16px'
            }}>
              <h4 style={{ marginBottom: '12px' }}>📋 Published Reels ({reels.published.length})</h4>
              {reels.published.length === 0 ? (
                <p style={{ color: '#4a4a4a', fontSize: '14px' }}>No reels published yet. Use the slots above to add videos.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {reels.published.map((reel, idx) => (
                    <div
                      key={reel.id || idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#101012',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.04)',
                        flexWrap: 'wrap',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img 
                          src={`https://img.youtube.com/vi/${reel.videoId}/default.jpg`}
                          alt=""
                          style={{ width: '32px', height: '24px', objectFit: 'cover', borderRadius: '3px' }}
                        />
                        <div>
                          <div style={{ fontSize: '13px' }}>{reel.title || 'Untitled Reel'}</div>
                          <div style={{ fontSize: '10px', color: '#4a4a4a' }}>{reel.videoId}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{
                          fontSize: '10px',
                          color: '#22c55e',
                          background: 'rgba(34, 197, 94, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          Published
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteReel(reel.id, 'published')}
                          style={{
                            padding: '2px 10px',
                            background: 'transparent',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '4px',
                            color: '#ef4444',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}