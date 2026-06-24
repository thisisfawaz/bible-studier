"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

// Load the YouTube IFrame API
const loadYouTubeAPI = () => {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onload = () => {
      // Wait for YT to be ready
      const checkReady = () => {
        if (window.YT && window.YT.Player) {
          resolve(window.YT);
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    };
    document.body.appendChild(script);
  });
};

export default function ReelsFeed({ onClose }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const isTransitioning = useRef(false);
  const apiRef = useRef(null);

  // Load videos and initialize player
  useEffect(() => {
    async function loadVideos() {
      try {
        const response = await fetch('/api/reels');
        const data = await response.json();
        
        if (data.success && data.videos.length > 0) {
          setVideos(data.videos);
          // Initialize player after videos are loaded
          await initPlayer(data.videos[0].id);
        } else {
          setError('No videos found');
        }
      } catch (err) {
        setError(err.message || 'Failed to load videos');
      } finally {
        setLoading(false);
      }
    }
    
    loadVideos();
  }, []);

  // Initialize YouTube Player
  const initPlayer = useCallback(async (videoId) => {
    try {
      const YT = await loadYouTubeAPI();
      apiRef.current = YT;
      
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new YT.Player(playerContainerRef.current, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          controls: 0,
          loop: 1,
          playlist: videoId,
          mute: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            setIsPlayerReady(true);
            setIsPlaying(true);
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
              setIsPlaying(false);
            }
          },
          onError: (error) => {
            console.error('YouTube Player Error:', error);
          }
        }
      });
    } catch (err) {
      console.error('Failed to initialize YouTube player:', err);
    }
  }, []);

  // Change video
  const changeVideo = useCallback((videoId) => {
    if (playerRef.current && isPlayerReady) {
      playerRef.current.loadVideoById({
        videoId: videoId,
        startSeconds: 0,
      });
      setIsPlaying(true);
    }
  }, [isPlayerReady]);

  // Touch handlers for swipe detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
    };

    const handleTouchEnd = (e) => {
      if (isTransitioning.current) return;
      
      touchEndY.current = e.changedTouches[0].clientY;
      const diff = touchStartY.current - touchEndY.current;
      
      if (Math.abs(diff) < 30) return;
      
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [videos.length, currentIndex]);

  // Wheel handler for desktop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let wheelTimeout = null;

    const handleWheel = (e) => {
      if (isTransitioning.current) return;
      
      e.preventDefault();
      
      if (wheelTimeout) return;
      
      wheelTimeout = setTimeout(() => {
        wheelTimeout = null;
      }, 800);

      if (e.deltaY > 0) {
        goToNext();
      } else if (e.deltaY < 0) {
        goToPrevious();
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (wheelTimeout) {
        clearTimeout(wheelTimeout);
      }
    };
  }, [videos.length, currentIndex]);

  const goToNext = () => {
    if (currentIndex < videos.length - 1 && !isTransitioning.current) {
      isTransitioning.current = true;
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      
      const container = containerRef.current;
      if (container) {
        const children = container.children;
        if (children[newIndex]) {
          container.scrollTo({
            top: children[newIndex].offsetTop,
            behavior: 'auto'
          });
        }
      }
      
      // Change video after scroll
      setTimeout(() => {
        changeVideo(videos[newIndex].id);
        isTransitioning.current = false;
      }, 200);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0 && !isTransitioning.current) {
      isTransitioning.current = true;
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      
      const container = containerRef.current;
      if (container) {
        const children = container.children;
        if (children[newIndex]) {
          container.scrollTo({
            top: children[newIndex].offsetTop,
            behavior: 'auto'
          });
        }
      }
      
      setTimeout(() => {
        changeVideo(videos[newIndex].id);
        isTransitioning.current = false;
      }, 200);
    }
  };

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="reels-fullscreen loading">
        <div className="loading-spinner"></div>
        <p>Loading reels...</p>
      </div>
    );
  }

  if (error || videos.length === 0) {
    return (
      <div className="reels-fullscreen empty">
        <div className="reels-empty-icon">🎬</div>
        <h3>No Reels Available</h3>
        <p>Check back later for new content!</p>
        <button onClick={onClose} className="reels-close-btn-bottom">Close</button>
      </div>
    );
  }

  return (
    <div className="reels-fullscreen">
      {/* Close button */}
      <button className="reels-close-btn" onClick={onClose}>✕</button>

      <div className="reels-feed-container" ref={containerRef}>
        {videos.map((video, index) => (
          <div 
            key={video.id} 
            className="reels-feed-item" 
            data-video-id={video.id}
            data-index={index}
          >
            <div className="reels-feed-video-wrapper">
              {/* Player container - only the active one gets the player */}
              {index === currentIndex ? (
                <div 
                  ref={playerContainerRef} 
                  className="reels-feed-player"
                />
              ) : (
                <div 
                  className="reels-feed-player-placeholder"
                  style={{ 
                    background: '#000',
                    width: '100%',
                    height: '100%',
                    maxWidth: '400px',
                    aspectRatio: '9/16',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '14px' }}>
                    {video.title.substring(0, 30)}...
                  </span>
                </div>
              )}
            </div>
            {/* Overlay Info */}
            <div className="reels-feed-overlay">
              <div className="reels-feed-info">
                <h3 className="reels-feed-title">{video.title}</h3>
                <p className="reels-feed-channel">{video.channelTitle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .reels-fullscreen {
          position: fixed;
          inset: 0;
          background: #000;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .reels-fullscreen.loading,
        .reels-fullscreen.error,
        .reels-fullscreen.empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #fff;
          text-align: center;
          padding: 20px;
        }

        .reels-empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        .reels-fullscreen.empty h3 {
          font-size: 20px;
          font-weight: 500;
          margin: 0 0 4px 0;
        }
        .reels-fullscreen.empty p {
          font-size: 14px;
          color: rgba(255,255,255,0.6);
          margin: 0 0 16px 0;
        }
        .reels-close-btn-bottom {
          padding: 8px 24px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.2);
          background: transparent;
          color: #fff;
          cursor: pointer;
          font-family: var(--font);
          transition: all 0.2s;
        }
        .reels-close-btn-bottom:hover {
          background: rgba(255,255,255,0.1);
        }

        .reels-close-btn {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 1001;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(12px);
          border: none;
          color: #fff;
          font-size: 22px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          font-family: var(--font);
        }
        .reels-close-btn:hover {
          background: rgba(255,255,255,0.2);
          transform: scale(1.05);
        }

        .reels-feed-container {
          flex: 1;
          overflow-y: scroll;
          height: 100vh;
          background: #000;
          position: relative;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: y mandatory;
          scroll-behavior: auto;
        }

        .reels-feed-item {
          height: 100vh;
          width: 100%;
          position: relative;
          background: #000;
          flex-shrink: 0;
          scroll-snap-align: start;
          overflow: hidden;
        }

        .reels-feed-video-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
        }

        .reels-feed-player {
          width: 100%;
          height: 100%;
          max-width: 400px;
          aspect-ratio: 9 / 16;
          background: #000;
        }

        .reels-feed-player-placeholder {
          max-width: 400px;
          aspect-ratio: 9 / 16;
          background: #000;
        }

        .reels-feed-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 60px 16px 30px;
          background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          pointer-events: none;
        }
        .reels-feed-info {
          pointer-events: auto;
          flex: 1;
        }
        .reels-feed-title {
          font-size: 16px;
          font-weight: 500;
          color: #fff;
          margin: 0 0 4px 0;
          text-shadow: 0 2px 8px rgba(0,0,0,0.8);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .reels-feed-channel {
          font-size: 13px;
          color: rgba(255,255,255,0.8);
          margin: 0;
          text-shadow: 0 2px 8px rgba(0,0,0,0.8);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .reels-feed-player {
            max-width: 100%;
          }
          .reels-feed-player-placeholder {
            max-width: 100%;
          }
          .reels-close-btn {
            top: 12px;
            left: 12px;
            width: 36px;
            height: 36px;
            font-size: 18px;
          }
          .reels-feed-title {
            font-size: 14px;
          }
          .reels-feed-channel {
            font-size: 12px;
          }
        }

        @media (max-width: 480px) {
          .reels-feed-player {
            max-width: 100%;
          }
          .reels-feed-player-placeholder {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}