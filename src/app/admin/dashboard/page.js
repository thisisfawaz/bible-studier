"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Simple auth check (you can expand this)
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [devotions, setDevotions] = useState({ scheduled: [], published: [] });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      loadDevotions();
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
        setDevotions(data.data);
      }
    } catch (error) {
      console.error('Error loading devotions:', error);
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
        // Reload the list
        loadDevotions();
      } else {
        alert('Failed to generate devotion: ' + data.error);
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
        body: JSON.stringify({ devotion, scheduled })
      });
      const data = await response.json();
      if (data.success) {
        alert('Devotion saved successfully!');
        setEditing(null);
        loadDevotions();
      } else {
        alert('Failed to save: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving devotion');
    }
  };

  const deleteDevotion = async (id, type) => {
    if (!confirm('Are you sure you want to delete this devotion?')) return;
    try {
      const response = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type })
      });
      const data = await response.json();
      if (data.success) {
        loadDevotions();
      } else {
        alert('Failed to delete: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting devotion');
    }
  };

  const publishDevotion = async (devotion) => {
    try {
      const response = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devotion })
      });
      const data = await response.json();
      if (data.success) {
        alert('Devotion published!');
        loadDevotions();
      } else {
        alert('Failed to publish: ' + data.error);
      }
    } catch (error) {
      console.error('Error publishing:', error);
      alert('Error publishing devotion');
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1>📖 Devotion Admin</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#6a6a6a' }}>Logged in</span>
            <button
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
        </div>

        {/* Generate New */}
        <div style={{
          background: '#18181c',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
          marginBottom: '24px'
        }}>
          <h3 style={{ marginBottom: '12px' }}>Generate New Devotion</h3>
          <p style={{ fontSize: '14px', color: '#6a6a6a', marginBottom: '16px' }}>
            Click the button below to generate a new devotion using AI. You can then edit it before scheduling.
          </p>
          <button
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

        {/* Editor */}
        {editing && (
          <div style={{
            background: '#18181c',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '24px'
          }}>
            <h3 style={{ marginBottom: '16px' }}>Edit Devotion</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '14px', color: '#6a6a6a', display: 'block', marginBottom: '4px' }}>Title</label>
                <input
                  value={editing.title || ''}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#0a0a0c',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    color: '#f7f4ef',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '14px', color: '#6a6a6a', display: 'block', marginBottom: '4px' }}>Scripture</label>
                <textarea
                  value={editing.scripture || ''}
                  onChange={(e) => setEditing({ ...editing, scripture: e.target.value })}
                  rows="2"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#0a0a0c',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    color: '#f7f4ef',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '14px', color: '#6a6a6a', display: 'block', marginBottom: '4px' }}>Story</label>
                <textarea
                  value={editing.story || ''}
                  onChange={(e) => setEditing({ ...editing, story: e.target.value })}
                  rows="6"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#0a0a0c',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    color: '#f7f4ef',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '14px', color: '#6a6a6a', display: 'block', marginBottom: '4px' }}>Prayer</label>
                <textarea
                  value={editing.prayer || ''}
                  onChange={(e) => setEditing({ ...editing, prayer: e.target.value })}
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#0a0a0c',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    color: '#f7f4ef',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '14px', color: '#6a6a6a', display: 'block', marginBottom: '4px' }}>Category</label>
                <input
                  value={editing.category || ''}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#0a0a0c',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    color: '#f7f4ef',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '14px', color: '#6a6a6a', display: 'block', marginBottom: '4px' }}>Person (optional)</label>
                <input
                  value={editing.person || ''}
                  onChange={(e) => setEditing({ ...editing, person: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#0a0a0c',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    color: '#f7f4ef',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={() => saveDevotion(editing, true)}
                style={{
                  padding: '10px 20px',
                  background: '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                💾 Schedule (Set Date/Time)
              </button>
              <button
                onClick={() => publishDevotion(editing)}
                style={{
                  padding: '10px 20px',
                  background: '#22c55e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                🚀 Publish Immediately
              </button>
              <button
                onClick={() => setEditing(null)}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#a3a3a3',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Scheduled Devotions */}
        <div style={{
          background: '#18181c',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
          marginBottom: '24px'
        }}>
          <h3 style={{ marginBottom: '12px' }}>📅 Scheduled Devotions</h3>
          {loading ? (
            <p style={{ color: '#6a6a6a' }}>Loading...</p>
          ) : devotions.scheduled.length === 0 ? (
            <p style={{ color: '#6a6a6a' }}>No scheduled devotions</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {devotions.scheduled.map((dev, index) => (
                <div key={dev.id || index} style={{
                  padding: '16px',
                  background: '#0a0a0c',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{dev.title}</div>
                    <div style={{ fontSize: '13px', color: '#6a6a6a' }}>
                      {dev.category} • Scheduled: {dev.scheduleDate} at {dev.scheduleTime}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setEditing(dev)}
                      style={{
                        padding: '6px 14px',
                        background: '#4a4a4e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => publishDevotion(dev)}
                      style={{
                        padding: '6px 14px',
                        background: '#22c55e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Publish Now
                    </button>
                    <button
                      onClick={() => deleteDevotion(dev.id || dev.title, 'scheduled')}
                      style={{
                        padding: '6px 14px',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
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

        {/* Published Devotions */}
        <div style={{
          background: '#18181c',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <h3 style={{ marginBottom: '12px' }}>✅ Published Devotions</h3>
          {loading ? (
            <p style={{ color: '#6a6a6a' }}>Loading...</p>
          ) : devotions.published.length === 0 ? (
            <p style={{ color: '#6a6a6a' }}>No published devotions</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {devotions.published.map((dev, index) => (
                <div key={dev.id || index} style={{
                  padding: '16px',
                  background: '#0a0a0c',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{dev.title}</div>
                    <div style={{ fontSize: '13px', color: '#6a6a6a' }}>
                      {dev.category} • Published: {dev.publishedDate}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setEditing(dev)}
                      style={{
                        padding: '6px 14px',
                        background: '#4a4a4e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteDevotion(dev.id || dev.title, 'published')}
                      style={{
                        padding: '6px 14px',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
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
    </div>
  );
}