import { useState, useRef, useCallback, useEffect } from 'react';
import {
  normalizeUrlInput,
  getMediaPlatform,
  extractVideoId,
  isYouTubeUrl,
} from '../utils/youtubeDownload';

export type PlaybackMode = 'embed-nocookie' | 'embed-standard' | 'direct-stream';

interface PlayerInstance {
  id: string;
  index: number;
  isMuted: boolean;
  isPlaying: boolean;
  isVisible: boolean;
  watchTime: number;
}

function getGridCols(count: number): string {
  if (count <= 1) return 'grid-cols-1';
  if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
  if (count <= 4) return 'grid-cols-2';
  if (count <= 9) return 'grid-cols-2 md:grid-cols-3';
  return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
}

function formatWatchTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Send a command to a YouTube embed iframe via postMessage.
 */
function sendYTCommand(iframe: HTMLIFrameElement, func: string) {
  if (!iframe.contentWindow) return;
  iframe.contentWindow.postMessage(
    JSON.stringify({ event: 'command', func, args: '' }),
    '*'
  );
}

export default function MultiPlayerPanel() {
  // Setup state
  const [url, setUrl] = useState('');
  const [playerCount, setPlayerCount] = useState(4);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('direct-stream');
  const [error, setError] = useState<string | null>(null);

  // Player screen state
  const [isPlayerView, setIsPlayerView] = useState(false);
  const [players, setPlayers] = useState<PlayerInstance[]>([]);
  const [videoId, setVideoId] = useState('');
  const [activeUrl, setActiveUrl] = useState('');

  // Player Element refs
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  // Watch time tracking intervals
  const watchIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const normalizedUrl = normalizeUrlInput(url);
  const platform = getMediaPlatform(normalizedUrl);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      watchIntervalsRef.current.forEach((interval) => clearInterval(interval));
      watchIntervalsRef.current.clear();
    };
  }, []);

  // Register iframe ref
  const setIframeRef = useCallback((id: string, el: HTMLIFrameElement | null) => {
    if (el) {
      iframeRefs.current.set(id, el);
    } else {
      iframeRefs.current.delete(id);
    }
  }, []);

  // Register video ref
  const setVideoRef = useCallback((id: string, el: HTMLVideoElement | null) => {
    if (el) {
      videoRefs.current.set(id, el);
    } else {
      videoRefs.current.delete(id);
    }
  }, []);

  // Start watch time tracking for a player
  const startWatchTracking = useCallback((playerId: string) => {
    const existing = watchIntervalsRef.current.get(playerId);
    if (existing) clearInterval(existing);

    const interval = setInterval(() => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId && p.isPlaying
            ? { ...p, watchTime: p.watchTime + 1 }
            : p
        )
      );
    }, 1000);

    watchIntervalsRef.current.set(playerId, interval);
  }, []);

  const stopWatchTracking = useCallback((playerId: string) => {
    const interval = watchIntervalsRef.current.get(playerId);
    if (interval) {
      clearInterval(interval);
      watchIntervalsRef.current.delete(playerId);
    }
  }, []);

  // Build YouTube embed URL
  const getEmbedUrl = (vid: string, mode: PlaybackMode): string => {
    const domain = mode === 'embed-nocookie' ? 'www.youtube-nocookie.com' : 'www.youtube.com';
    const params = new URLSearchParams({
      enablejsapi: '1',
      autoplay: '0',
      mute: '1',
      modestbranding: '1',
      rel: '0',
      playsinline: '1',
      controls: '1',
    });
    return `https://${domain}/embed/${vid}?${params.toString()}`;
  };

  // Build Proxy Direct Stream URL for HTML5 player
  const getProxyStreamUrl = (targetUrl: string): string => {
    return `/api/yt-download?url=${encodeURIComponent(targetUrl)}&quality=720`;
  };

  // Launch players
  const handleLaunchPlayers = () => {
    const cleanUrl = normalizeUrlInput(url);
    if (!cleanUrl) {
      setError('Please paste a valid YouTube URL.');
      return;
    }
    if (!isYouTubeUrl(cleanUrl)) {
      setError('Please enter a valid YouTube URL. Supported formats: youtube.com/watch, youtu.be, youtube.com/shorts, etc.');
      return;
    }

    const vid = extractVideoId(cleanUrl);
    if (!vid) {
      setError('Could not extract video ID from this URL. Please try a different URL format.');
      return;
    }

    setError(null);
    setVideoId(vid);
    setActiveUrl(cleanUrl);

    // Create player instances
    const newPlayers: PlayerInstance[] = [];
    for (let i = 0; i < playerCount; i++) {
      newPlayers.push({
        id: `player_${Date.now()}_${i}`,
        index: i + 1,
        isMuted: true,
        isPlaying: false,
        isVisible: true,
        watchTime: 0,
      });
    }

    setPlayers(newPlayers);
    setIsPlayerView(true);
  };

  // Per-player controls
  const togglePlayerMute = (id: string) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextMuted = !p.isMuted;
          if (playbackMode === 'direct-stream') {
            const video = videoRefs.current.get(id);
            if (video) video.muted = nextMuted;
          } else {
            const iframe = iframeRefs.current.get(id);
            if (iframe) sendYTCommand(iframe, nextMuted ? 'mute' : 'unMute');
          }
          return { ...p, isMuted: nextMuted };
        }
        return p;
      })
    );
  };

  const togglePlayerPlay = (id: string) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextPlaying = !p.isPlaying;
          if (playbackMode === 'direct-stream') {
            const video = videoRefs.current.get(id);
            if (video) {
              if (nextPlaying) {
                video.play().catch(() => {});
                startWatchTracking(id);
              } else {
                video.pause();
                stopWatchTracking(id);
              }
            }
          } else {
            const iframe = iframeRefs.current.get(id);
            if (iframe) {
              if (nextPlaying) {
                sendYTCommand(iframe, 'playVideo');
                startWatchTracking(id);
              } else {
                sendYTCommand(iframe, 'pauseVideo');
                stopWatchTracking(id);
              }
            }
          }
          return { ...p, isPlaying: nextPlaying };
        }
        return p;
      })
    );
  };

  const closePlayer = (id: string) => {
    if (playbackMode === 'direct-stream') {
      const video = videoRefs.current.get(id);
      if (video) {
        video.pause();
        video.src = '';
      }
      videoRefs.current.delete(id);
    } else {
      const iframe = iframeRefs.current.get(id);
      if (iframe) {
        sendYTCommand(iframe, 'pauseVideo');
        iframe.src = '';
      }
      iframeRefs.current.delete(id);
    }
    stopWatchTracking(id);
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  // Common controls
  const playAll = () => {
    players.forEach((p) => {
      if (playbackMode === 'direct-stream') {
        const video = videoRefs.current.get(p.id);
        if (video) video.play().catch(() => {});
      } else {
        const iframe = iframeRefs.current.get(p.id);
        if (iframe) sendYTCommand(iframe, 'playVideo');
      }
      startWatchTracking(p.id);
    });
    setPlayers((prev) => prev.map((p) => ({ ...p, isPlaying: true })));
  };

  const pauseAll = () => {
    players.forEach((p) => {
      if (playbackMode === 'direct-stream') {
        const video = videoRefs.current.get(p.id);
        if (video) video.pause();
      } else {
        const iframe = iframeRefs.current.get(p.id);
        if (iframe) sendYTCommand(iframe, 'pauseVideo');
      }
      stopWatchTracking(p.id);
    });
    setPlayers((prev) => prev.map((p) => ({ ...p, isPlaying: false })));
  };

  const muteAll = () => {
    players.forEach((p) => {
      if (playbackMode === 'direct-stream') {
        const video = videoRefs.current.get(p.id);
        if (video) video.muted = true;
      } else {
        const iframe = iframeRefs.current.get(p.id);
        if (iframe) sendYTCommand(iframe, 'mute');
      }
    });
    setPlayers((prev) => prev.map((p) => ({ ...p, isMuted: true })));
  };

  const unmuteAll = () => {
    players.forEach((p) => {
      if (playbackMode === 'direct-stream') {
        const video = videoRefs.current.get(p.id);
        if (video) video.muted = false;
      } else {
        const iframe = iframeRefs.current.get(p.id);
        if (iframe) sendYTCommand(iframe, 'unMute');
      }
    });
    setPlayers((prev) => prev.map((p) => ({ ...p, isMuted: false })));
  };

  const closeAll = () => {
    players.forEach((p) => {
      if (playbackMode === 'direct-stream') {
        const video = videoRefs.current.get(p.id);
        if (video) {
          video.pause();
          video.src = '';
        }
      } else {
        const iframe = iframeRefs.current.get(p.id);
        if (iframe) {
          sendYTCommand(iframe, 'pauseVideo');
          iframe.src = '';
        }
      }
      stopWatchTracking(p.id);
    });
    iframeRefs.current.clear();
    videoRefs.current.clear();
    watchIntervalsRef.current.forEach((interval) => clearInterval(interval));
    watchIntervalsRef.current.clear();
    setPlayers([]);
    setIsPlayerView(false);
  };

  // Calculate total watch time
  const totalWatchTime = players.reduce((sum, p) => sum + p.watchTime, 0);

  // ===================== SETUP VIEW =====================
  if (!isPlayerView) {
    return (
      <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
        {/* Header Banner */}
        <div className="card gradient-secondary border-0 p-6 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge bg-white/20 text-white font-bold text-[0.6875rem] backdrop-blur-md px-2.5 py-1">
                🎛️ Multi-Player Studio
              </span>
              <span className="badge bg-red-500/30 text-white text-[0.6875rem] border border-red-400/40">
                YouTube ▶️
              </span>
              <span className="badge bg-emerald-500/30 text-white text-[0.6875rem] border border-emerald-400/40">
                ⚡ Anti-Block Proxy Engine
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">
              Multi-Player Video Viewer
            </h2>
            <p className="text-xs text-white/80 max-w-xl leading-relaxed">
              Enter a YouTube URL and launch multiple simultaneous players. Includes <strong>Direct HTML5 Stream Engine</strong> to completely eliminate connection refusal errors, plus official YouTube embed options.
            </p>
          </div>
          <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        </div>

        {/* Setup Card */}
        <div className="card space-y-6">
          {/* Step 1: URL Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
                <span>🔗 1. Enter YouTube Video URL</span>
              </label>
              {platform !== 'unknown' && (
                <span
                  className={`badge text-[0.6875rem] font-bold ${
                    platform === 'youtube'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                  }`}
                >
                  {platform === 'youtube' ? '▶️ YouTube Link' : `🌐 ${platform}`}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                className="input pl-10 text-sm font-medium"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base">
                {platform === 'youtube' ? '▶️' : '🌐'}
              </span>
            </div>

            {/* Supported formats hint */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'youtube.com/watch?v=...',
                'youtu.be/...',
                'youtube.com/shorts/...',
                'youtube.com/embed/...',
              ].map((fmt) => (
                <span
                  key={fmt}
                  className="text-[0.5625rem] px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-text-muted)] font-mono"
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>

          {/* Step 2: Playback Engine Mode */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
              <span>⚙️ 2. Select Playback Engine</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setPlaybackMode('direct-stream')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  playbackMode === 'direct-stream'
                    ? 'border-emerald-500 bg-emerald-500/15 text-white shadow-lg shadow-emerald-500/10'
                    : 'border-[var(--color-glass-border)] bg-[var(--color-bg-surface-hover)]/20 text-[var(--color-text-muted)] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                  <span>⚡ HTML5 Direct Stream</span>
                  <span className="text-[0.5625rem] px-1 py-0.2 rounded bg-emerald-500/20">Recommended</span>
                </div>
                <p className="text-[0.6875rem] text-[var(--color-text-muted)] mt-1 leading-snug">
                  Bypasses iframe & connection block errors. Plays 100% reliably in native HTML5 video tags.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPlaybackMode('embed-nocookie')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  playbackMode === 'embed-nocookie'
                    ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-lg shadow-indigo-500/10'
                    : 'border-[var(--color-glass-border)] bg-[var(--color-bg-surface-hover)]/20 text-[var(--color-text-muted)] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-indigo-400">
                  <span>🎬 YouTube Privacy Embed</span>
                </div>
                <p className="text-[0.6875rem] text-[var(--color-text-muted)] mt-1 leading-snug">
                  Official iframe embed via <code>youtube-nocookie.com</code>. Counts official YouTube view metrics.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPlaybackMode('embed-standard')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  playbackMode === 'embed-standard'
                    ? 'border-red-500 bg-red-500/15 text-white shadow-lg shadow-red-500/10'
                    : 'border-[var(--color-glass-border)] bg-[var(--color-bg-surface-hover)]/20 text-[var(--color-text-muted)] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-red-400">
                  <span>▶️ Standard YouTube Embed</span>
                </div>
                <p className="text-[0.6875rem] text-[var(--color-text-muted)] mt-1 leading-snug">
                  Standard <code>youtube.com/embed</code> player iframe.
                </p>
              </button>
            </div>
          </div>

          {/* Step 3: Player Count */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
              <span>🎛️ 3. Choose Number of Players</span>
            </label>

            <div className="flex items-center gap-4">
              {/* Stepper */}
              <div className="flex items-center gap-0 rounded-xl glass overflow-hidden border border-[var(--color-glass-border)]">
                <button
                  type="button"
                  onClick={() => setPlayerCount((c) => Math.max(1, c - 1))}
                  className="w-10 h-10 flex items-center justify-center text-lg font-bold text-white hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent"
                >
                  −
                </button>
                <div className="w-14 h-10 flex items-center justify-center text-lg font-black text-[var(--color-accent-indigo)] border-l border-r border-[var(--color-glass-border)] bg-[var(--color-accent-indigo)]/5">
                  {playerCount}
                </div>
                <button
                  type="button"
                  onClick={() => setPlayerCount((c) => Math.min(20, c + 1))}
                  className="w-10 h-10 flex items-center justify-center text-lg font-bold text-white hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent"
                >
                  +
                </button>
              </div>

              <span className="text-xs text-[var(--color-text-muted)]">
                {playerCount} player{playerCount !== 1 ? 's' : ''} (max 20)
              </span>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 4, 6, 9, 12, 16].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPlayerCount(n)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    playerCount === n
                      ? 'border-[var(--color-accent-indigo)] bg-[var(--color-accent-indigo)]/20 text-white shadow-sm'
                      : 'border-[var(--color-glass-border)] bg-[var(--color-bg-surface-hover)]/30 text-[var(--color-text-muted)] hover:text-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2.5">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Launch Button */}
          <button
            type="button"
            onClick={handleLaunchPlayers}
            disabled={!url.trim()}
            className="w-full btn-primary py-3.5 text-sm font-bold shadow-xl flex items-center justify-center gap-2"
          >
            <span>🎛️</span>
            <span>
              Launch {playerCount} Player{playerCount !== 1 ? 's' : ''} ({playbackMode === 'direct-stream' ? 'Direct Stream' : 'Embed Mode'})
            </span>
          </button>
        </div>

        {/* Info Footer */}
        <div className="card bg-[var(--color-bg-surface-hover)]/30 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div className="text-xs text-[var(--color-text-secondary)] space-y-1">
              <p className="font-semibold text-[var(--color-text-primary)]">Anti-Block Technology</p>
              <p>
                If YouTube iframe embeds ever show <em>"www.youtube.com refused to connect"</em> in your browser, select <strong>HTML5 Direct Stream</strong> mode. It streams the video cleanly via our proxy and is 100% immune to iframe blockages.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================== PLAYER VIEW =====================
  const visiblePlayers = players.filter((p) => p.isVisible);

  // Common control bar component
  const CommonControlBar = ({ position }: { position: 'top' | 'bottom' }) => (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 glass border border-[var(--color-glass-border)] ${
        position === 'top' ? 'rounded-t-2xl rounded-b-lg' : 'rounded-b-2xl rounded-t-lg'
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mr-1">
          🎛️ All Players ({visiblePlayers.length})
        </span>

        {/* Total watch time badge */}
        <span className="badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[0.625rem] font-bold mr-1">
          ⏱️ Total: {formatWatchTime(totalWatchTime)}
        </span>

        <button
          type="button"
          onClick={playAll}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all cursor-pointer"
        >
          ▶️ Play All
        </button>
        <button
          type="button"
          onClick={pauseAll}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all cursor-pointer"
        >
          ⏸ Pause All
        </button>
      </div>

      {/* Mode Switcher inside Player View */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-[var(--color-glass-border)] text-[0.6875rem]">
          <button
            type="button"
            onClick={() => setPlaybackMode('direct-stream')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              playbackMode === 'direct-stream'
                ? 'bg-emerald-500 text-black shadow'
                : 'text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            ⚡ Direct Stream
          </button>
          <button
            type="button"
            onClick={() => setPlaybackMode('embed-nocookie')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              playbackMode === 'embed-nocookie'
                ? 'bg-indigo-500 text-white shadow'
                : 'text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            🎬 Privacy Embed
          </button>
          <button
            type="button"
            onClick={() => setPlaybackMode('embed-standard')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              playbackMode === 'embed-standard'
                ? 'bg-red-500 text-white shadow'
                : 'text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            ▶️ Standard Embed
          </button>
        </div>

        <button
          type="button"
          onClick={muteAll}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-500/40 hover:bg-slate-500/30 transition-all cursor-pointer"
        >
          🔇 Mute All
        </button>
        <button
          type="button"
          onClick={unmuteAll}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition-all cursor-pointer"
        >
          🔊 Unmute All
        </button>
        <button
          type="button"
          onClick={closeAll}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 transition-all cursor-pointer"
        >
          ❌ Close All
        </button>
      </div>
    </div>
  );

  if (visiblePlayers.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
        <div className="card text-center p-12 space-y-4">
          <span className="text-5xl">🎛️</span>
          <h3 className="text-lg font-bold text-white">All Players Closed</h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            All player instances have been closed.
          </p>
          {totalWatchTime > 0 && (
            <p className="text-sm font-bold text-emerald-400">
              ⏱️ Total Watch Time: {formatWatchTime(totalWatchTime)}
            </p>
          )}
          <button
            type="button"
            onClick={closeAll}
            className="btn-primary px-6 py-2.5 text-sm font-bold"
          >
            ← Back to Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Top Control Bar */}
      <CommonControlBar position="top" />

      {/* Mode Banner Hint */}
      {playbackMode !== 'direct-stream' && (
        <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between gap-2">
          <span>💡 Seeing <em>"refused to connect"</em> in embeds? Switch engine to <strong>⚡ Direct Stream</strong> using top bar controls.</span>
          <button
            type="button"
            onClick={() => setPlaybackMode('direct-stream')}
            className="px-2.5 py-1 rounded bg-emerald-500 text-black font-bold text-[0.6875rem] hover:bg-emerald-400 transition-colors cursor-pointer shrink-0"
          >
            Switch to Direct Stream
          </button>
        </div>
      )}

      {/* Player Grid */}
      <div className={`grid ${getGridCols(visiblePlayers.length)} gap-3`}>
        {visiblePlayers.map((player) => (
          <div
            key={player.id}
            className="card p-0 overflow-hidden border border-[var(--color-glass-border)] hover:border-[var(--color-accent-indigo)]/50 transition-all group animate-fade-in"
          >
            {/* Player Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-surface-hover)]/30">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center text-[0.625rem] font-black text-white shadow">
                  {player.index}
                </div>
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  Player {player.index}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[0.5625rem] px-1.5 py-0.5 rounded bg-white/10 text-[var(--color-text-muted)] font-mono">
                  {playbackMode === 'direct-stream' ? '⚡ Direct' : playbackMode === 'embed-nocookie' ? '🎬 Nocookie' : '▶️ Embed'}
                </span>

                {/* Watch time badge */}
                <span className="text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-mono">
                  ⏱️ {formatWatchTime(player.watchTime)}
                </span>

                {/* Mute status badge */}
                <span
                  className={`text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-md ${
                    player.isMuted
                      ? 'bg-slate-500/20 text-slate-400'
                      : 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                  }`}
                >
                  {player.isMuted ? '🔇 Muted' : '🔊 Live'}
                </span>
              </div>
            </div>

            {/* Video Container */}
            <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
              {playbackMode === 'direct-stream' ? (
                <video
                  ref={(el) => setVideoRef(player.id, el)}
                  src={getProxyStreamUrl(activeUrl)}
                  controls
                  playsInline
                  muted={player.isMuted}
                  className="w-full h-full object-contain"
                  onPlay={() => {
                    setPlayers((prev) =>
                      prev.map((p) => (p.id === player.id ? { ...p, isPlaying: true } : p))
                    );
                    startWatchTracking(player.id);
                  }}
                  onPause={() => {
                    setPlayers((prev) =>
                      prev.map((p) => (p.id === player.id ? { ...p, isPlaying: false } : p))
                    );
                    stopWatchTracking(player.id);
                  }}
                />
              ) : (
                <iframe
                  ref={(el) => setIframeRef(player.id, el)}
                  src={getEmbedUrl(videoId, playbackMode)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  className="w-full h-full border-0"
                  title={`YouTube Player ${player.index}`}
                />
              )}
            </div>

            {/* Player Controls */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--color-glass-border)] bg-[var(--color-bg-surface-hover)]/20">
              <div className="flex items-center gap-1.5">
                {/* Play / Pause */}
                <button
                  type="button"
                  onClick={() => togglePlayerPlay(player.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    player.isPlaying
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                >
                  {player.isPlaying ? '⏸ Pause' : '▶️ Play'}
                </button>

                {/* Push (Unmute Toggle) */}
                <button
                  type="button"
                  onClick={() => togglePlayerMute(player.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    player.isMuted
                      ? 'bg-slate-500/20 text-slate-300 border-slate-500/40 hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-500/40'
                      : 'bg-indigo-500/30 text-indigo-200 border-indigo-400/60 shadow-[0_0_12px_rgba(99,102,241,0.3)] animate-pulse'
                  }`}
                >
                  {player.isMuted ? '🔇 Push' : '🔊 Push'}
                </button>
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={() => closePlayer(player.id)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
              >
                ❌ Close
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Control Bar */}
      <CommonControlBar position="bottom" />
    </div>
  );
}
