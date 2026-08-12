import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Maximize2,
  Shield,
  ZoomIn,
} from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';

interface PlayerControlsProps {
  showSafeZone: boolean;
  setShowSafeZone: (val: boolean | ((prev: boolean) => boolean)) => void;
  canvasZoom: number;
  setCanvasZoom: (val: number) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (val: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function PlayerControls({
  showSafeZone,
  setShowSafeZone,
  canvasZoom,
  setCanvasZoom,
  playbackSpeed,
  setPlaybackSpeed,
  containerRef,
}: PlayerControlsProps) {
  const { project, dispatch, getTotalDuration } = useEditor();

  const totalDuration = getTotalDuration();

  const togglePlay = () => {
    if (!project.isPlaying && project.playheadTime >= totalDuration) {
      dispatch({ type: 'SET_PLAYHEAD', payload: 0 });
    }
    dispatch({ type: 'SET_IS_PLAYING', payload: !project.isPlaying });
  };

  const stepFrame = (frames: number) => {
    const delta = frames * (1 / project.canvas.fps);
    dispatch({
      type: 'SET_PLAYHEAD',
      payload: Math.max(0, Math.min(totalDuration, project.playheadTime + delta)),
    });
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="h-12 bg-[var(--color-bg-surface)] border-t border-[var(--color-glass-border)] flex items-center justify-between px-4 z-10 flex-shrink-0">
      {/* Left: Playback buttons & Timecode */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => stepFrame(-1)}
          title="Previous Frame (Left Arrow)"
          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={togglePlay}
          title={project.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          className="w-8 h-8 rounded-full bg-[var(--color-accent-primary)] text-white flex items-center justify-center hover:scale-105 transition-transform shadow-md shadow-indigo-500/20"
        >
          {project.isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <button
          onClick={() => stepFrame(1)}
          title="Next Frame (Right Arrow)"
          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Timecode display (MM:SS:FF) */}
        <div className="text-xs font-mono font-semibold text-[var(--color-text-primary)] ml-2 flex items-center gap-1 bg-[#101625] px-2.5 py-1 rounded-lg border border-[var(--color-glass-border)]">
          <span className="text-indigo-400">{formatTimecode(project.playheadTime, project.canvas.fps)}</span>
          <span className="text-[var(--color-text-muted)]">/</span>
          <span className="text-[var(--color-text-muted)]">{formatTimecode(totalDuration, project.canvas.fps)}</span>
        </div>
      </div>

      {/* Right: Volume, Speed, Zoom, Safe Zone, Fullscreen */}
      <div className="flex items-center gap-3 text-xs">
        {/* Speed Dropdown */}
        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
          className="bg-[#101625] text-slate-200 hover:text-white border border-[var(--color-glass-border)] rounded-lg px-2.5 py-1 cursor-pointer font-mono text-xs"
        >
          <option value={0.25} className="bg-[#0f172a] text-slate-100">0.25x</option>
          <option value={0.5} className="bg-[#0f172a] text-slate-100">0.5x</option>
          <option value={0.75} className="bg-[#0f172a] text-slate-100">0.75x</option>
          <option value={1.0} className="bg-[#0f172a] text-slate-100">1.0x (Normal)</option>
          <option value={1.25} className="bg-[#0f172a] text-slate-100">1.25x</option>
          <option value={1.5} className="bg-[#0f172a] text-slate-100">1.5x</option>
          <option value={2.0} className="bg-[#0f172a] text-slate-100">2.0x</option>
        </select>

        {/* Canvas Zoom */}
        <div className="flex items-center gap-1">
          <ZoomIn className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <select
            value={canvasZoom}
            onChange={(e) => setCanvasZoom(parseFloat(e.target.value))}
            className="bg-[#101625] text-slate-200 hover:text-white border border-[var(--color-glass-border)] rounded-lg px-2.5 py-1 cursor-pointer text-xs"
          >
            <option value={0.5} className="bg-[#0f172a] text-slate-100">50%</option>
            <option value={0.75} className="bg-[#0f172a] text-slate-100">75%</option>
            <option value={1.0} className="bg-[#0f172a] text-slate-100">100% (Fit)</option>
            <option value={1.25} className="bg-[#0f172a] text-slate-100">125%</option>
            <option value={1.5} className="bg-[#0f172a] text-slate-100">150%</option>
          </select>
        </div>

        {/* Safe-area guides toggle */}
        <button
          onClick={() => setShowSafeZone((prev) => !prev)}
          title="Toggle Safe Area Guides"
          className={`p-1.5 rounded-lg border transition-colors ${
            showSafeZone ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10' : 'border-[var(--color-glass-border)] text-[var(--color-text-muted)] hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
        </button>

        {/* Volume & Mute */}
        <button
          onClick={() => dispatch({ type: 'UPDATE_CLIP', payload: { id: '', updates: {} } })}
          className="text-[var(--color-text-muted)] hover:text-white p-1.5 rounded-lg"
          title="Master Volume"
        >
          {project.muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          title="Toggle Fullscreen Preview"
          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function formatTimecode(seconds: number, fps: number = 30): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frame = Math.floor((seconds % 1) * fps);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frame).padStart(2, '0')}`;
}
