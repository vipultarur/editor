import {
  Scissors,
  Trash2,
  Copy,
  Plus,
  RotateCcw,
  RotateCw,
  Magnet,
  ZoomIn,
  ZoomOut,
  Sliders,
} from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { TimelineClip } from '../../../types/editor';

interface TimelineHeaderProps {
  showAudioMixer?: boolean;
  setShowAudioMixer?: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export default function TimelineHeader({ showAudioMixer, setShowAudioMixer }: TimelineHeaderProps) {
  const { project, dispatch, copiedClip, setCopiedClip } = useEditor();

  const handleSplit = () => {
    if (project.selectedClipId) {
      dispatch({
        type: 'SPLIT_CLIP',
        payload: { clipId: project.selectedClipId, splitTime: project.playheadTime },
      });
    }
  };

  const handleDelete = () => {
    if (project.selectedClipId) {
      dispatch({ type: 'DELETE_CLIP', payload: project.selectedClipId });
    }
  };

  const handleDuplicate = () => {
    if (project.selectedClipId) {
      dispatch({ type: 'DUPLICATE_CLIP', payload: project.selectedClipId });
    }
  };

  const handleCopy = () => {
    if (project.selectedClipId) {
      for (const track of project.tracks) {
        const found = track.clips.find((c) => c.id === project.selectedClipId);
        if (found) {
          setCopiedClip(found);
          break;
        }
      }
    }
  };

  const handlePaste = () => {
    if (copiedClip) {
      const pastedClip: TimelineClip = {
        ...copiedClip,
        id: 'clip-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        startTime: project.playheadTime,
      };
      dispatch({ type: 'ADD_CLIP', payload: { clip: pastedClip } });
    }
  };

  return (
    <div className="h-10 bg-[var(--color-bg-surface)] border-b border-[var(--color-glass-border)] flex items-center justify-between px-4 z-10 flex-shrink-0">
      {/* Left Editing Tools */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleSplit}
          disabled={!project.selectedClipId}
          title="Split selected clip at playhead (S)"
          className="glass p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:border-[var(--color-accent-primary)]/50 disabled:opacity-40"
        >
          <Scissors className="w-3.5 h-3.5 text-indigo-400" /> Split
        </button>

        <button
          onClick={handleDuplicate}
          disabled={!project.selectedClipId}
          title="Duplicate selected clip (Ctrl+D)"
          className="glass p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:border-[var(--color-accent-primary)]/50 disabled:opacity-40"
        >
          <Copy className="w-3.5 h-3.5 text-pink-400" /> Duplicate
        </button>

        <button
          onClick={handleDelete}
          disabled={!project.selectedClipId}
          title="Delete selected clip (Delete)"
          className="glass p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:border-red-500/50 text-red-400 disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>

        <div className="h-4 w-[1px] bg-[var(--color-glass-border)] mx-1" />

        {/* Undo / Redo */}
        <button
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={project.history.past.length === 0}
          title="Undo (Ctrl+Z)"
          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-white disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => dispatch({ type: 'REDO' })}
          disabled={project.history.future.length === 0}
          title="Redo (Ctrl+Y)"
          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-white disabled:opacity-40"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-[1px] bg-[var(--color-glass-border)] mx-1" />

        {/* Add Track Menu */}
        <div className="relative group">
          <button
            onClick={() =>
              dispatch({
                type: 'ADD_TRACK',
                payload: { name: `Video Track ${project.tracks.filter(t => t.type === 'video').length + 1}`, type: 'video' },
              })
            }
            className="glass p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 text-[var(--color-accent-primary)] hover:border-[var(--color-accent-primary)] cursor-pointer"
            title="Click to add Video Track or hover to choose type"
          >
            <Plus className="w-3.5 h-3.5" /> Add Track
          </button>

          {/* Quick Track Type Options on Hover/Focus */}
          <div className="absolute left-0 top-full mt-1 hidden group-hover:flex flex-col bg-[#0f172a] border border-[var(--color-glass-border)] rounded-xl p-1.5 shadow-2xl z-50 min-w-36 text-xs gap-1">
            <button
              onClick={() =>
                dispatch({
                  type: 'ADD_TRACK',
                  payload: { name: `Video Track ${project.tracks.filter(t => t.type === 'video').length + 1}`, type: 'video' },
                })
              }
              className="px-2 py-1 rounded hover:bg-indigo-500/20 text-left font-medium text-indigo-300 flex items-center gap-1.5"
            >
              🎥 Video Track
            </button>
            <button
              onClick={() =>
                dispatch({
                  type: 'ADD_TRACK',
                  payload: { name: `Audio Track ${project.tracks.filter(t => t.type === 'audio').length + 1}`, type: 'audio' },
                })
              }
              className="px-2 py-1 rounded hover:bg-emerald-500/20 text-left font-medium text-emerald-300 flex items-center gap-1.5"
            >
              🎵 Audio Track
            </button>
            <button
              onClick={() =>
                dispatch({
                  type: 'ADD_TRACK',
                  payload: { name: `Image Track ${project.tracks.filter(t => t.type === 'image').length + 1}`, type: 'image' },
                })
              }
              className="px-2 py-1 rounded hover:bg-purple-500/20 text-left font-medium text-purple-300 flex items-center gap-1.5"
            >
              🖼️ Image Track
            </button>
            <button
              onClick={() =>
                dispatch({
                  type: 'ADD_TRACK',
                  payload: { name: `Text Track ${project.tracks.filter(t => t.type === 'text').length + 1}`, type: 'text' },
                })
              }
              className="px-2 py-1 rounded hover:bg-amber-500/20 text-left font-medium text-amber-300 flex items-center gap-1.5"
            >
              🔤 Text Track
            </button>
          </div>
        </div>
      </div>

      {/* Right Controls: Audio Mixer, Snap & Timeline Zoom Slider */}
      <div className="flex items-center gap-3">
        {/* Audio Mixer Toggle */}
        {setShowAudioMixer && (
          <button
            onClick={() => setShowAudioMixer((prev) => !prev)}
            title="Toggle Audio Track Mixer & VU Meters"
            className={`p-1.5 rounded-lg border flex items-center gap-1 text-xs font-semibold transition-all ${
              showAudioMixer
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-[var(--color-glass-border)] text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Audio Mixer
          </button>
        )}

        {/* Snap Toggle */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SNAP' })}
          title="Toggle Timeline Snapping (N)"
          className={`p-1.5 rounded-lg border flex items-center gap-1 text-xs font-semibold transition-all ${
            project.snapEnabled
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-[var(--color-glass-border)] text-[var(--color-text-muted)]'
          }`}
        >
          <Magnet className="w-3.5 h-3.5" /> Snap
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => dispatch({ type: 'SET_ZOOM_LEVEL', payload: project.zoomLevel - 15 })}
            title="Zoom Out Timeline (-)"
            className="p-1 text-[var(--color-text-muted)] hover:text-white"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min="10"
            max="200"
            value={project.zoomLevel}
            onChange={(e) => dispatch({ type: 'SET_ZOOM_LEVEL', payload: parseInt(e.target.value) })}
            className="w-24 accent-[var(--color-accent-primary)] cursor-pointer"
          />

          <button
            onClick={() => dispatch({ type: 'SET_ZOOM_LEVEL', payload: project.zoomLevel + 15 })}
            title="Zoom In Timeline (+)"
            className="p-1 text-[var(--color-text-muted)] hover:text-white"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
