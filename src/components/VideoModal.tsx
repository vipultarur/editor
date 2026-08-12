import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from '../state/SessionContext';
import { formatDuration, downloadBlob } from '../utils/fileHelpers';

export interface VideoClipInfo {
  id: string;
  blobUrl: string;
  fileName: string;
  aspectRatio: string;
  duration: number;
  index?: number;
}

interface VideoModalProps {
  clip: VideoClipInfo | null;
  onClose: () => void;
}

export default function VideoModal({ clip, onClose }: VideoModalProps) {
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const { dispatch: sessionDispatch } = useSession();

  const handleOpenProEditor = () => {
    if (!clip) return;
    sessionDispatch({
      type: 'OPEN_IN_PRO_EDITOR',
      payload: {
        blobUrl: clip.blobUrl,
        fileName: clip.fileName,
        duration: clip.duration,
        aspectRatio: clip.aspectRatio,
      },
    });
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (clip) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clip, onClose]);

  if (!clip) return null;

  const ratioString = clip.aspectRatio;
  const isOriginal = ratioString === 'Original' || ratioString === 'original';
  const aspectCss =
    ratioString === '9:16'
      ? '9/16'
      : ratioString === '1:1'
      ? '1/1'
      : ratioString === '4:5'
      ? '4/5'
      : '16/9';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card max-w-4xl w-full max-h-[90vh] flex flex-col p-4 sm:p-6 bg-[var(--color-bg-secondary)] border-[var(--color-glass-border-hover)] shadow-2xl overflow-hidden m-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-glass-border)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center text-sm font-bold text-white shrink-0">
              ▶
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[var(--color-text-primary)] truncate">
                {clip.index !== undefined ? `Clip ${clip.index + 1}` : 'Video Preview'}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] truncate">{clip.fileName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="badge badge-primary text-xs">{clip.aspectRatio}</span>
            <span className="badge badge-secondary text-xs">{formatDuration(clip.duration)}</span>
            <button
              onClick={onClose}
              className="btn-icon text-lg text-[var(--color-text-secondary)] hover:text-white ml-2 cursor-pointer"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video Framing Options */}
        {!isOriginal && (
          <div className="flex items-center justify-center gap-2 pt-3 shrink-0">
            <span className="text-[0.6875rem] text-[var(--color-text-muted)] font-medium">Viewing Mode:</span>
            <button
              onClick={() => setFitMode('cover')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                fitMode === 'cover'
                  ? 'border-[var(--color-accent-indigo)] bg-[var(--color-accent-indigo)]/10 text-[var(--color-accent-indigo)]'
                  : 'border-[var(--color-glass-border)] text-[var(--color-text-muted)] hover:text-white'
              }`}
            >
              📱 {clip.aspectRatio} Aspect Framed
            </button>
            <button
              onClick={() => setFitMode('contain')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                fitMode === 'contain'
                  ? 'border-[var(--color-accent-indigo)] bg-[var(--color-accent-indigo)]/10 text-[var(--color-accent-indigo)]'
                  : 'border-[var(--color-glass-border)] text-[var(--color-text-muted)] hover:text-white'
              }`}
            >
              📺 Full Video View
            </button>
          </div>
        )}

        {/* Video Player Box */}
        <div className="flex-1 min-h-0 py-4 flex items-center justify-center bg-black/90 rounded-xl my-3 overflow-hidden">
          {!isOriginal && fitMode === 'cover' ? (
            <div
              className="relative rounded-xl overflow-hidden shadow-2xl bg-black border border-white/10"
              style={{ aspectRatio: aspectCss, maxHeight: '60vh', maxWidth: '100%', height: '100%' }}
            >
              <video
                src={clip.blobUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <video
              src={clip.blobUrl}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl"
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-glass-border)] shrink-0">
          <button
            onClick={handleOpenProEditor}
            className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 font-bold"
          >
            🎥 Open in Pro Editor
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">
              Close
            </button>
            <button
              onClick={() => downloadBlob(clip.blobUrl, clip.fileName)}
              className="btn-success text-xs px-4 py-2"
            >
              ↓ Download Clip (.mp4)
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
