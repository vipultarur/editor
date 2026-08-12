import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sliders, X } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';

interface AudioMixerPanelProps {
  onClose: () => void;
}

export default function AudioMixerPanel({ onClose }: AudioMixerPanelProps) {
  const { project, dispatch } = useEditor();
  const [meterLevels, setMeterLevels] = useState<{ [trackId: string]: number }>({});
  const animFrameRef = useRef<number | null>(null);

  // Simulated Web Audio API VU meter animation loop during playback
  useEffect(() => {
    if (!project.isPlaying) {
      setMeterLevels({});
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const animateMeters = () => {
      const newLevels: { [trackId: string]: number } = {};
      project.tracks.forEach((track) => {
        if (track.muted || track.hidden) {
          newLevels[track.id] = 0;
        } else {
          // Check if any clip on this track is active at current playhead
          const hasActiveClip = track.clips.some(
            (c) => project.playheadTime >= c.startTime && project.playheadTime <= c.startTime + c.duration
          );
          if (hasActiveClip) {
            // Generate realistic volume audio meter bouncing level (0% to 95%)
            const base = Math.random() * 0.4 + 0.45;
            newLevels[track.id] = base * (project.muted ? 0 : project.volume);
          } else {
            newLevels[track.id] = 0;
          }
        }
      });
      setMeterLevels(newLevels);
      animFrameRef.current = requestAnimationFrame(animateMeters);
    };

    animateMeters();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [project.isPlaying, project.playheadTime, project.tracks, project.muted, project.volume]);

  return (
    <div className="bg-[#0b101d] border-b border-[var(--color-glass-border)] p-3 select-none text-xs animate-fade-in z-20">
      <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-200">Audio Track Mixer & VU Meters</span>
        </div>
        <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Audio Track Channels List */}
      <div className="flex gap-4 overflow-x-auto pb-1">
        {project.tracks.map((track) => {
          const level = meterLevels[track.id] || 0;
          const levelPct = Math.round(level * 100);

          return (
            <div
              key={track.id}
              className="w-28 bg-[#131929] border border-slate-800 rounded-xl p-2 flex flex-col items-center gap-2 flex-shrink-0"
            >
              <div className="w-full flex items-center justify-between">
                <span className="font-semibold text-slate-300 truncate max-w-[70px]" title={track.name}>
                  {track.name}
                </span>
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_TRACK_MUTE', payload: track.id })}
                  className={`p-1 rounded ${track.muted ? 'text-red-400 bg-red-500/20' : 'text-slate-400 hover:text-white'}`}
                  title={track.muted ? 'Unmute track' : 'Mute track'}
                >
                  {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </button>
              </div>

              {/* Vertical VU Meter Peak Display */}
              <div className="w-4 h-24 bg-black/60 rounded flex flex-col justify-end p-0.5 relative overflow-hidden border border-slate-800">
                <div
                  className="w-full rounded-sm transition-all duration-75"
                  style={{
                    height: `${levelPct}%`,
                    backgroundColor:
                      levelPct > 80 ? '#ef4444' : levelPct > 60 ? '#f59e0b' : '#10b981',
                  }}
                />
              </div>

              <span className="text-[0.625rem] font-mono font-bold text-slate-400">{levelPct}% VU</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
