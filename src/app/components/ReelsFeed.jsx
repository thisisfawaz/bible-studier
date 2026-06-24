"use client";

import { useState, useEffect, useRef } from 'react';

export default function ReelsFeed({ onClose }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const containerRef = useRef(null);
  const videoRefs = useRef({});
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const isTransitioning = useRef(false);

  useEffect(() => {
    async function loadVideos() {
      try {
        const response = await fetch('/api/reels');
        const data = await response.json();
        
        if (data.success && data.videos.length > 0) {
          setVideos(data.videos);
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
      setIsVideoReady(false);
      
      const currentVideo = videos[currentIndex];
      if (currentVideo && videoRefs.current[currentVideo.id]) {
        videoRefs.current[currentVideo.id]?.contentWindow?.postMessage(
          '{"event":"command","func":"pauseVideo","args":""}',
          '*'
        );
      }
      
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
        const nextVideo = videos[newIndex];
        if (nextVideo && videoRefs.current[nextVideo.id]) {
          videoRefs.current[nextVideo.id]?.contentWindow?.postMessage(
            '{"event":"command","func":"seekTo","args":[0, true]}',
            '*'
          );
          setTimeout(() => {
            videoRefs.current[nextVideo.id]?.contentWindow?.postMessage(
              '{"event":"command","func":"playVideo","args":""}',
              '*'
            );
            setIsVideoReady(true);
          }, 200);
        }
        isTransitioning.current = false;
      }, 400);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0 && !isTransitioning.current) {
      isTransitioning.current = true;
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setIsVideoReady(false);
      
      const currentVideo = videos[currentIndex];
      if (currentVideo && videoRefs.current[currentVideo.id]) {
        videoRefs.current[currentVideo.id]?.contentWindow?.postMessage(
          '{"event":"command","func":"pauseVideo","args":""}',
          '*'
        );
      }
      
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
        const prevVideo = videos[newIndex];
        if (prevVideo && videoRefs.current[prevVideo.id]) {
          videoRefs.current[prevVideo.id]?.contentWindow?.postMessage(
            '{"event":"command","func":"seekTo","args":[0, true]}',
            '*'
          );
          setTimeout(() => {
            videoRefs.current[prevVideo.id]?.contentWindow?.postMessage(
              '{"event":"command","func":"playVideo","args":""}',
              '*'
            );
            setIsVideoReady(true);
          }, 200);
        }
        isTransitioning.current = false;
      }, 400);
    }
  };

  // Play first video automatically when loaded
  useEffect(() => {
    if (videos.length > 0) {
      const firstVideo = videos[0];
      const firstIframe = videoRefs.current[firstVideo?.id];
      if (firstIframe) {
        setTimeout(() => {
          firstIframe.contentWindow?.postMessage(
            '{"event":"command","func":"seekTo","args":[0, true]}',
            '*'
          );
          setTimeout(() => {
            firstIframe.contentWindow?.postMessage(
              '{"event":"command","func":"playVideo","args":""}',
              '*'
            );
            setIsVideoReady(true);
          }, 300);
        }, 600);
      }
    }
  }, [videos]);

  // Handle iframe load
  const handleIframeLoad = (videoId) => {
    const iframe = videoRefs.current[videoId];
    if (iframe) {
      setTimeout(() => {
        iframe.contentWindow?.postMessage(
          '{"event":"command","func":"playVideo","args":""}',
          '*'
        );
      }, 200);
    }
  };

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
      {/* Close button - top left */}
      <button className="reels-close-btn" onClick={onClose}>
        ✕
      </button>

      {/* Loading overlay for first video */}
      {!isVideoReady && currentIndex === 0 && (
        <div className="reels-loading-overlay">
          <div className="loading-spinner-small"></div>
        </div>
      )}

      <div className="reels-feed-container" ref={containerRef}>
        {videos.map((video) => (
          <div 
            key={video.id} 
            className="reels-feed-item" 
            data-video-id={video.id}
          >
            <div className="reels-feed-video-wrapper">
              <iframe
                ref={(el) => {
                  if (el) {
                    videoRefs.current[video.id] = el;
                  }
                }}
                src={`https://www.youtube.com/embed/${video.id}?autoplay=0&rel=0&controls=0&loop=1&playlist=${video.id}&enablejsapi=1`}
                title={video.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="reels-feed-video"
                onLoad={() => handleIframeLoad(video.id)}
              />
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

        .reels-loading-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1001;
        }
        .loading-spinner-small {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
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

        .reels-feed-video {
          width: 100%;
          height: 100%;
          max-width: 400px;
          aspect-ratio: 9 / 16;
          background: #000;
          pointer-events: none;
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
          .reels-feed-video {
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
          .reels-feed-video {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}