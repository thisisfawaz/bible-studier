"use client";

import { useState, useEffect, useRef } from 'react';

const VIDEO_CACHE_KEY = 'cached_reels_data';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

export default function ReelsFeed({ onClose }) {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [apiReady, setApiReady] = useState(false);
    const [playerReady, setPlayerReady] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showPlayIcon, setShowPlayIcon] = useState(false);
    const containerRef = useRef(null);
    const playerRef = useRef(null);
    const scrollTimeoutRef = useRef(null);
    const iconTimeoutRef = useRef(null);

    // Load YouTube API
    useEffect(() => {
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

    // Load videos
    useEffect(() => {
        loadVideos();
    }, []);

    const loadVideos = async () => {
        try {
            const cached = localStorage.getItem(VIDEO_CACHE_KEY);
            if (cached) {
                const { videos: cachedVideos, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                
                if (cachedVideos && cachedVideos.length > 0 && age < CACHE_DURATION) {
                    console.log('📦 Using cached videos:', cachedVideos.length);
                    setVideos(cachedVideos);
                    setLoading(false);
                    fetchVideosInBackground();
                    return;
                }
            }

            const response = await fetch('/api/admin/reels');
            const data = await response.json();
            
            if (data.success && data.data && data.data.published.length > 0) {
                const videoList = data.data.published;
                localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify({
                    videos: videoList,
                    timestamp: Date.now()
                }));
                setVideos(videoList);
            } else {
                setError('No reels found');
            }
        } catch (err) {
            console.error('Error loading videos:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchVideosInBackground = async () => {
        try {
            const response = await fetch('/api/admin/reels');
            const data = await response.json();
            if (data.success && data.data && data.data.published.length > 0) {
                const videoList = data.data.published;
                localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify({
                    videos: videoList,
                    timestamp: Date.now()
                }));
                setVideos(videoList);
            }
        } catch (err) {
            console.log('Background update failed');
        }
    };

    // Initialize single player with PLAYLIST
    useEffect(() => {
        if (apiReady && videos.length > 0 && !loading) {
            initializePlayer();
        }
    }, [apiReady, videos, loading]);

    const initializePlayer = () => {
        const elementId = 'reels-player';
        const element = document.getElementById(elementId);
        
        if (element && !playerRef.current) {
            try {
                const videoIds = videos.map(v => v.videoId || v.id);
                console.log('🎬 Creating playlist with:', videoIds.length, 'videos');
                
                const player = new window.YT.Player(elementId, {
                    height: '100%',
                    width: '100%',
                    videoId: videoIds[0],
                    playerVars: {
                        autoplay: 1,
                        controls: 0,
                        rel: 0,
                        loop: 1,
                        playlist: videoIds.join(','),
                        modestbranding: 1,
                        playsinline: 1,
                        origin: window.location.origin,
                        enablejsapi: 1,
                        iv_load_policy: 3,
                        showinfo: 0,
                        fs: 0,
                        disablekb: 1,
                        mute: 0,
                        // Disable keyboard controls
                        disablekb: 1
                    },
                    events: {
                        onReady: (event) => {
                            playerRef.current = event.target;
                            setPlayerReady(true);
                            console.log('✅ Player ready with playlist');
                            event.target.playVideo();
                            setIsPaused(false);
                            setShowPlayIcon(false);
                        },
                        onStateChange: (event) => {
                            if (event.data === window.YT.PlayerState.ENDED) {
                                const nextIndex = (currentIndex + 1) % videos.length;
                                setCurrentIndex(nextIndex);
                                scrollToIndex(nextIndex);
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
                        },
                        onError: (error) => {
                            console.error('Player error:', error);
                        }
                    }
                });
            } catch (err) {
                console.error('Error creating player:', err);
            }
        }
    };

    // Toggle play/pause
    const togglePlayPause = () => {
        if (!playerRef.current || !playerReady) return;

        try {
            if (isPaused) {
                playerRef.current.playVideo();
                setIsPaused(false);
                setShowPlayIcon(false);
                if (iconTimeoutRef.current) {
                    clearTimeout(iconTimeoutRef.current);
                }
            } else {
                playerRef.current.pauseVideo();
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

    const scrollToIndex = (index) => {
        const container = containerRef.current;
        if (!container) return;
        
        const children = container.children;
        if (children && children[index]) {
            container.scrollTo({
                top: children[index].offsetTop,
                behavior: 'smooth'
            });
        }
    };

    // Handle scroll to update current index
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            scrollTimeoutRef.current = setTimeout(() => {
                const scrollTop = container.scrollTop;
                const slideHeight = window.innerHeight;
                const newIndex = Math.round(scrollTop / slideHeight);
                
                if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
                    setCurrentIndex(newIndex);
                    
                    if (playerRef.current && playerReady) {
                        console.log('▶️ Playing video at index:', newIndex);
                        playerRef.current.playVideoAt(newIndex);
                        setIsPaused(false);
                        setShowPlayIcon(false);
                    }
                }
            }, 50);
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [videos.length, currentIndex, playerReady]);

    // Touch/click handler for pause/play
    const handleVideoClick = (e) => {
        // Don't trigger if clicking close button
        if (e.target.closest('.reels-close-btn')) return;
        togglePlayPause();
    };

    // Touch handlers for swipe
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let touchStartY = 0;
        let touchStartX = 0;
        let touchStartTime = 0;

        const handleTouchStart = (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
            touchStartTime = Date.now();
        };

        const handleTouchEnd = (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndX = e.changedTouches[0].clientX;
            const diffY = touchStartY - touchEndY;
            const diffX = touchStartX - touchEndX;
            const timeDiff = Date.now() - touchStartTime;

            // If it's a tap (not a swipe), toggle play/pause
            if (Math.abs(diffY) < 20 && Math.abs(diffX) < 20 && timeDiff < 300) {
                e.preventDefault();
                e.stopPropagation();
                togglePlayPause();
                return;
            }
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                try {
                    playerRef.current.destroy();
                } catch (e) {}
            }
            if (iconTimeoutRef.current) {
                clearTimeout(iconTimeoutRef.current);
            }
        };
    }, []);

    if (loading) {
        return (
            <div className="reels-fullscreen loading">
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading reels...</p>
                <style jsx>{`
                    .reels-fullscreen.loading {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 20px;
                        position: fixed;
                        inset: 0;
                        background: #000;
                        z-index: 1000;
                        color: #fff;
                    }
                    .loading-spinner {
                        width: 48px;
                        height: 48px;
                        border: 3px solid rgba(255,255,255,0.1);
                        border-top-color: #7c3aed;
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                    .loading-text {
                        font-size: 18px;
                        color: rgba(255,255,255,0.8);
                        margin: 0;
                    }
                `}</style>
            </div>
        );
    }

    if (error || videos.length === 0) {
        return (
            <div className="reels-fullscreen empty">
                <div className="reels-empty-icon">🎬</div>
                <h3>{error || 'No Reels Available'}</h3>
                <p>Check back later for new content!</p>
                <button onClick={onClose} className="reels-close-btn-bottom">Close</button>
                <style jsx>{`
                    .reels-fullscreen.empty {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 12px;
                        position: fixed;
                        inset: 0;
                        background: #000;
                        z-index: 1000;
                        color: #fff;
                        text-align: center;
                        padding: 20px;
                    }
                    .reels-empty-icon { font-size: 48px; }
                    .reels-fullscreen.empty h3 { font-size: 20px; font-weight: 500; margin: 0; }
                    .reels-fullscreen.empty p { font-size: 14px; color: rgba(255,255,255,0.6); margin: 0; }
                    .reels-close-btn-bottom {
                        padding: 8px 24px;
                        border-radius: 20px;
                        border: 1px solid rgba(255,255,255,0.2);
                        background: transparent;
                        color: #fff;
                        cursor: pointer;
                        transition: all 0.2s;
                        margin-top: 8px;
                    }
                    .reels-close-btn-bottom:hover {
                        background: rgba(255,255,255,0.1);
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="reels-fullscreen" onClick={handleVideoClick}>
            <button className="reels-close-btn" onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}>✕</button>

            {/* Single Player with Playlist - fills screen */}
            <div 
                id="reels-player" 
                style={{
                    position: 'fixed',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 1,
                    background: '#000',
                    pointerEvents: 'none'
                }}
            />

            {/* Scrollable slides - just for overlay and scroll detection */}
            <div className="reels-feed-container" ref={containerRef}>
                {videos.map((video, index) => (
                    <div
                        key={`${video.videoId || video.id}-${index}`}
                        className="reels-feed-item"
                        data-index={index}
                    >
                        {/* Play icon overlay when paused */}
                        {index === currentIndex && showPlayIcon && (
                            <div className="reels-play-icon">▶</div>
                        )}
                    </div>
                ))}
            </div>

            <style jsx>{`
                .reels-fullscreen {
                    position: fixed;
                    inset: 0;
                    background: #000;
                    z-index: 1000;
                    overflow: hidden;
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: none;
                    height: 100vh;
                    width: 100vw;
                }

                .reels-close-btn {
                    position: fixed;
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
                }

                .reels-close-btn:hover {
                    background: rgba(255,255,255,0.2);
                    transform: scale(1.05);
                }

                .reels-feed-container {
                    height: 100vh;
                    width: 100vw;
                    overflow-y: scroll;
                    scroll-snap-type: y mandatory;
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                    touch-action: pan-y;
                    position: relative;
                    z-index: 2;
                    background: transparent;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }

                .reels-feed-container::-webkit-scrollbar {
                    display: none;
                    width: 0;
                    background: transparent;
                }

                .reels-feed-item {
                    height: 100vh;
                    width: 100%;
                    position: relative;
                    flex-shrink: 0;
                    scroll-snap-align: start;
                    background: transparent;
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

                @media (max-width: 768px) {
                    .reels-close-btn { top: 12px; left: 12px; width: 36px; height: 36px; font-size: 18px; }
                    .reels-play-icon { font-size: 48px; }
                }

                @media (max-width: 480px) {
                    .reels-close-btn { top: 10px; left: 10px; width: 32px; height: 32px; font-size: 16px; }
                    .reels-play-icon { font-size: 36px; }
                }
            `}</style>
        </div>
    );
}