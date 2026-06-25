"use client";

import { useState, useEffect, useRef } from 'react';

// Cache key for localStorage
const VIDEO_CACHE_KEY = 'cached_reels_data';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Default videos (fallback if cache is empty)
const DEFAULT_VIDEOS = [];

// Shuffle function
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function ReelsFeed({ onClose }) {
    const [videos, setVideos] = useState(DEFAULT_VIDEOS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const containerRef = useRef(null);
    const playersRef = useRef({});
    const touchStartY = useRef(0);
    const touchStartX = useRef(0);
    const touchStartTime = useRef(0);
    const isTransitioning = useRef(false);
    const [apiReady, setApiReady] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [showPlayIcon, setShowPlayIcon] = useState(false);
    const iconTimeoutRef = useRef(null);

    // Load videos from cache or fetch
    useEffect(() => {
        loadVideos();
        if (window.YT && window.YT.Player) {
            setApiReady(true);
        } else {
            const checkAPI = setInterval(() => {
                if (window.YT && window.YT.Player) {
                    setApiReady(true);
                    clearInterval(checkAPI);
                }
            }, 100);
            setTimeout(() => clearInterval(checkAPI), 5000);
        }
    }, []);

    const loadVideos = async () => {
        try {
            const cached = localStorage.getItem(VIDEO_CACHE_KEY);
            
            if (cached) {
                const { videos: cachedVideos, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                
                if (cachedVideos && cachedVideos.length > 0 && age < CACHE_DURATION) {
                    console.log('📦 Loading videos from cache...');
                    const shuffled = shuffleArray(cachedVideos);
                    setVideos(shuffled);
                    setLoading(false);
                    setIsInitialLoad(false);
                    fetchVideosInBackground();
                    return;
                }
            }

            await fetchAndCacheVideos();
        } catch (err) {
            console.error('Error loading videos:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    const fetchAndCacheVideos = async () => {
        try {
            const response = await fetch('/api/reels');
            const data = await response.json();

            if (data.success && data.videos.length > 0) {
                localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify({
                    videos: data.videos,
                    timestamp: Date.now()
                }));
                const shuffled = shuffleArray(data.videos);
                setVideos(shuffled);
                setIsInitialLoad(false);
            } else {
                setError('No videos found');
            }
        } catch (err) {
            console.error('Error fetching videos:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchVideosInBackground = async () => {
        try {
            const response = await fetch('/api/reels');
            const data = await response.json();
            
            if (data.success && data.videos.length > 0) {
                const cached = JSON.parse(localStorage.getItem(VIDEO_CACHE_KEY) || '{}');
                const cachedVideos = cached.videos || [];
                
                if (data.videos.length !== cachedVideos.length) {
                    localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify({
                        videos: data.videos,
                        timestamp: Date.now()
                    }));
                    const shuffled = shuffleArray(data.videos);
                    setVideos(shuffled);
                    console.log('🔄 Cache updated with new videos');
                }
            }
        } catch (err) {
            console.log('Background update failed, using cached videos');
        }
    };

    // Toggle play/pause for current video
    const togglePlayPause = () => {
        const currentVideo = videos[currentIndex];
        if (!currentVideo || !playersRef.current[currentVideo.id]) return;

        const player = playersRef.current[currentVideo.id];
        try {
            if (isPaused) {
                player.playVideo();
                setIsPaused(false);
                setShowPlayIcon(false);
                if (iconTimeoutRef.current) {
                    clearTimeout(iconTimeoutRef.current);
                }
            } else {
                player.pauseVideo();
                setIsPaused(true);
                setShowPlayIcon(true);
                if (iconTimeoutRef.current) {
                    clearTimeout(iconTimeoutRef.current);
                }
                iconTimeoutRef.current = setTimeout(() => {
                    setShowPlayIcon(false);
                }, 2000);
            }
        } catch (err) {
            console.error('Error toggling play/pause:', err);
        }
    };

    // Initialize players when API is ready
    useEffect(() => {
        if (apiReady && videos.length > 0 && !isInitialLoad) {
            videos.forEach(video => {
                const img = new Image();
                img.src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
            });
            
            setTimeout(() => {
                initializePlayers();
            }, 50);
        }
    }, [apiReady, videos, isInitialLoad]);

    const initializePlayers = () => {
        videos.forEach((video, index) => {
            const elementId = `player-${video.id}`;
            const element = document.getElementById(elementId);
            if (element && !playersRef.current[video.id]) {
                try {
                    const player = new window.YT.Player(elementId, {
                        height: '100%',
                        width: '100%',
                        videoId: video.id,
                        playerVars: {
                            autoplay: index === 0 ? 1 : 0,
                            controls: 0,
                            rel: 0,
                            loop: 1,
                            playlist: video.id,
                            modestbranding: 1,
                            playsinline: 1,
                            origin: window.location.origin,
                            enablejsapi: 1,
                            iv_load_policy: 3,
                            showinfo: 0,
                            fs: 0,
                            disablekb: 1
                        },
                        events: {
                            onReady: (event) => {
                                if (index === 0) {
                                    event.target.playVideo();
                                    setIsPaused(false);
                                    setShowPlayIcon(false);
                                }
                            },
                            onStateChange: (event) => {
                                if (event.data === window.YT.PlayerState.ENDED) {
                                    event.target.seekTo(0);
                                    event.target.playVideo();
                                    setIsPaused(false);
                                    setShowPlayIcon(false);
                                }
                                if (event.data === window.YT.PlayerState.PAUSED) {
                                    setIsPaused(true);
                                    setShowPlayIcon(true);
                                    if (iconTimeoutRef.current) {
                                        clearTimeout(iconTimeoutRef.current);
                                    }
                                    iconTimeoutRef.current = setTimeout(() => {
                                        setShowPlayIcon(false);
                                    }, 2000);
                                }
                                if (event.data === window.YT.PlayerState.PLAYING) {
                                    setIsPaused(false);
                                    setShowPlayIcon(false);
                                    if (iconTimeoutRef.current) {
                                        clearTimeout(iconTimeoutRef.current);
                                    }
                                }
                            }
                        }
                    });
                    playersRef.current[video.id] = player;
                } catch (err) {
                    console.error('Error creating player:', err);
                }
            }
        });
    };

    // Safe play function
    const safePlayVideo = (videoId) => {
        try {
            const player = playersRef.current[videoId];
            if (player && typeof player.playVideo === 'function') {
                player.seekTo(0);
                player.playVideo();
                setIsPaused(false);
                setShowPlayIcon(false);
            }
        } catch (err) {
            console.error('Error playing video:', err);
        }
    };

    const safePauseVideo = (videoId) => {
        try {
            const player = playersRef.current[videoId];
            if (player && typeof player.pauseVideo === 'function') {
                player.pauseVideo();
                setIsPaused(true);
            }
        } catch (err) {
            console.error('Error pausing video:', err);
        }
    };

    const safeDestroyPlayer = (videoId) => {
        try {
            const player = playersRef.current[videoId];
            if (player && typeof player.destroy === 'function') {
                player.destroy();
            }
        } catch (err) {
            console.error('Error destroying player:', err);
        }
    };

    // Touch handlers with proper tap detection
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleTouchStart = (e) => {
            touchStartY.current = e.touches[0].clientY;
            touchStartX.current = e.touches[0].clientX;
            touchStartTime.current = Date.now();
        };

        const handleTouchMove = (e) => {
            // Prevent default to avoid scrolling
            e.preventDefault();
        };

        const handleTouchEnd = (e) => {
            if (isTransitioning.current) return;

            const touchEndY = e.changedTouches[0].clientY;
            const touchEndX = e.changedTouches[0].clientX;
            const diffY = touchStartY.current - touchEndY;
            const diffX = touchStartX.current - touchEndX;
            const timeDiff = Date.now() - touchStartTime.current;

            // Check if it's a tap (small movement, quick touch)
            if (Math.abs(diffY) < 20 && Math.abs(diffX) < 20 && timeDiff < 300) {
                e.preventDefault();
                e.stopPropagation();
                togglePlayPause();
                return;
            }

            // It's a swipe - check if vertical enough
            if (Math.abs(diffY) < 30) return;

            // Prevent default to avoid any page scroll
            e.preventDefault();
            e.stopPropagation();

            if (diffY > 0) {
                goToNext();
            } else {
                goToPrevious();
            }
        };

        const handleContextMenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: false });
        container.addEventListener('contextmenu', handleContextMenu);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
            container.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [videos.length, currentIndex, isPaused]);

    // Click handler for desktop
    const handleVideoClick = (e) => {
        if (e.target.closest('.reels-feed-overlay') || e.target.closest('.reels-close-btn')) {
            return;
        }
        togglePlayPause();
    };

    // Wheel handler
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
            
            // Pause current video
            const currentVideo = videos[currentIndex];
            if (currentVideo && playersRef.current[currentVideo.id]) {
                safePauseVideo(currentVideo.id);
            }

            // Update index
            setCurrentIndex(newIndex);
            setIsPaused(false);
            setShowPlayIcon(false);
            if (iconTimeoutRef.current) {
                clearTimeout(iconTimeoutRef.current);
            }

            // Scroll to the new video
            const container = containerRef.current;
            if (container) {
                const children = container.children;
                if (children && children[newIndex]) {
                    container.scrollTo({
                        top: children[newIndex].offsetTop,
                        behavior: 'auto'
                    });
                }
            }

            // Play the new video after scroll
            setTimeout(() => {
                const nextVideo = videos[newIndex];
                if (nextVideo && playersRef.current[nextVideo.id]) {
                    safePlayVideo(nextVideo.id);
                }
                isTransitioning.current = false;
            }, 250);
        } else {
            // If at the end, reset transition lock
            isTransitioning.current = false;
        }
    };

    const goToPrevious = () => {
        if (currentIndex > 0 && !isTransitioning.current) {
            isTransitioning.current = true;
            const newIndex = currentIndex - 1;
            
            // Pause current video
            const currentVideo = videos[currentIndex];
            if (currentVideo && playersRef.current[currentVideo.id]) {
                safePauseVideo(currentVideo.id);
            }

            // Update index
            setCurrentIndex(newIndex);
            setIsPaused(false);
            setShowPlayIcon(false);
            if (iconTimeoutRef.current) {
                clearTimeout(iconTimeoutRef.current);
            }

            // Scroll to the new video
            const container = containerRef.current;
            if (container) {
                const children = container.children;
                if (children && children[newIndex]) {
                    container.scrollTo({
                        top: children[newIndex].offsetTop,
                        behavior: 'auto'
                    });
                }
            }

            // Play the new video after scroll
            setTimeout(() => {
                const prevVideo = videos[newIndex];
                if (prevVideo && playersRef.current[prevVideo.id]) {
                    safePlayVideo(prevVideo.id);
                }
                isTransitioning.current = false;
            }, 250);
        } else {
            // If at the beginning, reset transition lock
            isTransitioning.current = false;
        }
    };

    // Cleanup players on unmount
    useEffect(() => {
        return () => {
            Object.keys(playersRef.current).forEach(videoId => {
                safeDestroyPlayer(videoId);
            });
            if (iconTimeoutRef.current) {
                clearTimeout(iconTimeoutRef.current);
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

    if (error && videos.length === 0) {
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
            <button className="reels-close-btn" onClick={onClose}>✕</button>

            <div className="reels-feed-container" ref={containerRef}>
                {videos.map((video, index) => (
                    <div
                        key={`${video.id}-${index}`}
                        className="reels-feed-item"
                        data-video-id={video.id}
                        onClick={index === currentIndex ? handleVideoClick : undefined}
                    >
                        <div className="reels-feed-video-wrapper">
                            <div id={`player-${video.id}`} className="reels-feed-video"></div>
                        </div>
                        <div className="reels-feed-overlay">
                            <div className="reels-feed-info">
                                <h3 className="reels-feed-title">{video.title}</h3>
                            </div>
                            {index === currentIndex && showPlayIcon && (
                                <div className="reels-play-icon">▶</div>
                            )}
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
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          touch-action: manipulation;
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
          touch-action: manipulation;
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
          cursor: pointer;
          touch-action: none;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
        }

        .reels-feed-item {
          height: 100vh;
          width: 100%;
          position: relative;
          background: #000;
          flex-shrink: 0;
          scroll-snap-align: start;
          overflow: hidden;
          touch-action: none;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
        }

        .reels-feed-video-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          pointer-events: none;
        }

        .reels-feed-video {
          width: 100%;
          height: 100%;
          max-width: 400px;
          aspect-ratio: 9 / 16;
          background: #000;
          pointer-events: none;
        }

        /* Hide YouTube controls - pointer-events: none so YouTube doesn't interfere with swipe */
        .reels-feed-video iframe {
          pointer-events: none !important;
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
          z-index: 10;
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

        .reels-play-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 64px;
          color: #fff;
          text-shadow: 0 2px 20px rgba(0,0,0,0.8);
          pointer-events: none;
          animation: fadeInOut 0.3s ease;
          z-index: 20;
        }

        @keyframes fadeInOut {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
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
          .reels-play-icon {
            font-size: 48px;
          }
        }

        @media (max-width: 480px) {
          .reels-feed-video {
            max-width: 100%;
          }
          .reels-play-icon {
            font-size: 36px;
          }
          .reels-close-btn {
            top: 10px;
            left: 10px;
            width: 32px;
            height: 32px;
            font-size: 16px;
          }
          .reels-feed-title {
            font-size: 13px;
          }
        }
      `}</style>
        </div>
    );
}