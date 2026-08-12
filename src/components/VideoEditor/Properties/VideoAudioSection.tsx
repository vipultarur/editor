import { Volume2, VolumeX, Gauge } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { VideoMediaClip, AudioClip } from '../../../types/editor';

interface VideoAudioSectionProps {
  clip: VideoMediaClip | AudioClip;
}

export default function VideoAudioSection({ clip }: VideoAudioSectionProps) {
  const { dispatch } = useEditor();

  const update = (key: string, val: any) => {
    dispatch({
      type: 'UPDATE_CLIP',
      payload: { id: clip.id, updates: { [key]: val } },
    });
  };

  return (
    <div className="space-y-3">
      <span className="text-xs font-bold text-[var(--color-text-primary)] block">Speed & Audio Controls</span>

      {/* Playback Speed (for Video Clips) */}
      {'speed' in clip && (
        <div>
          <div className="flex justify-between text-[0.6875rem] mb-1">
            <span className="text-[var(--color-text-muted)] font-semibold flex items-center gap-1">
              <Gauge className="w-3 h-3 text-indigo-400" /> Playback Speed
            </span>
            <span className="font-mono text-[var(--color-text-primary)]">{(clip.speed || 1.0).toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.25"
            max="2.0"
            step="0.05"
            value={clip.speed || 1.0}
            onChange={(e) => update('speed', parseFloat(e.target.value))}
            className="w-full accent-[var(--color-accent-primary)] cursor-pointer"
          />
        </div>
      )}

      {/* Volume Slider */}
      <div>
        <div className="flex justify-between text-[0.6875rem] mb-1">
          <span className="text-[var(--color-text-muted)] font-semibold flex items-center gap-1">
            {clip.muted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-emerald-400" />} Audio Volume
          </span>
          <span className="font-mono text-[var(--color-text-primary)]">{Math.round((clip.volume ?? 1) * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={clip.volume ?? 1}
          onChange={(e) => update('volume', parseFloat(e.target.value))}
          className="w-full accent-[var(--color-accent-primary)] cursor-pointer"
        />
      </div>

      {/* Fade In & Out */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[0.625rem] text-[var(--color-text-muted)] font-semibold block mb-1">Fade In (sec)</label>
          <input
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={clip.fadeIn || 0}
            onChange={(e) => update('fadeIn', parseFloat(e.target.value) || 0)}
            className="input-field text-xs py-1 w-full font-mono"
          />
        </div>

        <div>
          <label className="text-[0.625rem] text-[var(--color-text-muted)] font-semibold block mb-1">Fade Out (sec)</label>
          <input
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={clip.fadeOut || 0}
            onChange={(e) => update('fadeOut', parseFloat(e.target.value) || 0)}
            className="input-field text-xs py-1 w-full font-mono"
          />
        </div>
      </div>

      <button
        onClick={() => update('muted', !clip.muted)}
        className={`w-full glass p-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
          clip.muted ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'text-[var(--color-text-primary)]'
        }`}
      >
        {clip.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        {clip.muted ? 'Unmute Audio' : 'Mute Audio Track'}
      </button>
    </div>
  );
}
