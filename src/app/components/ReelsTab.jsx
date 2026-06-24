"use client";

import { useState, useEffect } from 'react';

export default function ReelsTab() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    async function loadVideos() {
      try {
        const response = await fetch('/api/reels');
        const data = await response.json();
        
        if (data.success) {
          setVideos(data.videos);
        } else {
          setError(data.error || 'Failed to load videos');
        }
      } catch (err) {
        setError(err.message || 'Failed to load videos');
      } finally {
        setLoading(false);
      }
    }
    
    loadVideos();
  }, []);

  const shuffleVideos = () => {
    setVideos(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const openVideo = (video) => {
    setSelectedVideo(video);
  };

  const closeVideo = () => {
    setSelectedVideo(null);
  };

  if (loading) {
    return (
      <div className="reels-loading">
        <div className="loading-spinner"></div>
        <p>Loading sermon reels...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reels-error">
        <p>⚠️ {error}</p>
        <button onClick={() => window.location.reload()} className="reels-retry-btn">
          Try Again
        </button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="reels-empty">
        <p>No videos found. Check back later!</p>
      </div>
    );
  }

  return (
    <div className="reels-container">
      <div className="reels-header">
        <h2>🎬 Sermon Reels</h2>
        <button onClick={shuffleVideos} className="reels-shuffle-btn">
          🔀 Shuffle
        </button>
      </div>

      <div className="reels-grid">
        {videos.map((video) => (
          <div key={video.id} className="reels-card" onClick={() => openVideo(video)}>
            <div className="reels-thumbnail">
              <img src={video.thumbnail} alt={video.title} loading="lazy" />
              <div className="reels-play-overlay">
                <span className="reels-play-icon">▶</span>
              </div>
            </div>
            <div className="reels-info">
              <h3 className="reels-title">{video.title}</h3>
              <p className="reels-channel">{video.channelTitle}</p>
              <p className="reels-date">{new Date(video.publishedAt).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Video Lightbox */}
      {selectedVideo && (
        <div className="reels-lightbox" onClick={closeVideo}>
          <div className="reels-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="reels-lightbox-close" onClick={closeVideo}>✕</button>
            <div className="reels-lightbox-video">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&rel=0`}
                title={selectedVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="reels-lightbox-info">
              <h3>{selectedVideo.title}</h3>
              <p>{selectedVideo.channelTitle}</p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .reels-container {
          flex: 1;
          overflow-y: auto;
          padding-right: 4px;
          min-height: 0;
        }

        .reels-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .reels-header h2 {
          font-size: 20px;
          font-weight: 500;
          color: var(--text-primary);
          margin: 0;
        }

        .reels-shuffle-btn {
          padding: 6px 16px;
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
        .reels-shuffle-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--border-light);
        }

        .reels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .reels-card {
          background: var(--bg-card);
          border-radius: var(--radius);
          border: 1px solid var(--border-color);
          overflow: hidden;
          cursor: pointer;
          transition: all 0.25s;
        }
        .reels-card:hover {
          border-color: var(--border-light);
          transform: translateY(-4px);
          box-shadow: 0 8px 24px var(--shadow);
        }

        .reels-thumbnail {
          position: relative;
          aspect-ratio: 16 / 9;
          background: var(--bg-secondary);
          overflow: hidden;
        }
        .reels-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .reels-play-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.25s;
        }
        .reels-card:hover .reels-play-overlay {
          opacity: 1;
        }
        .reels-play-icon {
          font-size: 48px;
          color: white;
          text-shadow: 0 2px 8px rgba(0,0,0,0.5);
        }

        .reels-info {
          padding: 12px 14px;
        }
        .reels-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          margin: 0 0 4px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.4;
        }
        .reels-channel {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0 0 2px 0;
        }
        .reels-date {
          font-size: 12px;
          color: var(--text-muted);
          margin: 0;
        }

        /* Lightbox */
        .reels-lightbox {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }
        .reels-lightbox-content {
          background: var(--bg-card);
          border-radius: var(--radius);
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          position: relative;
        }
        .reels-lightbox-close {
          position: absolute;
          top: 12px;
          right: 16px;
          background: none;
          border: none;
          color: white;
          font-size: 28px;
          cursor: pointer;
          z-index: 10;
          text-shadow: 0 2px 8px rgba(0,0,0,0.5);
          transition: transform 0.2s;
        }
        .reels-lightbox-close:hover {
          transform: scale(1.2);
        }
        .reels-lightbox-video {
          position: relative;
          padding-bottom: 56.25%;
          height: 0;
          background: #000;
        }
        .reels-lightbox-video iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        .reels-lightbox-info {
          padding: 16px 20px;
        }
        .reels-lightbox-info h3 {
          font-size: 18px;
          font-weight: 500;
          color: var(--text-primary);
          margin: 0 0 4px 0;
        }
        .reels-lightbox-info p {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
        }

        .reels-loading, .reels-error, .reels-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: var(--text-muted);
          text-align: center;
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-color);
          border-top-color: var(--accent-purple);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }
        .reels-retry-btn {
          margin-top: 12px;
          padding: 8px 20px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-primary);
          cursor: pointer;
          font-family: var(--font);
          transition: all 0.2s;
        }
        .reels-retry-btn:hover {
          background: var(--bg-hover);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (max-width: 600px) {
          .reels-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .reels-lightbox-content {
            max-height: 95vh;
          }
        }
        @media (max-width: 400px) {
          .reels-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}