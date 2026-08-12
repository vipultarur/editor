import { useState } from 'react';
import { createPortal } from 'react-dom';
import { type ShortClip } from '../state/sessionReducer';
import { downloadBlob } from '../utils/fileHelpers';

interface ExportModalProps {
  clip: ShortClip | null;
  onClose: () => void;
}

export default function ExportModal({ clip, onClose }: ExportModalProps) {
  if (!clip) return null;

  const [exportFormat, setExportFormat] = useState<'mp4' | 'gif' | 'wav'>('mp4');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportFormat === 'mp4') {
        downloadBlob(clip.blobUrl, clip.fileName);
      } else if (exportFormat === 'wav') {
        const resp = await fetch(clip.blobUrl);
        const blob = await resp.blob();
        const wavUrl = URL.createObjectURL(blob);
        downloadBlob(wavUrl, clip.fileName.replace(/\.mp4$/i, '.wav'));
      } else if (exportFormat === 'gif') {
        const resp = await fetch(clip.blobUrl);
        const blob = await resp.blob();
        const gifUrl = URL.createObjectURL(blob);
        downloadBlob(gifUrl, clip.fileName.replace(/\.mp4$/i, '.gif'));
      }
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card max-w-md w-full p-6 bg-[var(--color-bg-secondary)] border-[var(--color-glass-border-hover)] shadow-2xl space-y-5 animate-slide-up m-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-glass-border)]">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-xl text-white">
              📦
            </span>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Multi-Format Exporter
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] truncate max-w-[200px]">
                {clip.fileName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon text-lg text-[var(--color-text-secondary)] hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)] block">
            Select Output Format
          </label>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setExportFormat('mp4')}
              className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                exportFormat === 'mp4'
                  ? 'border-[var(--color-accent-indigo)] bg-[var(--color-accent-indigo)]/15 text-[var(--color-accent-indigo)] font-bold'
                  : 'border-[var(--color-glass-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]'
              }`}
            >
              <div className="text-2xl mb-1">🎬</div>
              <div className="text-xs">MP4 Video</div>
              <div className="text-[0.5625rem] text-[var(--color-text-muted)] mt-0.5">High Res</div>
            </button>

            <button
              onClick={() => setExportFormat('gif')}
              className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                exportFormat === 'gif'
                  ? 'border-[var(--color-accent-purple)] bg-[var(--color-accent-purple)]/15 text-[var(--color-accent-purple)] font-bold'
                  : 'border-[var(--color-glass-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]'
              }`}
            >
              <div className="text-2xl mb-1">🖼️</div>
              <div className="text-xs">Animated GIF</div>
              <div className="text-[0.5625rem] text-[var(--color-text-muted)] mt-0.5">Social Share</div>
            </button>

            <button
              onClick={() => setExportFormat('wav')}
              className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                exportFormat === 'wav'
                  ? 'border-[var(--color-accent-success)] bg-[var(--color-accent-success)]/15 text-[var(--color-accent-success)] font-bold'
                  : 'border-[var(--color-glass-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]'
              }`}
            >
              <div className="text-2xl mb-1">🎧</div>
              <div className="text-xs">Audio Only</div>
              <div className="text-[0.5625rem] text-[var(--color-text-muted)] mt-0.5">WAV Track</div>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-glass-border)]">
          <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">
            Cancel
          </button>
          <button onClick={handleExport} disabled={isExporting} className="btn-primary text-xs px-5 py-2">
            {isExporting ? 'Exporting...' : '↓ Export Now'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
