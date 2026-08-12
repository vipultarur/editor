import { useState, useRef } from 'react';
import { formatDuration, downloadBlob } from '../utils/fileHelpers';
import { getCssFilter } from '../utils/filterHelpers';

interface ClipCardProps {
  id: string;
  blobUrl: string;
  thumbnailUrl: string;
  duration: number;
  aspectRatio: string;
  fileName: string;
  index: number;
  speed?: number;
  filterPreset?: string;
  captionText?: string;
  captionPosition?: 'top' | 'center' | 'bottom';
  captionColor?: string;
  captionBg?: string;
  captionAnim?: 'pop' | 'fade' | 'bounce' | 'static';
  onDelete: (id: string) => void;
  onSelect?: (id: string) => void;
  onOpenModal?: () => void;
  onEdit?: (id: string) => void;
  onOpenProEditor?: () => void;
  isSelected?: boolean;
}

export default function ClipCard({
  id,
  blobUrl,
  thumbnailUrl,
  duration,
  aspectRatio,
  fileName,
  index,
  speed = 1,
  filterPreset,
  captionText,
  captionPosition = 'bottom',
  captionColor = '#ffffff',
  captionBg = 'rgba(0,0,0,0.7)',
  captionAnim = 'pop',
  onDelete,
  onSelect,
  onOpenModal,
  onEdit,
  onOpenProEditor,
  isSelected,
}: ClipCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenModal) {
      onOpenModal();
      return;
    }
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.playbackRate = speed;
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const cssFilter = getCssFilter(filterPreset);

  return (
    <div
      className={`
        card overflow-hidden animate-slide-up group
        ${isSelected ? 'ring-2 ring-[var(--color-accent-indigo)]' : ''}
      `}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Preview Area */}
      <div
        className="relative rounded-xl overflow-hidden bg-black mb-3 cursor-pointer"
        style={{ aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '1:1' ? '1/1' : aspectRatio === '4:5' ? '4/5' : '16/9' }}
        onClick={togglePlay}
      >
        {/* Thumbnail (shown when not playing) */}
        {!isPlaying && thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={`Clip ${index + 1} thumbnail`}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: cssFilter }}
          />
        )}

        {/* Video */}
        <video
          ref={videoRef}
          src={blobUrl}
          className={`absolute inset-0 w-full h-full object-cover ${isPlaying ? '' : 'opacity-0'}`}
          style={{ filter: cssFilter }}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          playsInline
        />

        {/* Play/Pause overlay */}
        <div
          className={`
            absolute inset-0 flex items-center justify-center bg-black/30
            transition-opacity duration-200
            ${isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'}
          `}
        >
          <div className="w-12 h-12 rounded-full glass-strong flex items-center justify-center text-white text-lg group-hover:scale-110 transition-transform">
            {isPlaying ? '⏸' : '▶'}
          </div>
        </div>

        {/* Caption Overlay */}
        {captionText && (
          <div
            className={`
              absolute px-2.5 py-1 rounded text-[0.6875rem] font-bold shadow-lg pointer-events-none text-center max-w-[90%] truncate
              ${captionPosition === 'top' ? 'top-2 left-1/2 -translate-x-1/2' : captionPosition === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : 'bottom-2 left-1/2 -translate-x-1/2'}
            `}
            style={{ color: captionColor, backgroundColor: captionBg }}
          >
            {captionText}
          </div>
        )}

        {/* Speed / Filter Badges */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {speed !== 1 && (
            <span className="badge badge-warning text-[0.5625rem]">{speed}x</span>
          )}
          {filterPreset && filterPreset !== 'normal' && (
            <span className="badge badge-primary text-[0.5625rem]">🎨 Filter</span>
          )}
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 badge badge-primary text-[0.625rem]">
          {formatDuration(duration)}
        </div>

        {/* Aspect ratio badge */}
        <div className="absolute top-2 left-2 badge badge-secondary text-[0.625rem]">
          {aspectRatio}
        </div>
      </div>

      {/* Info */}
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onOpenModal?.()}>
          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate hover:text-[var(--color-accent-indigo)] transition-colors">
            Clip {index + 1}
          </p>
          <p className="text-[0.6875rem] text-[var(--color-text-muted)] truncate">{fileName}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenProEditor && (
            <button
              onClick={onOpenProEditor}
              className="px-2 py-1 rounded-lg bg-[var(--color-accent-indigo)] text-white text-[0.625rem] font-bold shadow hover:scale-105 transition-transform flex items-center gap-1"
              title="Open in Pro Video Editor workspace"
            >
              🎥 Edit
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(id)}
              className="btn-icon text-[var(--color-accent-purple)] hover:text-white"
              title="Edit speed, filter, and captions"
            >
              ✏️
            </button>
          )}
          {onOpenModal && (
            <button
              onClick={() => onOpenModal()}
              className="btn-icon text-[var(--color-accent-indigo)]"
              title="Full-size video view"
            >
              ⤢
            </button>
          )}
          {onSelect && (
            <button
              onClick={() => onSelect(id)}
              className={`btn-icon ${isSelected ? 'text-[var(--color-accent-indigo)] border-[var(--color-accent-indigo)]' : ''}`}
              title="Select for merge"
            >
              ✓
            </button>
          )}
          <button
            onClick={() => downloadBlob(blobUrl, fileName)}
            className="btn-icon text-[var(--color-accent-success)]"
            title="Download clip"
          >
            ↓
          </button>
          <button
            onClick={() => onDelete(id)}
            className="btn-icon text-[var(--color-accent-danger)]"
            title="Delete clip"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
