import { useRef, useEffect, useState, type MouseEvent } from 'react';
import { Film, Music, Image as ImageIcon, Type, MessageSquare, Sparkles, Wand2 } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { TimelineClip } from '../../../types/editor';
import { getAudioPeaks, drawWaveform } from '../../../utils/audioWaveform';
import ClipContextMenu from './ClipContextMenu';

interface ClipItemProps {
  clip: TimelineClip;
  trackId: string;
  zoom: number;
}

export default function ClipItem({ clip, trackId, zoom }: ClipItemProps) {
  const { project, dispatch } = useEditor();
  const canvasWaveformRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const dragStartRef = useRef<{ mouseX: number; initialStartTime: number; initialDuration: number; initialTrimStart: number }>({
    mouseX: 0,
    initialStartTime: 0,
    initialDuration: 0,
    initialTrimStart: 0,
  });

  const width = Math.max(16, clip.duration * zoom);
  const left = clip.startTime * zoom;
  const isSelected = project.selectedClipIds?.includes(clip.id) || project.selectedClipId === clip.id;

  // Draw Audio Waveform for Audio Clips
  useEffect(() => {
    if (clip.type === 'audio' && canvasWaveformRef.current) {
      const canvas = canvasWaveformRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        getAudioPeaks(clip.blobUrl, Math.max(20, Math.floor(width / 3))).then((peaks) => {
          drawWaveform(ctx, peaks, width, 40, 'rgba(52, 211, 153, 0.8)');
        });
      }
    }
  }, [clip, width]);

  // Handle Drag to move clip position on timeline (both horizontal & vertical track switching)
  const handleMouseDown = (e: MouseEvent, mode: 'move' | 'trimStart' | 'trimEnd') => {
    if (e.button !== 0) return; // Only primary mouse button triggers drag
    e.stopPropagation();

    if (e.shiftKey) {
      dispatch({ type: 'TOGGLE_SELECT_CLIP', payload: clip.id });
    } else {
      if (!isSelected) {
        dispatch({ type: 'SET_SELECTED_CLIP', payload: clip.id });
      }
    }
    dispatch({ type: 'SET_SELECTED_TRACK', payload: trackId });

    dragStartRef.current = {
      mouseX: e.clientX,
      initialStartTime: clip.startTime,
      initialDuration: clip.duration,
      initialTrimStart: clip.trimStart,
    };

    setIsDragging(true);

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const deltaPx = moveEvent.clientX - dragStartRef.current.mouseX;
      const deltaSec = deltaPx / zoom;

      if (mode === 'move') {
        let newStart = dragStartRef.current.initialStartTime + deltaSec;

        // Snapping logic to playhead
        if (project.snapEnabled) {
          if (Math.abs(newStart - project.playheadTime) < 0.2) {
            newStart = project.playheadTime;
          }
        }

        // Detect track row element under mouse cursor for vertical drag & drop
        let targetTrackId: string | undefined = undefined;
        const elemUnderMouse = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        const trackRowElem = elemUnderMouse?.closest('[data-track-id]');
        if (trackRowElem) {
          const hoveredTrackId = trackRowElem.getAttribute('data-track-id');
          if (hoveredTrackId) {
            targetTrackId = hoveredTrackId;
          }
        }

        dispatch({
          type: 'MOVE_CLIP',
          payload: {
            clipId: clip.id,
            newStartTime: Math.max(0, newStart),
            targetTrackId: targetTrackId || trackId,
          },
        });
      } else if (mode === 'trimStart') {
        const newStart = Math.max(0, dragStartRef.current.initialStartTime + deltaSec);
        const diff = newStart - dragStartRef.current.initialStartTime;
        const newDur = Math.max(0.2, dragStartRef.current.initialDuration - diff);
        const newTrim = Math.max(0, dragStartRef.current.initialTrimStart + diff);

        dispatch({
          type: 'RESIZE_CLIP',
          payload: {
            clipId: clip.id,
            newStartTime: newStart,
            newDuration: newDur,
            newTrimStart: newTrim,
          },
        });
      } else if (mode === 'trimEnd') {
        const newDur = Math.max(0.2, dragStartRef.current.initialDuration + deltaSec);
        dispatch({
          type: 'RESIZE_CLIP',
          payload: { clipId: clip.id, newDuration: newDur },
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: 'SET_SELECTED_CLIP', payload: clip.id });
    dispatch({ type: 'SET_SELECTED_TRACK', payload: trackId });
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  // Icon for clip type tag
  const getClipIcon = () => {
    switch (clip.type) {
      case 'video':
        return <Film className="w-3 h-3 text-indigo-300" />;
      case 'image':
        return <ImageIcon className="w-3 h-3 text-purple-300" />;
      case 'audio':
        return <Music className="w-3 h-3 text-emerald-300" />;
      case 'text':
        return <Type className="w-3 h-3 text-amber-300" />;
      case 'caption':
        return <MessageSquare className="w-3 h-3 text-cyan-300" />;
      case 'element':
        return <Sparkles className="w-3 h-3 text-pink-300" />;
      case 'effect':
        return <Wand2 className="w-3 h-3 text-fuchsia-300" />;
      default:
        return null;
    }
  };

  // Color coding clip items based on clip type
  const getClipColorClasses = () => {
    switch (clip.type) {
      case 'video':
        return 'bg-gradient-to-r from-indigo-900/90 to-indigo-700/90 border-indigo-500 text-indigo-100';
      case 'image':
        return 'bg-gradient-to-r from-purple-900/90 to-purple-700/90 border-purple-500 text-purple-100';
      case 'audio':
        return 'bg-gradient-to-r from-emerald-950/90 to-emerald-800/90 border-emerald-500 text-emerald-100';
      case 'text':
        return 'bg-gradient-to-r from-amber-950/90 to-amber-700/90 border-amber-500 text-amber-100';
      case 'caption':
        return 'bg-gradient-to-r from-cyan-950/90 to-cyan-800/90 border-cyan-500 text-cyan-100';
      case 'element':
        return 'bg-gradient-to-r from-pink-950/90 to-pink-800/90 border-pink-500 text-pink-100';
      case 'effect':
        return 'bg-gradient-to-r from-fuchsia-950/90 to-fuchsia-800/90 border-fuchsia-500 text-fuchsia-100';
      default:
        return 'bg-slate-800 border-slate-600 text-white';
    }
  };

  return (
    <>
      <div
        onMouseDown={(e) => handleMouseDown(e, 'move')}
        onContextMenu={handleContextMenu}
        className={`clip-item-element absolute top-1 bottom-1 rounded-lg border flex items-center overflow-hidden cursor-grab active:cursor-grabbing select-none transition-shadow ${getClipColorClasses()} ${
          isSelected ? 'ring-2 ring-white border-white z-20 shadow-lg shadow-indigo-500/20' : 'hover:brightness-110 z-10'
        } ${isDragging ? 'opacity-90 shadow-2xl scale-[1.01]' : ''}`}
        style={{
          left: `${left}px`,
          width: `${width}px`,
        }}
      >
        {/* Left Trim Handle */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'trimStart')}
          className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/40 hover:bg-white/40 cursor-ew-resize flex items-center justify-center z-30"
        >
          <div className="w-0.5 h-3 bg-white/60 rounded" />
        </div>

        {/* Clip Tag Icon & Label / Waveform */}
        <div className="flex-1 px-2.5 min-w-0 overflow-hidden flex items-center gap-1.5">
          <span className="p-0.5 rounded bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0" title={`Type: ${clip.type}`}>
            {getClipIcon()}
          </span>

          {clip.type === 'audio' ? (
            <div className="flex-1 relative h-full flex items-center min-w-0">
              <canvas ref={canvasWaveformRef} width={width} height={40} className="w-full h-full object-cover opacity-80" />
              <span className="absolute left-1 text-[0.625rem] font-bold text-emerald-200 truncate drop-shadow">{clip.name}</span>
            </div>
          ) : (
            <span className="text-[0.6875rem] font-semibold truncate font-sans">{clip.name}</span>
          )}
        </div>

        {/* Transition Badge Indicator */}
        {'transitionIn' in clip && clip.transitionIn && clip.transitionIn !== 'none' && (
          <div
            className="absolute left-10 bottom-0.5 px-1 rounded bg-indigo-500 text-[0.5625rem] font-bold text-white uppercase"
            title={`Transition: ${clip.transitionIn}`}
          >
            Tr
          </div>
        )}

        {/* Right Trim Handle */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'trimEnd')}
          className="absolute right-0 top-0 bottom-0 w-2.5 bg-black/40 hover:bg-white/40 cursor-ew-resize flex items-center justify-center z-30"
        >
          <div className="w-0.5 h-3 bg-white/60 rounded" />
        </div>
      </div>

      {/* Floating Right-Click Context Menu */}
      {contextMenuPos && (
        <ClipContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          clip={clip}
          onClose={() => setContextMenuPos(null)}
        />
      )}
    </>
  );
}
