import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from '../state/SessionContext';
import { type ShortClip } from '../state/sessionReducer';
import { COLOR_FILTER_PRESETS } from '../utils/filterHelpers';

interface ClipEditorModalProps {
  clip: ShortClip | null;
  onClose: () => void;
  onSave: (clipId: string, updates: Partial<ShortClip>) => void;
}

export default function ClipEditorModal({ clip, onClose, onSave }: ClipEditorModalProps) {
  if (!clip) return null;

  const { dispatch: sessionDispatch } = useSession();

  const handleOpenProEditor = () => {
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

  const [activeTab, setActiveTab] = useState<'controls' | 'filters' | 'captions'>('controls');
  const [speed, setSpeed] = useState<number>(clip.speed ?? 1);
  const [filterPreset, setFilterPreset] = useState<string>(clip.filterPreset ?? 'normal');
  const [captionText, setCaptionText] = useState<string>(clip.captionText ?? '');
  const [captionPosition, setCaptionPosition] = useState<'top' | 'center' | 'bottom'>(clip.captionPosition ?? 'bottom');
  const [captionColor, setCaptionColor] = useState<string>(clip.captionColor ?? '#ffffff');
  const [captionBg, setCaptionBg] = useState<string>(clip.captionBg ?? 'rgba(0,0,0,0.7)');
  const [captionAnim, setCaptionAnim] = useState<'pop' | 'fade' | 'bounce' | 'static'>(clip.captionAnim ?? 'pop');

  const handleSave = () => {
    onSave(clip.id, {
      speed,
      filterPreset,
      captionText,
      captionPosition,
      captionColor,
      captionBg,
      captionAnim,
    });
    onClose();
  };

  const selectedFilterObj = COLOR_FILTER_PRESETS.find((p) => p.id === filterPreset);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card max-w-2xl w-full max-h-[90vh] flex flex-col p-4 sm:p-6 bg-[var(--color-bg-secondary)] border-[var(--color-glass-border-hover)] shadow-2xl overflow-hidden m-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-glass-border)] shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center text-sm font-bold text-white">
              ✏️
            </span>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Clip Editor & Studio Studio
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] truncate max-w-[240px]">
                {clip.fileName} ({clip.aspectRatio})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon text-lg text-[var(--color-text-secondary)] hover:text-white">
            ✕
          </button>
        </div>

        {/* Editor Tabs */}
        <div className="flex border-b border-[var(--color-glass-border)] pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('controls')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'controls'
                ? 'border-[var(--color-accent-indigo)] text-[var(--color-accent-indigo)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            ⚙️ Speed & Controls
          </button>
          <button
            onClick={() => setActiveTab('filters')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'filters'
                ? 'border-[var(--color-accent-indigo)] text-[var(--color-accent-indigo)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            🎨 Color Filters
          </button>
          <button
            onClick={() => setActiveTab('captions')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'captions'
                ? 'border-[var(--color-accent-indigo)] text-[var(--color-accent-indigo)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            📝 Subtitles & Captions
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* TAB 1: SPEED & CONTROLS */}
          {activeTab === 'controls' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 block">
                  Playback Speed ({speed}x)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`py-2 px-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        speed === s
                          ? 'border-[var(--color-accent-indigo)] bg-[var(--color-accent-indigo)]/15 text-[var(--color-accent-indigo)]'
                          : 'border-[var(--color-glass-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COLOR FILTERS */}
          {activeTab === 'filters' && (
            <div className="space-y-4 animate-fade-in">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 block">
                Select Color Filter Preset
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COLOR_FILTER_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setFilterPreset(p.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      filterPreset === p.id
                        ? 'border-[var(--color-accent-purple)] bg-[var(--color-accent-purple)]/15 text-white'
                        : 'border-[var(--color-glass-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{p.icon}</span>
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">{p.name}</span>
                    </div>
                    <p className="text-[0.625rem] text-[var(--color-text-muted)] line-clamp-2">
                      {p.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CAPTIONS / SUBTITLES */}
          {activeTab === 'captions' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">
                  Caption / Subtitle Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. 🔥 Incredible Video Hack!"
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">
                    Position
                  </label>
                  <select
                    value={captionPosition}
                    onChange={(e) => setCaptionPosition(e.target.value as 'top' | 'center' | 'bottom')}
                    className="input text-xs"
                  >
                    <option value="bottom">Bottom Overlay</option>
                    <option value="center">Center Overlay</option>
                    <option value="top">Top Overlay</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">
                    Animation Style
                  </label>
                  <select
                    value={captionAnim}
                    onChange={(e) => setCaptionAnim(e.target.value as 'pop' | 'fade' | 'bounce' | 'static')}
                    className="input text-xs"
                  >
                    <option value="pop">💥 Pop Highlight</option>
                    <option value="fade">✨ Fade Smooth</option>
                    <option value="bounce">🏀 Bounce Energy</option>
                    <option value="static">📌 Static Standard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">
                    Text Color
                  </label>
                  <input
                    type="color"
                    value={captionColor}
                    onChange={(e) => setCaptionColor(e.target.value)}
                    className="w-full h-9 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-glass-border)] cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">
                    Background Box Color
                  </label>
                  <input
                    type="color"
                    value={captionBg.startsWith('#') ? captionBg : '#000000'}
                    onChange={(e) => setCaptionBg(e.target.value)}
                    className="w-full h-9 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-glass-border)] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Preview Box */}
        <div className="p-3 bg-black rounded-xl relative flex items-center justify-center min-h-[140px] max-h-[200px] overflow-hidden border border-[var(--color-glass-border)] shrink-0 my-2">
          <video
            src={clip.blobUrl}
            controls
            playsInline
            style={{ filter: selectedFilterObj ? selectedFilterObj.cssFilter : 'none' }}
            className="max-h-[180px] w-auto object-contain rounded"
          />

          {/* Dynamic Overlay Caption Preview */}
          {captionText.trim() && (
            <div
              className={`
                absolute px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg pointer-events-none text-center
                ${captionPosition === 'top' ? 'top-3' : captionPosition === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-3'}
                ${captionAnim === 'pop' ? 'animate-bounce' : captionAnim === 'bounce' ? 'animate-pulse' : ''}
              `}
              style={{ color: captionColor, backgroundColor: captionBg, backdropFilter: 'blur(4px)' }}
            >
              {captionText}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-glass-border)] shrink-0">
          <button onClick={handleOpenProEditor} className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 font-bold">
            🎥 Open in Pro Editor
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary text-xs px-5 py-2">
              💾 Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
