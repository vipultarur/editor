import { useState, useRef, type MouseEvent } from 'react';
import { useEditor } from '../../../state/EditorContext';
import TimelineHeader from './TimelineHeader';
import TimeRuler from './TimeRuler';
import TrackRow from './TrackRow';
import AudioMixerPanel from './AudioMixerPanel';
import { formatTimecode } from '../Preview/PlayerControls';

export default function MultiTrackTimeline() {
  const { project, dispatch, getTotalDuration } = useEditor();
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const [showAudioMixer, setShowAudioMixer] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const totalDuration = getTotalDuration();
  const zoom = project.zoomLevel;
  const playheadLeft = project.playheadTime * zoom;
  const timelineWidth = Math.max(1000, totalDuration * zoom + 300);

  const handleStartScrubbing = (e: MouseEvent) => {
    if (e.button !== 0) return;
    if (!timelineScrollRef.current) return;

    // Don't trigger scrub if user clicked a clip item or button directly
    const target = e.target as HTMLElement;
    if (target.closest('.clip-item-element') || target.closest('button')) {
      return;
    }

    const rect = timelineScrollRef.current.getBoundingClientRect();

    const updatePlayhead = (moveEvt: globalThis.MouseEvent) => {
      if (!timelineScrollRef.current) return;
      const scrollLeft = timelineScrollRef.current.scrollLeft;
      const clickX = moveEvt.clientX - rect.left + scrollLeft - 192;
      const newTime = Math.max(0, Math.min(totalDuration, clickX / zoom));
      dispatch({ type: 'SET_PLAYHEAD', payload: newTime });
    };

    updatePlayhead(e.nativeEvent);
    setIsScrubbing(true);

    const handleMouseMove = (moveEvt: globalThis.MouseEvent) => {
      updatePlayhead(moveEvt);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="h-64 bg-[#0c101c] border-t border-[var(--color-glass-border)] flex flex-col flex-shrink-0 z-10 relative select-none">
      {/* Timeline Action Header */}
      <TimelineHeader showAudioMixer={showAudioMixer} setShowAudioMixer={setShowAudioMixer} />

      {/* Expandable Audio Track Mixer Panel */}
      {showAudioMixer && <AudioMixerPanel onClose={() => setShowAudioMixer(false)} />}

      {/* Scrollable Tracks Area */}
      <div
        ref={timelineScrollRef}
        onMouseDown={handleStartScrubbing}
        className="flex-1 overflow-x-auto overflow-y-auto relative select-none"
      >
        <div className="relative min-w-full" style={{ width: `${timelineWidth}px` }}>
          {/* Time Ruler */}
          <div className="flex">
            <div className="w-48 bg-[var(--color-bg-surface)] border-r border-b border-[var(--color-glass-border)] flex-shrink-0 flex items-center px-3 text-[0.6875rem] font-bold text-[var(--color-text-muted)]">
              Tracks
            </div>
            <TimeRuler totalDuration={totalDuration} />
          </div>

          {/* Track Rows */}
          {project.tracks.map((track) => (
            <TrackRow key={track.id} track={track} totalDuration={totalDuration} />
          ))}

          {/* Red Timeline Playhead Line & Interactive Indicator */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              handleStartScrubbing(e);
            }}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] z-30 pointer-events-auto cursor-col-resize group"
            style={{ left: `${192 + playheadLeft}px` }}
          >
            {/* Playhead Top Header Badge & Marker */}
            <div
              className={`absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto transition-transform ${
                isScrubbing ? 'scale-110' : 'group-hover:scale-105'
              }`}
            >
              {/* Floating Timecode Pill Badge */}
              <div className="bg-red-600 text-white text-[0.5625rem] font-mono font-bold px-1.5 py-0.5 rounded shadow-lg tracking-tight whitespace-nowrap mb-0.5 border border-red-400/50">
                {formatTimecode(project.playheadTime, project.canvas.fps)}
              </div>

              {/* Downward Pointer Triangle */}
              <div className="w-3.5 h-3 bg-red-500 clip-path-triangle shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing">
                <div className="w-1 h-1 bg-white rounded-full mb-0.5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
