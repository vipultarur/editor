import { useCallback, useRef, useState } from 'react';
import { formatFileSize } from '../utils/fileHelpers';
import { isVideoFileSupported } from '../utils/videoHelpers';
import { isSupportedMediaUrl } from '../utils/youtubeDownload';
import {
  getStoredUrlHistory,
  addUrlToHistory,
  removeUrlFromHistory,
  clearUrlHistory,
  type UrlHistoryItem,
} from '../utils/urlHistory';
import ProgressBar from './ProgressBar';

type InputMode = 'file' | 'youtube';

interface VideoUploadZoneProps {
  onFileSelected: (file: File) => void;
  onYouTubeUrl: (url: string) => void;
  currentFile: { name: string; size: number; source?: string } | null;
  disabled?: boolean;
  isDownloading?: boolean;
  downloadProgress?: { message: string; progress?: number };
}

export default function VideoUploadZone({
  onFileSelected,
  onYouTubeUrl,
  currentFile,
  disabled,
  isDownloading,
  downloadProgress,
}: VideoUploadZoneProps) {
  const [mode, setMode] = useState<InputMode>('file');
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [urlHistory, setUrlHistory] = useState<UrlHistoryItem[]>(() => getStoredUrlHistory());
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      if (!isVideoFileSupported(file)) {
        setError('Unsupported format. Please use MP4, WebM, MOV, AVI, or MKV.');
        return;
      }

      if (file.size > 2 * 1024 * 1024 * 1024) {
        setError('File too large. Maximum supported size is 2 GB.');
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleYouTubeSubmit = useCallback(
    (overrideUrl?: string) => {
      setError(null);
      const url = (overrideUrl ?? youtubeUrl).trim();

      if (!url) {
        setError('Please enter a YouTube or Instagram URL.');
        return;
      }

      if (!isSupportedMediaUrl(url)) {
        setError('Invalid URL. Supported formats: YouTube (youtube.com, youtu.be, shorts) & Instagram (reels/posts)');
        return;
      }

      const updated = addUrlToHistory(url);
      setUrlHistory(updated);
      setYoutubeUrl(url);

      onYouTubeUrl(url);
    },
    [youtubeUrl, onYouTubeUrl]
  );

  const handleRemoveHistoryItem = useCallback((e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    const updated = removeUrlFromHistory(url);
    setUrlHistory(updated);
  }, []);

  const handleClearHistory = useCallback(() => {
    const updated = clearUrlHistory();
    setUrlHistory(updated);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled || isDownloading) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile, disabled, isDownloading]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !isDownloading) setIsDragOver(true);
    },
    [disabled, isDownloading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && !isDownloading) inputRef.current?.click();
  }, [disabled, isDownloading]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  // Downloading state
  if (isDownloading && downloadProgress) {
    return (
      <div className="card space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-accent-danger)]/10 flex items-center justify-center text-2xl shrink-0">
            <span className="animate-[spin-slow_2s_linear_infinite]">📡</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Downloading from YouTube
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {downloadProgress.message}
            </p>
          </div>
        </div>
        <ProgressBar
          progress={downloadProgress.progress ?? 0}
          variant="secondary"
          indeterminate={downloadProgress.progress === undefined || downloadProgress.progress === 0}
          label={downloadProgress.message}
          showPercentage={downloadProgress.progress !== undefined && downloadProgress.progress > 0}
        />
      </div>
    );
  }

  // File loaded state
  if (currentFile) {
    return (
      <div className="card flex items-center gap-4 animate-fade-in">
        <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center text-xl shrink-0">
          {currentFile.source === 'youtube' ? '📺' : '🎬'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
            {currentFile.name}
          </p>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <span>{formatFileSize(currentFile.size)}</span>
            {currentFile.source === 'youtube' && (
              <span className="badge badge-primary text-[0.5625rem]">YouTube</span>
            )}
            {currentFile.size > 500 * 1024 * 1024 && (
              <span className="text-[var(--color-accent-warning)]">
                ⚠️ Large file — processing may be slow
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            setMode('file');
            handleClick();
          }}
          className="btn-secondary text-xs"
          disabled={disabled}
        >
          Change
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    );
  }

  // Upload zone with tabs
  return (
    <div>
      {/* Mode Tabs */}
      <div className="flex mb-4 gap-1 p-1 rounded-xl glass w-fit">
        <button
          onClick={() => { setMode('file'); setError(null); }}
          className={`
            px-4 py-2 rounded-lg text-xs font-semibold border-0 cursor-pointer font-[inherit]
            transition-all duration-200
            ${mode === 'file'
              ? 'gradient-primary text-white shadow-md'
              : 'bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }
          `}
        >
          📁 Local File
        </button>
        <button
          onClick={() => { setMode('youtube'); setError(null); }}
          className={`
            px-4 py-2 rounded-lg text-xs font-semibold border-0 cursor-pointer font-[inherit]
            transition-all duration-200
            ${mode === 'youtube'
              ? 'gradient-primary text-white shadow-md'
              : 'bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }
          `}
        >
          📺 YouTube URL
        </button>
      </div>

      {/* File Upload Zone */}
      {mode === 'file' && (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative rounded-2xl border-2 border-dashed cursor-pointer
            transition-all duration-300 p-8 md:p-12 text-center group
            ${
              isDragOver
                ? 'border-[var(--color-accent-indigo)] bg-[var(--color-accent-indigo)]/5 scale-[1.01]'
                : 'border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] hover:border-[var(--color-glass-border-hover)] hover:bg-[var(--color-bg-surface-hover)]'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl glass flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
            📹
          </div>

          <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
            {isDragOver ? 'Drop your video here' : 'Drag & drop a video file'}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            or click to browse • MP4, WebM, MOV, AVI, MKV
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass text-xs text-[var(--color-text-secondary)]">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Files stay on your device — never uploaded
          </div>
        </div>
      )}

      {/* YouTube URL Input */}
      {mode === 'youtube' && (
        <div className="rounded-2xl border border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-2xl shrink-0">
              ▶
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Paste a YouTube video URL
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Supports youtube.com, youtu.be, shorts, and live links
              </p>
            </div>
          </div>

          {/* URL Input + Button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm">
                🔗
              </span>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleYouTubeSubmit();
                }}
                placeholder="https://youtube.com/watch?v=..."
                className="input pl-9 text-sm"
                disabled={disabled}
              />
            </div>
            <button
              onClick={() => handleYouTubeSubmit()}
              disabled={disabled || !youtubeUrl.trim()}
              className="btn-primary shrink-0"
            >
              ↓ Fetch Video
            </button>
          </div>

          {/* URL History */}
          {urlHistory.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-[var(--color-glass-border)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5">
                  <span>📜</span> Recent URL History ({urlHistory.length})
                </span>
                <button
                  onClick={handleClearHistory}
                  className="text-[0.6875rem] text-[var(--color-text-muted)] hover:text-[var(--color-accent-danger)] transition-colors cursor-pointer"
                >
                  Clear History
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {urlHistory.map((item) => (
                  <div
                    key={item.url}
                    onClick={() => handleYouTubeSubmit(item.url)}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-bg-primary)] hover:border-[var(--color-accent-indigo)]/50 hover:bg-[var(--color-bg-surface-hover)] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs text-red-400 shrink-0">▶</span>
                      <span className="text-xs font-medium text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-accent-indigo)]">
                        {item.url}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[0.625rem] text-[var(--color-accent-indigo)] opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                        Use Link ➔
                      </span>
                      <button
                        onClick={(e) => handleRemoveHistoryItem(e, item.url)}
                        className="btn-icon text-[var(--color-text-muted)] hover:text-[var(--color-accent-danger)] text-xs"
                        title="Remove from history"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Note */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--color-accent-cyan)]/5 border border-[var(--color-accent-cyan)]/15">
            <span className="text-sm shrink-0">ℹ️</span>
            <div className="text-[0.6875rem] text-[var(--color-text-muted)] leading-relaxed">
              <strong className="text-[var(--color-accent-cyan)]">How it works:</strong>{' '}
              The video is fetched via a download service (cobalt.tools) and loaded into your browser.
              Once downloaded, all processing happens 100% locally on your device.
              <em className="block mt-1 text-[var(--color-text-muted)]/70">
                Note: The public API may have rate limits. For heavy use, consider self-hosting a cobalt instance.
              </em>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-accent-danger)]/10 border border-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)] text-xs font-medium animate-fade-in">
          <span>⚠️</span> {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
