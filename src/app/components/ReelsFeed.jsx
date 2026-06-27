"use client";

import { useState, useEffect, useRef } from 'react';

const VIDEO_CACHE_KEY = 'cached_reels_data';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

// --- ISOLATED PRELOADING VIDEO CARD ---
function VideoCard({ video, index, isActive, apiReady }) {
    const videoId = video.videoId || video.id;
    const playerContainerId = `player-container-${index}`;
    const playerRef = useRef(null);
    const containerRef = useRef(null);
    const [isNearViewport, setIsNearViewport] = useState(false);
    const [videoStarted, setVideoStarted] = useState(false);

    const isActiveRef = useRef(isActive);
    useEffect(() => {
        isActiveRef.current = isActive;
        if (!isActive) {
            setVideoStarted(false);
            if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
                try { playerRef.current.pauseVideo(); } catch (e) {}
            }
        }
    }, [isActive]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsNearViewport(true);
                    observer.disconnect();
                }
            },
            {
                rootMargin: "100% 0px 100% 0px", 
                threshold: 0.01
            }
        );

        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const forceDisableCaptions = (player) => {
        if (!player) return;
        try {
            if (typeof player.unloadModule === 'function') {
                player.unloadModule('captions');
                player.unloadModule('cc');
            }
            if (typeof player.setOption === 'function') {
                player.setOption('captions', 'track', {});
                player.setOption('cc', 'track', {});
                player.setOption('captions', 'reload', false);
            }
        } catch (e) {}
    };

    useEffect(() => {
        if (isNearViewport && apiReady && !playerRef.current && window.YT?.Player) {
            const targetAnchor = document.createElement('div');
            targetAnchor.id = `yt-player-${index}`;
            
            const parentContainer = document.getElementById(playerContainerId);
            if (parentContainer) {
                parentContainer.appendChild(targetAnchor);
                
                playerRef.current = new window.YT.Player(targetAnchor.id, {
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
                        mute: 0, 
                        cc_load_policy: 0, 
                        disablekb: 1
                    },
                    events: {
                        onReady: (event) => {
                            forceDisableCaptions(event.target);
                            if (isActiveRef.current) {
                                if (typeof event.target.unMute === 'function') {
                                    event.target.unMute();
                                    event.target.setVolume(100);
                                }
                                try { event.target.playVideo(); } catch (e) {}
                            }
                        },
                        onStateChange: (event) => {
                            if (event.data === window.YT.PlayerState.PLAYING) {
                                setVideoStarted(true);
                                forceDisableCaptions(event.target);
                            }
                            if (event.data === window.YT.PlayerState.ENDED) {
                                event.target.seekTo(0);
                                event.target.playVideo();
                            }
                        }
                    }
                });
            }
        }
    }, [isNearViewport, apiReady, index, playerContainerId, videoId]);

    useEffect(() => {
        if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
            if (isActive) {
                playerRef.current.seekTo(0);
                if (typeof playerRef.current.unMute === 'function') {
                    playerRef.current.unMute();
                    playerRef.current.setVolume(100);
                }
                forceDisableCaptions(playerRef.current);
                try { playerRef.current.playVideo(); } catch (e) {}
            } else {
                try { playerRef.current.pauseVideo(); } catch (e) {}
            }
        }
    }, [isActive]);

    useEffect(() => {
        return () => {
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                try { playerRef.current.destroy(); } catch (e) {}
            }
        };
    }, []);

    const handleVideoClick = (e) => {
        e.stopPropagation();
        if (playerRef.current) {
            const state = playerRef.current.getPlayerState();
            if (state === window.YT.PlayerState.PLAYING) {
                playerRef.current.pauseVideo();
            } else {
                playerRef.current.playVideo();
            }
        }
    };

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    return (
        <div className="reels-feed-video-wrapper" onClick={handleVideoClick}>
            <div ref={containerRef} className="reels-aspect-sandbox">
                <div 
                    id={playerContainerId} 
                    className="reels-feed-video"
                    style={{ display: isNearViewport ? 'block' : 'none' }}
                />
                
                {!videoStarted && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                        src={thumbnailUrl} 
                        alt="Preview" 
                        className="reels-feed-video object-cover absolute inset-0 z-10 pointer-events-none" 
                    />
                )}
            </div>
        </div>
    );
}

// --- MAIN FEED CONTAINER ---
export default function ReelsFeed({ onClose }) {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [apiReady, setApiReady] = useState(false);
    
    const containerRef = useRef(null);

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

    useEffect(() => {
        loadVideos();
    }, []);

    const loadVideos = async () => {
        try {
            const cached = localStorage.getItem(VIDEO_CACHE_KEY);
            if (cached) {
                const { videos: cachedVideos, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                
                // If cache exists and hasn't expired, load it instantly and trigger silent background sync
                if (cachedVideos && cachedVideos.length > 0 && age < CACHE_DURATION) {
                    setVideos(cachedVideos);
                    setLoading(false);
                    fetchVideosInBackground();
                    return;
                }
            }

            // Fallback strategy if cache is empty on cold first load
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
                
                // SILENT CACHE SYNC: We update cache for the next cold session boot
                // We intentionally do NOT call setVideos() here so we don't break/stutter the active scroll session
                localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify({
                    videos: shuffled,
                    timestamp: Date.now()
                }));
            }
        } catch (err) {
            console.log('Background update failed silently');
        }
    };

    // Track active item positions cleanly via an observer instance attached to items inside the scroll-snapping track layout
    useEffect(() => {
        const container = containerRef.current;
        if (!container || videos.length === 0) return;

        const observerOptions = {
            root: container,
            rootMargin: '0px',
            threshold: 0.6 // Element cards must be 60% visible before triggering status change updates
        };

        const observerCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const index = parseInt(entry.target.getAttribute('data-index'), 10);
                    if (!isNaN(index)) {
                        setCurrentIndex(index);
                    }
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);
        
        const children = container.querySelectorAll('.reels-feed-item');
        children.forEach((child) => observer.observe(child));

        return () => {
            if (observer) observer.disconnect();
        };
    }, [videos]);

    if (loading) {
        return (
            <div className="reels-fullscreen loading">
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading reels...</p>
                <style jsx>{`
                    .reels-fullscreen.loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; position: fixed; inset: 0; background: #000; z-index: 1000; color: #fff; }
                    .loading-spinner { width: 48px; height: 48px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #7c3aed; border-radius: 50%; animation: spin 0.8s linear infinite; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    .loading-text { font-size: 18px; color: rgba(255,255,255,0.8); margin: 0; }
                `}</style>
            </div>
        );
    }

    if (error || videos.length === 0) {
        return (
            <div className="reels-fullscreen empty">
                <div className="reels-empty-icon">🎬</div>
                <h3>{error || 'No Reels Available'}</h3>
                <button onClick={onClose} className="reels-close-btn-bottom">Close</button>
                <style jsx>{`
                    .reels-fullscreen.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; position: fixed; inset: 0; background: #000; z-index: 1000; color: #fff; text-align: center; padding: 20px; }
                    .reels-empty-icon { font-size: 48px; }
                    .reels-close-btn-bottom { padding: 8px 24px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: #fff; cursor: pointer; margin-top: 8px; }
                `}</style>
            </div>
        );
    }

    return (
        <div className="reels-fullscreen">
            <button className="reels-close-btn" onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>

            <div className="reels-feed-container" ref={containerRef}>
                {videos.map((video, index) => (
                    <div 
                        key={`${video.videoId || video.id}-${index}`} 
                        className="reels-feed-item"
                        data-index={index}
                    >
                        <VideoCard 
                            video={video} 
                            index={index} 
                            isActive={index === currentIndex} 
                            apiReady={apiReady} 
                        />
                    </div>
                ))}
            </div>

            <style jsx>{`
                .reels-fullscreen { position: fixed; inset: 0; background: #000; z-index: 1000; overflow: hidden; height: 100vh; width: 100vw; }
                .reels-close-btn { position: fixed; top: 16px; left: 16px; z-index: 1001; background: rgba(0,0,0,0.5); backdrop-filter: blur(12px); border: none; color: #fff; font-size: 22px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
                
                .reels-feed-container { 
                    height: 100vh; 
                    width: 100vw; 
                    overflow-y: scroll; 
                    scroll-snap-type: y mandatory; 
                    scroll-behavior: smooth; 
                    scrollbar-width: none;
                    -webkit-overflow-scrolling: touch;
                }
                .reels-feed-container::-webkit-scrollbar { display: none; }
                
                .reels-feed-item { 
                    height: 100vh; 
                    width: 100%; 
                    position: relative; 
                    flex-shrink: 0; 
                    scroll-snap-align: start; 
                    scroll-snap-stop: always; 
                    overflow: hidden; 
                    background: #000; 
                }
                
                :global(.reels-feed-video-wrapper) { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #000; position: relative; cursor: pointer; }
                
                :global(.reels-aspect-sandbox) {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    max-width: 400px;
                    aspect-ratio: 9 / 16;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                :global(.reels-feed-video) { width: 100%; height: 100%; background: #000; position: relative; }
                
                :global(.reels-feed-video iframe) { 
                    width: 100% !important; 
                    height: 100% !important; 
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    object-fit: cover !important;
                }
                
                :global(.object-cover) { object-fit: cover; }
                :global(.absolute) { position: absolute; }
                :global(.inset-0) { top: 0; right: 0; bottom: 0; left: 0; }
                :global(.z-10) { z-index: 10; }
                :global(.pointer-events-none) { pointer-events: none; }
                :global(.flex) { display: flex; }
                :global(.items-center) { align-items: center; }
                :global(.justify-center) { justify-content: center; }
            `}</style>
        </div>
    );
}