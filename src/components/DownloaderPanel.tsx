import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from '../state/SessionContext';
import { useFFmpeg } from '../hooks/useFFmpeg';
import {
  downloadYouTubeVideo,
  isSupportedMediaUrl,
  getMediaPlatform,
  type YouTubeDownloadProgress,
} from '../utils/youtubeDownload';
import { formatTime, formatFileSize } from '../utils/fileHelpers';
import ProgressBar from './ProgressBar';

type QualityOption = '1080' | '720' | '480' | '360' | 'max';
type DownloadMode = 'full' | 'range';
type FormatType = 'video' | 'audio';

interface DownloadedItem {
  id: string;
  blobUrl: string;
  blob: Blob;
  filename: string;
  platform: 'youtube' | 'instagram' | 'unknown';
  format: FormatType;
  quality: string;
  duration: number;
  isTrimmed: boolean;
  trimStart: number;
  trimEnd: number;
  createdAt: number;
}

export default function DownloaderPanel() {
  const { dispatch } = useSession();
  const { loadFFmpeg, trimAndConvertMedia, loaded: ffmpegLoaded } = useFFmpeg();

  // Input states
  const [url, setUrl] = useState('');
  const [downloadMode, setDownloadMode] = useState<DownloadMode>('range');
  const [formatType, setFormatType] = useState<FormatType>('video');
  const [quality, setQuality] = useState<QualityOption>('720');

  // Preview Stream State (Fetched stream for visual marking)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [rawBlob, setRawBlob] = useState<Blob | null>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState<boolean>(false);

  // Video Scrubber & Trimming states
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [rangeStart, setRangeStart] = useState<number>(0);
  const [rangeEnd, setRangeEnd] = useState<number>(30);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoopingRange, setIsLoopingRange] = useState<boolean>(false);

  // Processing & Status states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressState, setProgressState] = useState<YouTubeDownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active Downloaded Item
  const [currentDownloaded, setCurrentDownloaded] = useState<DownloadedItem | null>(null);
  const [downloadHistory, setDownloadHistory] = useState<DownloadedItem[]>([]);

  // Video element ref for video player preview
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Auto-detect platform
  const platform = getMediaPlatform(url);
  const isValidUrl = isSupportedMediaUrl(url);

  // Load FFmpeg on mount
  useEffect(() => {
    loadFFmpeg().catch((err) => {
      console.warn('FFmpeg lazy load warning:', err);
    });
  }, [loadFFmpeg]);

  // Handle video metadata loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || 0;
      setVideoDuration(dur);
      if (rangeEnd === 0 || rangeEnd > dur) {
        setRangeEnd(Math.floor(dur) || 30);
      }
    }
  };

  // Video time update event handler
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);

      // Loop strictly inside range if looping is enabled
      if (isLoopingRange && cur >= rangeEnd) {
        videoRef.current.currentTime = rangeStart;
      }
    }
  };

  // Fetch Preview Stream to enable visual marking & playback track
  const handleFetchPreview = async () => {
    if (!url.trim()) {
      setError('Please paste a YouTube or Instagram URL.');
      return;
    }

    if (!isValidUrl) {
      setError('Invalid link. Please provide a YouTube (watch/shorts) or Instagram (reels/posts) URL.');
      return;
    }

    setError(null);
    setIsFetchingPreview(true);
    setCurrentDownloaded(null);

    try {
      const downloadResult = await downloadYouTubeVideo(
        url,
        {
          quality,
          format: formatType,
          isAudioOnly: formatType === 'audio',
        },
        (p) => setProgressState(p)
      );

      const urlBlob = URL.createObjectURL(downloadResult.blob);
      setRawBlob(downloadResult.blob);
      setPreviewBlobUrl(urlBlob);

      setProgressState({ stage: 'done', message: 'Stream loaded! Play video and mark range.' });
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch video stream.');
      setProgressState(null);
    } finally {
      setIsFetchingPreview(false);
    }
  };

  // Set Start Marker [In Point] to current video playhead
  const handleSetStartMarker = () => {
    if (videoRef.current) {
      const cur = Math.floor(videoRef.current.currentTime * 10) / 10;
      setRangeStart(cur);
      if (cur >= rangeEnd) {
        setRangeEnd(Math.min(videoDuration, cur + 5));
      }
    }
  };

  // Set End Marker [Out Point] to current video playhead
  const handleSetEndMarker = () => {
    if (videoRef.current) {
      const cur = Math.floor(videoRef.current.currentTime * 10) / 10;
      if (cur > rangeStart) {
        setRangeEnd(cur);
      } else {
        setError('End marker must be after start marker.');
      }
    }
  };

  // Split selected clip from current playhead position (10s duration)
  const handleSplitFromPlayhead = (durationSeconds: number = 10) => {
    if (videoRef.current) {
      const cur = Math.floor(videoRef.current.currentTime * 10) / 10;
      setRangeStart(cur);
      setRangeEnd(Math.min(videoDuration, cur + durationSeconds));
    }
  };

  // Toggle Video Play / Pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Jump playhead on clicking the visual track scrubber bar
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || videoDuration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percentage * videoDuration;

    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  // Process and Trim Video/Audio
  const handleDownloadSelectedRange = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      let sourceBlob = rawBlob;
      let sourceFilename = `${platform}_${Date.now()}.${formatType === 'audio' ? 'mp3' : 'mp4'}`;

      // 1. Fetch if rawBlob not already loaded in memory
      if (!sourceBlob) {
        const downloadResult = await downloadYouTubeVideo(
          url,
          {
            quality: formatType === 'audio' ? '144' : quality,
            format: formatType,
            isAudioOnly: formatType === 'audio',
          },
          (p) => setProgressState(p)
        );
        sourceBlob = downloadResult.blob;
        sourceFilename = downloadResult.filename;
      }

      let finalBlob = sourceBlob;
      let finalFilename = sourceFilename;
      let isTrimmed = false;

      // 2. Perform FFmpeg Range Trim based on visual markers
      if (downloadMode === 'range' && (rangeStart > 0 || (rangeEnd > 0 && rangeEnd < (videoDuration || 9999)))) {
        setProgressState({
          stage: 'downloading',
          message: `Trimming clip range (${rangeStart}s to ${rangeEnd}s) with FFmpeg.wasm...`,
          progress: 80,
        });

        if (!ffmpegLoaded) {
          await loadFFmpeg();
        }

        const trimmed = await trimAndConvertMedia(sourceBlob, {
          startTime: rangeStart,
          endTime: rangeEnd > rangeStart ? rangeEnd : rangeStart + 10,
          extractAudio: formatType === 'audio',
          outputFormat: formatType === 'audio' ? 'mp3' : 'mp4',
        });

        finalBlob = trimmed.blob;
        isTrimmed = true;
        const cleanPrefix = sourceFilename.split('.')[0];
        finalFilename = `${cleanPrefix}_clip_${rangeStart}s-${rangeEnd}s.${trimmed.extension}`;
      } else if (formatType === 'audio' && !sourceFilename.endsWith('.mp3')) {
        // Audio conversion fallback
        if (!ffmpegLoaded) await loadFFmpeg();
        const audioResult = await trimAndConvertMedia(sourceBlob, {
          extractAudio: true,
          outputFormat: 'mp3',
        });
        finalBlob = audioResult.blob;
        finalFilename = sourceFilename.replace(/\.[^/.]+$/, '.mp3');
      }

      const blobUrl = URL.createObjectURL(finalBlob);
      const calculatedDuration = isTrimmed ? rangeEnd - rangeStart : videoDuration || 30;

      const item: DownloadedItem = {
        id: `dl_${Date.now()}`,
        blobUrl,
        blob: finalBlob,
        filename: finalFilename,
        platform,
        format: formatType,
        quality: formatType === 'audio' ? '320kbps MP3' : `${quality}p`,
        duration: calculatedDuration,
        isTrimmed,
        trimStart: rangeStart,
        trimEnd: rangeEnd,
        createdAt: Date.now(),
      };

      setCurrentDownloaded(item);
      setDownloadHistory((prev) => [item, ...prev.slice(0, 9)]);
      setProgressState({ stage: 'done', message: 'Clip ready for download!' });
    } catch (err: any) {
      setError(err?.message || 'Processing failed. Please check URL and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToDevice = (item: DownloadedItem) => {
    const a = document.createElement('a');
    a.href = item.blobUrl;
    a.download = item.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenInEditor = (item: DownloadedItem) => {
    dispatch({
      type: 'OPEN_IN_PRO_EDITOR',
      payload: {
        blobUrl: item.blobUrl,
        fileName: item.filename,
        duration: item.duration,
        aspectRatio: '16:9',
      },
    });
  };

  const handleSendToShorts = (item: DownloadedItem) => {
    const file = new File([item.blob], item.filename, { type: item.blob.type });
    dispatch({
      type: 'SET_VIDEO',
      payload: {
        file,
        blobUrl: item.blobUrl,
        name: item.filename,
        size: item.blob.size,
        source: 'youtube',
      },
    });
    dispatch({ type: 'SET_TAB', payload: 'shorts' });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Top Banner Header */}
      <div className="card gradient-secondary border-0 p-6 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="badge bg-white/20 text-white font-bold text-[0.6875rem] backdrop-blur-md px-2.5 py-1">
              ✨ Visual Range Trimmer & Downloader
            </span>
            <span className="badge bg-red-500/30 text-white text-[0.6875rem] border border-red-400/40">
              YouTube ▶️
            </span>
            <span className="badge bg-pink-500/30 text-white text-[0.6875rem] border border-pink-400/40">
              Instagram 📸
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            YouTube & Instagram Video Downloader
          </h2>
          <p className="text-xs text-white/80 max-w-xl leading-relaxed">
            Mark start & end range directly on the visual video track timeline, split clips, choose 1080p, 720p, 480p, or high quality MP3 audio, and download without manual seconds entry!
          </p>
        </div>

        <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Main Container Card */}
      <div className="card space-y-6">
        {/* Step 1: Input Video URL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
              <span>🔗 1. Enter YouTube or Instagram Video Link</span>
            </label>
            {platform !== 'unknown' && (
              <span className={`badge text-[0.6875rem] font-bold ${
                platform === 'youtube'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                  : 'bg-pink-500/10 text-pink-400 border border-pink-500/30'
              }`}>
                {platform === 'youtube' ? '▶️ YouTube Link' : '📸 Instagram Link'}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                placeholder="https://www.youtube.com/watch?v=... or https://www.instagram.com/reel/..."
                className="input pl-10 text-sm font-medium"
                disabled={isProcessing || isFetchingPreview}
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base">
                {platform === 'youtube' ? '▶️' : platform === 'instagram' ? '📸' : '🌐'}
              </span>
            </div>

            <button
              onClick={handleFetchPreview}
              disabled={isFetchingPreview || !url.trim()}
              className="btn-secondary shrink-0 text-xs px-4 flex items-center gap-1.5 font-bold shadow-md"
            >
              {isFetchingPreview ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Loading Stream...</span>
                </>
              ) : (
                <>
                  <span>🎞️ Load Preview Track</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step 2: Interactive Video Player & Visual Video Track Timeline */}
        {previewBlobUrl && (
          <div className="p-4 rounded-2xl glass border border-indigo-500/30 bg-black/40 space-y-4 animate-fade-in shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <span>🎥 Interactive Video Track & Marker Controls</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[0.625rem]">
                  Playback: {formatTime(currentTime)} / {formatTime(videoDuration)}
                </span>
              </div>
            </div>

            {/* Video Player Display */}
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-72 border border-white/10 flex items-center justify-center">
              <video
                ref={videoRef}
                src={previewBlobUrl}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain cursor-pointer"
                onClick={togglePlay}
              />
              {!isPlaying && (
                <button
                  onClick={togglePlay}
                  className="absolute w-14 h-14 rounded-full bg-indigo-600/90 text-white text-2xl flex items-center justify-center shadow-2xl hover:scale-110 transition-transform pointer-events-none"
                >
                  ▶
                </button>
              )}
            </div>

            {/* Visual Video Track Scrubber */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-[0.6875rem] font-semibold text-[var(--color-text-secondary)]">
                <span className="text-emerald-400">
                  📍 Start Marker [In]: {formatTime(rangeStart)}
                </span>
                <span className="text-indigo-400 font-mono font-bold">
                  Selected Range: {formatTime(Math.max(0, rangeEnd - rangeStart))}
                </span>
                <span className="text-rose-400">
                  📍 End Marker [Out]: {formatTime(rangeEnd)}
                </span>
              </div>

              {/* Visual Scrubber Track Bar with Highlighted Range Overlay */}
              <div
                ref={trackRef}
                onClick={handleTrackClick}
                className="relative h-12 w-full bg-slate-900/90 rounded-xl border border-white/20 overflow-hidden cursor-pointer group shadow-inner"
              >
                {/* Visual Track Waveform Background Stripes */}
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,transparent_49%,rgba(255,255,255,0.4)_50%,transparent_51%)] bg-[length:12px_100%]" />

                {/* Highlighted Range Selection Overlay */}
                {videoDuration > 0 && (
                  <div
                    className="absolute top-0 bottom-0 bg-gradient-to-r from-indigo-500/40 via-purple-500/40 to-pink-500/40 border-l-4 border-r-4 border-indigo-400 shadow-lg pointer-events-none"
                    style={{
                      left: `${(rangeStart / videoDuration) * 100}%`,
                      width: `${Math.max(1, ((rangeEnd - rangeStart) / videoDuration) * 100)}%`,
                    }}
                  >
                    <div className="h-full flex items-center justify-between px-2 text-[0.625rem] font-black text-white drop-shadow">
                      <span>IN</span>
                      <span>SELECTED CLIP</span>
                      <span>OUT</span>
                    </div>
                  </div>
                )}

                {/* Current Playhead Indicator Needle */}
                {videoDuration > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_12px_#ef4444] z-20 pointer-events-none transition-all duration-75"
                    style={{ left: `${(currentTime / videoDuration) * 100}%` }}
                  >
                    <div className="w-3 h-3 rounded-full bg-red-500 -ml-1 -mt-1 border border-white" />
                  </div>
                )}
              </div>

              {/* Dual Visual Handle Sliders (No Typing Seconds Needed!) */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="text-[0.6875rem] text-emerald-400 font-bold flex items-center justify-between">
                    <span>⬅️ Start Handle (In)</span>
                    <span className="font-mono">{formatTime(rangeStart)}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={rangeEnd > 1 ? rangeEnd - 1 : videoDuration}
                    step={0.5}
                    value={rangeStart}
                    onChange={(e) => setRangeStart(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[0.6875rem] text-rose-400 font-bold flex items-center justify-between">
                    <span>➡️ End Handle (Out)</span>
                    <span className="font-mono">{formatTime(rangeEnd)}</span>
                  </label>
                  <input
                    type="range"
                    min={rangeStart + 1}
                    max={videoDuration || 300}
                    step={0.5}
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* One-Click Video Marking & Splitting Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSetStartMarker}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all cursor-pointer"
                    title="Set Start Marker at current video playhead"
                  >
                    📍 Set Start [In]
                  </button>

                  <button
                    onClick={handleSetEndMarker}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-all cursor-pointer"
                    title="Set End Marker at current video playhead"
                  >
                    📍 Set End [Out]
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSplitFromPlayhead(15)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition-all cursor-pointer"
                  >
                    ✂️ Split 15s Clip
                  </button>

                  <button
                    onClick={() => handleSplitFromPlayhead(30)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition-all cursor-pointer"
                  >
                    ✂️ Split 30s Clip
                  </button>

                  <button
                    onClick={() => setIsLoopingRange(!isLoopingRange)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      isLoopingRange
                        ? 'bg-amber-500 text-black border-amber-400 font-extrabold shadow-md'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    🔁 {isLoopingRange ? 'Loop Range: ON' : 'Loop Range'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Scope Selection & Presets */}
        <div className="space-y-4 pt-4 border-t border-[var(--color-glass-border)]">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
            <span>✂️ 2. Download Mode & Quality</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDownloadMode('range')}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer font-[inherit] ${
                downloadMode === 'range'
                  ? 'border-[var(--color-accent-indigo)] bg-[var(--color-accent-indigo)]/10 text-white'
                  : 'border-[var(--color-glass-border)] bg-[var(--color-bg-surface-hover)]/40 text-[var(--color-text-secondary)] hover:text-white'
              }`}
            >
              <div className="w-8 h-8 rounded-lg gradient-secondary flex items-center justify-center text-sm shrink-0">
                ✂️
              </div>
              <div>
                <div className="text-xs font-bold">Selected Marked Range</div>
                <div className="text-[0.6875rem] text-[var(--color-text-muted)]">
                  Download marked start-to-end clip ({formatTime(rangeStart)} - {formatTime(rangeEnd)})
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDownloadMode('full')}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer font-[inherit] ${
                downloadMode === 'full'
                  ? 'border-[var(--color-accent-indigo)] bg-[var(--color-accent-indigo)]/10 text-white'
                  : 'border-[var(--color-glass-border)] bg-[var(--color-bg-surface-hover)]/40 text-[var(--color-text-secondary)] hover:text-white'
              }`}
            >
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-sm shrink-0">
                🎞️
              </div>
              <div>
                <div className="text-xs font-bold">Full Video</div>
                <div className="text-[0.6875rem] text-[var(--color-text-muted)]">Download complete video</div>
              </div>
            </button>
          </div>

          {/* Media Format & Resolution Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Format Type */}
            <div className="space-y-2">
              <span className="text-[0.6875rem] text-[var(--color-text-muted)] font-semibold">Output Type</span>
              <div className="flex rounded-xl glass p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setFormatType('video')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border-0 cursor-pointer transition-all ${
                    formatType === 'video'
                      ? 'gradient-primary text-white shadow-md'
                      : 'bg-transparent text-[var(--color-text-secondary)] hover:text-white'
                  }`}
                >
                  🎬 Video (MP4)
                </button>
                <button
                  type="button"
                  onClick={() => setFormatType('audio')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border-0 cursor-pointer transition-all ${
                    formatType === 'audio'
                      ? 'gradient-primary text-white shadow-md'
                      : 'bg-transparent text-[var(--color-text-secondary)] hover:text-white'
                  }`}
                >
                  🎵 Audio Only (MP3)
                </button>
              </div>
            </div>

            {/* Quality Selector */}
            <div className="space-y-2">
              <span className="text-[0.6875rem] text-[var(--color-text-muted)] font-semibold">
                {formatType === 'video' ? 'Video Quality' : 'Audio Quality'}
              </span>

              {formatType === 'video' ? (
                <div className="grid grid-cols-4 gap-1.5">
                  {(['1080', '720', '480', '360'] as QualityOption[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuality(q)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer font-[inherit] ${
                        quality === q
                          ? 'border-[var(--color-accent-indigo)] bg-[var(--color-accent-indigo)]/20 text-white shadow-sm'
                          : 'border-[var(--color-glass-border)] bg-[var(--color-bg-surface-hover)]/30 text-[var(--color-text-muted)] hover:text-white'
                      }`}
                    >
                      {q}p
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl border border-[var(--color-accent-success)]/30 bg-[var(--color-accent-success)]/10 text-[var(--color-accent-success)] text-xs font-semibold flex items-center justify-between">
                  <span>🎧 High Quality MP3 (320 kbps)</span>
                  <span className="badge badge-success text-[0.5625rem]">Best Audio</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2.5">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Progress Bar */}
        {isProcessing && progressState && (
          <div className="space-y-2 p-4 rounded-xl glass border border-[var(--color-glass-border)] animate-fade-in">
            <div className="flex justify-between text-xs font-semibold text-[var(--color-text-secondary)]">
              <span>📡 {progressState.message}</span>
              {progressState.progress !== undefined && (
                <span>{progressState.progress}%</span>
              )}
            </div>
            <ProgressBar
              progress={progressState.progress ?? 0}
              variant="secondary"
              indeterminate={progressState.progress === undefined || progressState.progress === 0}
            />
          </div>
        )}

        {/* Action Button: Download Selected Range */}
        <button
          onClick={handleDownloadSelectedRange}
          disabled={isProcessing || (!url.trim() && !rawBlob)}
          className="w-full btn-primary py-3.5 text-sm font-bold shadow-xl flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Processing Media Clip...</span>
            </>
          ) : (
            <>
              <span>✂️</span>
              <span>
                Download {downloadMode === 'range' ? `Marked Clip (${formatTime(rangeStart)} - ${formatTime(rangeEnd)})` : 'Full Video'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Active Download Result Card */}
      {currentDownloaded && (
        <div className="card border-2 border-[var(--color-accent-indigo)]/50 bg-[var(--color-accent-indigo)]/5 space-y-4 animate-fade-in shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-2xl shrink-0 shadow-lg">
                {currentDownloaded.format === 'audio' ? '🎵' : '🎬'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate max-w-xs">
                    {currentDownloaded.filename}
                  </h3>
                  <span className="badge badge-primary text-[0.5625rem]">
                    {currentDownloaded.quality}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] mt-1">
                  <span>{formatFileSize(currentDownloaded.blob.size)}</span>
                  <span>•</span>
                  <span>Duration: {formatTime(currentDownloaded.duration)}</span>
                  {currentDownloaded.isTrimmed && (
                    <span className="text-[var(--color-accent-warning)] font-semibold">
                      ✂️ Trimmed ({formatTime(currentDownloaded.trimStart)} - {formatTime(currentDownloaded.trimEnd)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <span className="badge bg-green-500/20 text-green-400 border border-green-500/40 text-[0.6875rem] font-bold">
              ✓ Ready
            </span>
          </div>

          {/* Media Player */}
          {currentDownloaded.format === 'video' ? (
            <div className="rounded-xl overflow-hidden bg-black/60 aspect-video max-h-64 flex items-center justify-center border border-white/10">
              <video
                src={currentDownloaded.blobUrl}
                controls
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center gap-3">
              <audio src={currentDownloaded.blobUrl} controls className="w-full" />
            </div>
          )}

          {/* Export Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-[var(--color-glass-border)]">
            <button
              onClick={() => handleSaveToDevice(currentDownloaded)}
              className="btn-primary text-xs py-2.5 flex items-center justify-center gap-1.5"
            >
              <span>💾 Save to Computer</span>
            </button>

            <button
              onClick={() => handleOpenInEditor(currentDownloaded)}
              className="btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5"
            >
              <span>🎥 Edit in Pro Editor</span>
            </button>

            <button
              onClick={() => handleSendToShorts(currentDownloaded)}
              className="btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5"
            >
              <span>✂️ Split into Shorts</span>
            </button>
          </div>
        </div>
      )}

      {/* Download History */}
      {downloadHistory.length > 0 && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
              <span>📜 Download History ({downloadHistory.length})</span>
            </h3>
            <button
              onClick={() => setDownloadHistory([])}
              className="text-[0.6875rem] text-[var(--color-text-muted)] hover:text-red-400"
            >
              Clear History
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {downloadHistory.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-bg-primary)] hover:border-[var(--color-accent-indigo)]/50 flex items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-lg shrink-0">
                    {item.format === 'audio' ? '🎵' : '🎬'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {item.filename}
                    </p>
                    <p className="text-[0.6875rem] text-[var(--color-text-muted)] flex items-center gap-2">
                      <span>{item.quality}</span>
                      <span>•</span>
                      <span>{formatFileSize(item.blob.size)}</span>
                      <span>•</span>
                      <span>{formatTime(item.duration)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleSaveToDevice(item)}
                    className="btn-icon text-xs text-[var(--color-accent-indigo)]"
                    title="Save file"
                  >
                    💾
                  </button>
                  <button
                    onClick={() => handleOpenInEditor(item)}
                    className="btn-icon text-xs text-white"
                    title="Open in Pro Editor"
                  >
                    🎥
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
