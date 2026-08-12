import { useState, useMemo } from 'react';
import { Lock, Unlock, Eye, EyeOff, Volume2, VolumeX, Trash2, Plus, Wand2, Check } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { Track, TransitionType, VideoMediaClip } from '../../../types/editor';
import ClipItem from './ClipItem';

interface TrackRowProps {
  track: Track;
  totalDuration: number;
}

const QUICK_TRANSITIONS: Array<{ type: TransitionType; name: string; icon: string }> = [
  { type: 'fade', name: 'Fade In / Out', icon: '🌗' },
  { type: 'crossdissolve', name: 'Cross Dissolve', icon: '🌫️' },
  { type: 'diptoblack', name: 'Dip Black', icon: '⬛' },
  { type: 'diptowhite', name: 'Dip White', icon: '⬜' },
  { type: 'slideleft', name: 'Slide Left', icon: '⬅️' },
  { type: 'slideright', name: 'Slide Right', icon: '➡️' },
  { type: 'zoom', name: 'Zoom In', icon: '🔍' },
  { type: 'wipe', name: 'Wipe', icon: '🧹' },
  { type: 'none', name: 'None (Remove)', icon: '🚫' },
];

export default function TrackRow({ track, totalDuration }: TrackRowProps) {
  const { project, dispatch, setActiveSidebarTab } = useEditor();
  const [activeTransitionCutId, setActiveTransitionCutId] = useState<string | null>(null);

  const zoom = project.zoomLevel;
  const trackWidth = Math.max(1000, totalDuration * zoom + 300);

  // Identify adjacent cut boundaries between split clips for rendering + Transition Buttons
  const transitionBoundaries = useMemo(() => {
    if (track.type !== 'video' && track.type !== 'image') return [];

    const sorted = [...track.clips].sort((a, b) => a.startTime - b.startTime);
    const boundaries: Array<{ clipId: string; cutX: number; currentTransition?: TransitionType }> = [];

    for (let i = 1; i < sorted.length; i++) {
      const prevClip = sorted[i - 1];
      const nextClip = sorted[i];
      const prevEnd = prevClip.startTime + prevClip.duration;

      // If clips are adjacent (gap < 0.4 seconds)
      if (Math.abs(nextClip.startTime - prevEnd) < 0.4) {
        const cutX = nextClip.startTime * zoom;
        const currentTransition = 'transitionIn' in nextClip ? (nextClip as VideoMediaClip).transitionIn : undefined;
        boundaries.push({
          clipId: nextClip.id,
          cutX,
          currentTransition,
        });
      }
    }

    return boundaries;
  }, [track.clips, track.type, zoom]);

  const handleApplyTransition = (clipId: string, transitionType: TransitionType) => {
    dispatch({
      type: 'UPDATE_CLIP',
      payload: {
        id: clipId,
        updates: {
          transitionIn: transitionType,
          transitionInDuration: 0.6,
        },
      },
    });
    dispatch({ type: 'SET_SELECTED_CLIP', payload: clipId });
    setActiveTransitionCutId(null);
  };

  const isSelectedTrack = project.selectedTrackId === track.id;

  const getTrackBadge = () => {
    switch (track.type) {
      case 'video':
        return <span className="px-1.5 py-0.5 rounded text-[0.5625rem] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider flex items-center gap-1">🎥 Video</span>;
      case 'audio':
        return <span className="px-1.5 py-0.5 rounded text-[0.5625rem] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">🎵 Audio</span>;
      case 'image':
        return <span className="px-1.5 py-0.5 rounded text-[0.5625rem] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider flex items-center gap-1">🖼️ Image</span>;
      case 'text':
        return <span className="px-1.5 py-0.5 rounded text-[0.5625rem] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider flex items-center gap-1">🔤 Text</span>;
      case 'caption':
        return <span className="px-1.5 py-0.5 rounded text-[0.5625rem] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider flex items-center gap-1">💬 Caption</span>;
      case 'element':
        return <span className="px-1.5 py-0.5 rounded text-[0.5625rem] font-extrabold bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase tracking-wider flex items-center gap-1">✨ Element</span>;
      case 'effect':
        return <span className="px-1.5 py-0.5 rounded text-[0.5625rem] font-extrabold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 uppercase tracking-wider flex items-center gap-1">🪄 Effect</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[0.5625rem] font-mono text-[var(--color-text-muted)] uppercase">{track.type}</span>;
    }
  };

  return (
    <div
      data-track-id={track.id}
      className={`flex border-b border-[var(--color-glass-border)] h-12 flex-shrink-0 group transition-colors ${
        isSelectedTrack ? 'bg-indigo-500/10' : ''
      }`}
    >
      {/* Track Header Controls */}
      <div
        onClick={() => dispatch({ type: 'SET_SELECTED_TRACK', payload: track.id })}
        className={`w-48 bg-[var(--color-bg-surface)] border-r border-[var(--color-glass-border)] flex items-center justify-between px-3 flex-shrink-0 z-10 cursor-pointer ${
          isSelectedTrack ? 'border-l-4 border-l-indigo-500 bg-indigo-950/30' : ''
        }`}
      >
        <div className="min-w-0 pr-1 flex flex-col gap-0.5">
          <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{track.name}</p>
          <div className="flex items-center">{getTrackBadge()}</div>
        </div>

        <div className="flex items-center gap-1">
          {/* Lock */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_TRACK_LOCK', payload: track.id })}
            title={track.locked ? 'Unlock track' : 'Lock track'}
            className={`p-1 rounded text-[var(--color-text-muted)] hover:text-white ${track.locked ? 'text-amber-400' : ''}`}
          >
            {track.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          {/* Hide */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_TRACK_HIDE', payload: track.id })}
            title={track.hidden ? 'Show track' : 'Hide track'}
            className={`p-1 rounded text-[var(--color-text-muted)] hover:text-white ${track.hidden ? 'text-red-400' : ''}`}
          >
            {track.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          {/* Mute (Audio/Video tracks) */}
          {(track.type === 'audio' || track.type === 'video') && (
            <button
              onClick={() => dispatch({ type: 'TOGGLE_TRACK_MUTE', payload: track.id })}
              title={track.muted ? 'Unmute track' : 'Mute track'}
              className={`p-1 rounded text-[var(--color-text-muted)] hover:text-white ${track.muted ? 'text-red-400' : ''}`}
            >
              {track.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Delete Track */}
          {project.tracks.length > 1 && (
            <button
              onClick={() => dispatch({ type: 'REMOVE_TRACK', payload: track.id })}
              title="Delete Track"
              className="p-1 rounded text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Track Clip Content Area */}
      <div
        className={`relative flex-1 bg-black/20 overflow-visible ${track.hidden ? 'opacity-40 pointer-events-none' : ''}`}
        style={{ width: `${trackWidth}px` }}
      >
        {/* Render Clips */}
        {track.clips.map((clip) => (
          <ClipItem key={clip.id} clip={clip} trackId={track.id} zoom={zoom} />
        ))}

        {/* Render '+' Transition Buttons at Split Boundaries */}
        {transitionBoundaries.map(({ clipId, cutX, currentTransition }) => {
          const isPopoverOpen = activeTransitionCutId === clipId;
          const hasTransition = currentTransition && currentTransition !== 'none';

          return (
            <div key={`trans-${clipId}`} className="absolute z-40 top-1/2 -translate-y-1/2" style={{ left: `${cutX}px` }}>
              {/* '+' Transition Trigger Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTransitionCutId(isPopoverOpen ? null : clipId);
                  dispatch({ type: 'SET_SELECTED_CLIP', payload: clipId });
                  setActiveSidebarTab('transitions');
                }}
                className={`
                  w-6 h-6 -ml-3 rounded-full flex items-center justify-center font-bold text-xs shadow-xl
                  transition-all duration-200 cursor-pointer border hover:scale-125
                  ${
                    hasTransition
                      ? 'bg-gradient-to-r from-indigo-500 to-pink-500 text-white border-white ring-2 ring-indigo-500/50'
                      : 'bg-[#1e1b4b] text-indigo-300 border-indigo-400/60 hover:bg-indigo-600 hover:text-white'
                  }
                `}
                title={hasTransition ? `Transition applied: ${currentTransition}. Click to edit.` : 'Click to add transition between split clips'}
              >
                {hasTransition ? <Wand2 className="w-3 h-3 text-white" /> : <Plus className="w-3.5 h-3.5" />}
              </button>

              {/* Inline Transition Selector Popover */}
              {isPopoverOpen && (
                <div
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#0f172a] border border-indigo-500/40 rounded-xl p-2 shadow-2xl z-50 w-52 animate-fade-in text-xs space-y-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-1.5 py-1 border-b border-slate-700/60 mb-1">
                    <span className="font-bold text-indigo-300 flex items-center gap-1">
                      <Wand2 className="w-3 h-3" /> Select Transition
                    </span>
                    <button
                      onClick={() => setActiveTransitionCutId(null)}
                      className="text-slate-400 hover:text-white text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1 max-h-44 overflow-y-auto pr-0.5">
                    {QUICK_TRANSITIONS.map((tr) => (
                      <button
                        key={tr.type}
                        onClick={() => handleApplyTransition(clipId, tr.type)}
                        className={`
                          flex items-center gap-1.5 p-1.5 rounded-lg border text-left cursor-pointer transition-all text-[0.6875rem]
                          ${
                            currentTransition === tr.type
                              ? 'border-indigo-500 bg-indigo-500/20 text-white font-bold'
                              : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-600 hover:text-white'
                          }
                        `}
                      >
                        <span className="text-sm">{tr.icon}</span>
                        <span className="truncate">{tr.name}</span>
                        {currentTransition === tr.type && <Check className="w-3 h-3 text-indigo-400 ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
