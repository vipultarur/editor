import { useEffect, useRef } from 'react';
import { Scissors, Copy, Trash2, Volume2, VolumeX, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { TimelineClip } from '../../../types/editor';

interface ClipContextMenuProps {
  x: number;
  y: number;
  clip: TimelineClip;
  onClose: () => void;
}

export default function ClipContextMenu({ x, y, clip, onClose }: ClipContextMenuProps) {
  const { project, dispatch, setCopiedClip } = useEditor();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleSplit = () => {
    dispatch({
      type: 'SPLIT_CLIP',
      payload: { clipId: clip.id, splitTime: project.playheadTime },
    });
    onClose();
  };

  const handleCopy = () => {
    setCopiedClip(clip);
    onClose();
  };

  const handleDuplicate = () => {
    dispatch({ type: 'DUPLICATE_CLIP', payload: clip.id });
    onClose();
  };

  const handleToggleMute = () => {
    if ('muted' in clip) {
      dispatch({
        type: 'UPDATE_CLIP',
        payload: { id: clip.id, updates: { muted: !(clip as any).muted } },
      });
    }
    onClose();
  };

  const handleReorderLayer = (direction: 'forward' | 'backward') => {
    dispatch({
      type: 'REORDER_CLIP_LAYER',
      payload: { clipId: clip.id, action: direction },
    });
    onClose();
  };

  const handleDelete = () => {
    dispatch({ type: 'DELETE_CLIP', payload: clip.id });
    onClose();
  };

  // Keep menu within viewport bounds
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 260);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[#0f172a]/95 backdrop-blur-md border border-indigo-500/40 rounded-xl shadow-2xl p-1.5 min-w-48 text-xs select-none animate-fade-in space-y-1"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1 border-b border-slate-700/60 mb-1 flex items-center justify-between">
        <span className="font-bold text-indigo-300 truncate max-w-[130px]">{clip.name}</span>
        <span className="text-[0.5625rem] font-mono text-slate-400 uppercase bg-slate-800 px-1 rounded">{clip.type}</span>
      </div>

      {/* Action: Split */}
      <button
        onClick={handleSplit}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-indigo-500/20 text-slate-200 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <Scissors className="w-3.5 h-3.5 text-indigo-400" /> Split at Playhead
        </span>
        <kbd className="text-[0.5625rem] bg-slate-800 text-slate-400 px-1 rounded">S</kbd>
      </button>

      {/* Action: Duplicate */}
      <button
        onClick={handleDuplicate}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-pink-500/20 text-slate-200 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Duplicate Clip
        </span>
        <kbd className="text-[0.5625rem] bg-slate-800 text-slate-400 px-1 rounded">Ctrl+D</kbd>
      </button>

      {/* Action: Copy */}
      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-purple-500/20 text-slate-200 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <Copy className="w-3.5 h-3.5 text-purple-400" /> Copy Clip
        </span>
        <kbd className="text-[0.5625rem] bg-slate-800 text-slate-400 px-1 rounded">Ctrl+C</kbd>
      </button>

      {/* Action: Mute Toggle (for video/audio clips) */}
      {'muted' in clip && (
        <button
          onClick={handleToggleMute}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-emerald-500/20 text-slate-200 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2 font-medium">
            {(clip as any).muted ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Unmute Clip
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-red-400" /> Mute Clip
              </>
            )}
          </span>
        </button>
      )}

      <div className="h-[1px] bg-slate-700/60 my-1" />

      {/* Action: Bring Forward */}
      <button
        onClick={() => handleReorderLayer('forward')}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-sky-500/20 text-slate-200 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <ArrowUp className="w-3.5 h-3.5 text-sky-400" /> Bring Layer Forward
        </span>
      </button>

      {/* Action: Send Backward */}
      <button
        onClick={() => handleReorderLayer('backward')}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-amber-500/20 text-slate-200 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <ArrowDown className="w-3.5 h-3.5 text-amber-400" /> Send Layer Backward
        </span>
      </button>

      <div className="h-[1px] bg-slate-700/60 my-1" />

      {/* Action: Delete */}
      <button
        onClick={handleDelete}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <Trash2 className="w-3.5 h-3.5" /> Delete Clip
        </span>
        <kbd className="text-[0.5625rem] bg-red-950 text-red-400 px-1 rounded">Del</kbd>
      </button>
    </div>
  );
}
