"use client";

import { useState, useEffect, useRef } from 'react';

const VIDEO_CACHE_KEY = 'cached_reels_data';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

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
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [apiReady, setApiReady] = useState(false);
    const [isVideoLoading, setIsVideoLoading] = useState(true);
    const containerRef = useRef(null);
    const playersRef = useRef({});
    const scrollTimeoutRef = useRef(null);
    const loadingTimeoutRef = useRef(null);

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
                    const shuffled = shuffleArray(cachedVideos);
                    setVideos(shuffled);
                    setLoading(false);
                    fetchVideosInBackground();
                    return;
                }
            }

            const response = await fetch('/api/admin/reels');
            const data = await response.json();
            
            if (data.success && data.data && data.data.published.length > 0) {
                const videoList = data.data.published;
                const shuffled = shuffleArray(videoList);
                localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify({
                    videos: shuffled,
                    timestamp: Date.now()
                }));
                setVideos(shuffled);
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
                const shuffled = shuffleArray(videoList);
                localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify({
                    videos: shuffled,
                    timestamp: Date.now()
                }));
                setVideos(shuffled);
            }
        } catch (err) {
            console.log('Background update failed');
        }
    };

    // Initialize players for each slide
    useEffect(() => {
        if (apiReady && videos.length > 0 && !loading) {
            initializePlayers();
        }
    }, [apiReady, videos, loading]);

    const initializePlayers = () => {
        videos.forEach((video, index) => {
            const elementId = `player-${index}`;
            const element = document.getElementById(elementId);
            
            if (element && !playersRef.current[index]) {
                const videoId = video.videoId || video.id;
                
                try {
                    const player = new window.YT.Player(elementId, {
                        height: '100%',
                        width: '100%',
                        videoId: videoId,
                        playerVars: {
                            autoplay: 0,
                            controls: 0,
                            rel: 0,
                            modestbranding: 1,
                            playsinline: 1,
                            origin: window.location.origin,
                            enablejsapi: 1,
                            iv_load_policy: 3,
                            showinfo: 0,
                            fs: 0,
                            disablekb: 1,
                            mute: 1
                        },
                        events: {
                            onReady: (event) => {
                                playersRef.current[index] = event.target;
                                
                                event.target.playVideo();
                                setTimeout(() => {
                                    event.target.pauseVideo();
                                }, 100);
                                
                                if (index === 0) {
                                    setTimeout(() => {
                                        if (typeof event.target.unMute === 'function') {
                                            event.target.unMute();
                                        }
                                        event.target.playVideo();
                                        // Hide loading after 5 seconds for first video
                                        loadingTimeoutRef.current = setTimeout(() => {
                                            setIsVideoLoading(false);
                                        }, 5000);
                                    }, 200);
                                }
                            },
                            onStateChange: (event) => {
                                if (index === currentIndex) {
                                    if (event.data === window.YT.PlayerState.ENDED) {
                                        event.target.seekTo(0);
                                        event.target.playVideo();
                                    }
                                }
                            },
                            onError: (error) => {
                                console.error(`Player ${index} error:`, error);
                            }
                        }
                    });
                } catch (err) {
                    console.error(`Error creating player ${index}:`, err);
                }
            }
        });
    };

    // Preload next and previous videos when current index changes
    useEffect(() => {
        if (videos.length === 0 || Object.keys(playersRef.current).length === 0) return;

        // Clear any existing timeout
        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
        }

        // Show loading for new video
        setIsVideoLoading(true);

        // Preload next video
        const nextIndex = (currentIndex + 1) % videos.length;
        const prevIndex = (currentIndex - 1 + videos.length) % videos.length;
        
        const nextPlayer = playersRef.current[nextIndex];
        if (nextPlayer && typeof nextPlayer.playVideo === 'function') {
            try {
                nextPlayer.playVideo();
                setTimeout(() => {
                    nextPlayer.pauseVideo();
                }, 100);
            } catch (e) {}
        }

        const prevPlayer = playersRef.current[prevIndex];
        if (prevPlayer && typeof prevPlayer.playVideo === 'function') {
            try {
                prevPlayer.playVideo();
                setTimeout(() => {
                    prevPlayer.pauseVideo();
                }, 100);
            } catch (e) {}
        }

        // Play current video
        const currentPlayer = playersRef.current[currentIndex];
        if (currentPlayer && typeof currentPlayer.playVideo === 'function') {
            try {
                if (typeof currentPlayer.unMute === 'function') {
                    currentPlayer.unMute();
                }
                currentPlayer.seekTo(0);
                
                setTimeout(() => {
                    currentPlayer.playVideo();
                    
                    // Hide loading after 5 seconds maximum
                    loadingTimeoutRef.current = setTimeout(() => {
                        setIsVideoLoading(false);
                    }, 5000);
                }, 100);
            } catch (e) {
                console.error('Error playing video:', e);
                // Hide loading on error
                setIsVideoLoading(false);
            }
        } else {
            // If no player, hide loading after 5 seconds
            loadingTimeoutRef.current = setTimeout(() => {
                setIsVideoLoading(false);
            }, 5000);
        }
    }, [currentIndex, videos.length]);

    // Handle scroll
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
    }, [videos.length, currentIndex]);

    // Cleanup
    useEffect(() => {
        return () => {
            Object.keys(playersRef.current).forEach((key) => {
                const player = playersRef.current[key];
                if (player && typeof player.destroy === 'function') {
                    try {
                        player.destroy();
                    } catch (e) {}
                }
            });
            playersRef.current = {};
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
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
        <div className="reels-fullscreen">
            <button className="reels-close-btn" onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}>✕</button>

            <div className="reels-feed-container" ref={containerRef}>
                {videos.map((video, index) => {
                    const videoId = video.videoId || video.id;
                    const isActive = index === currentIndex;
                    return (
                        <div
                            key={`${videoId}-${index}`}
                            className="reels-feed-item"
                            data-index={index}
                        >
                            <div className="reels-feed-video-wrapper">
                                <div 
                                    id={`player-${index}`} 
                                    className="reels-feed-video"
                                />
                                {/* Loading overlay for active video */}
                                {isActive && isVideoLoading && (
                                    <div className="video-loading-overlay">
                                        <div className="loading-spinner-small"></div>
                                        <p className="loading-text-small">Loading message...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
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
                    overflow: hidden;
                    background: #000;
                }

                .reels-feed-video-wrapper {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #000;
                    position: relative;
                }

                .reels-feed-video {
                    width: 100%;
                    height: 100%;
                    max-width: 400px;
                    aspect-ratio: 9 / 16;
                    background: #000;
                }

                .reels-feed-video iframe {
                    pointer-events: none !important;
                }

                .video-loading-overlay {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    z-index: 10;
                    pointer-events: none;
                }

                .loading-spinner-small {
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(255,255,255,0.1);
                    border-top-color: #7c3aed;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .loading-text-small {
                    font-size: 14px;
                    color: rgba(255,255,255,0.7);
                    margin: 0;
                    font-weight: 400;
                }

                @media (max-width: 768px) {
                    .reels-close-btn { top: 12px; left: 12px; width: 36px; height: 36px; font-size: 18px; }
                    .reels-feed-video { max-width: 100%; }
                    .loading-spinner-small { width: 32px; height: 32px; }
                    .loading-text-small { font-size: 12px; }
                }

                @media (max-width: 480px) {
                    .reels-close-btn { top: 10px; left: 10px; width: 32px; height: 32px; font-size: 16px; }
                    .loading-spinner-small { width: 28px; height: 28px; }
                    .loading-text-small { font-size: 11px; }
                }
            `}</style>
        </div>
    );
}