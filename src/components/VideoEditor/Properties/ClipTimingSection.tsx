import { Clock } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';

interface ClipTimingSectionProps {
  clip: any;
}

export default function ClipTimingSection({ clip }: ClipTimingSectionProps) {
  const { dispatch } = useEditor();

  const handleDurationChange = (newDuration: number) => {
    const validDur = Math.max(0.2, newDuration);
    dispatch({
      type: 'UPDATE_CLIP',
      payload: {
        id: clip.id,
        updates: {
          duration: validDur,
          trimEnd: (clip.trimStart || 0) + validDur,
        },
      },
    });
  };

  const handleStartTimeChange = (newStart: number) => {
    const validStart = Math.max(0, newStart);
    dispatch({
      type: 'UPDATE_CLIP',
      payload: {
        id: clip.id,
        updates: { startTime: validStart },
      },
    });
  };

  return (
    <div className="space-y-3 glass p-3 rounded-xl border border-[var(--color-glass-border)] bg-black/20">
      <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-indigo-400" /> Clip Duration & Timing
      </span>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[0.625rem] text-[var(--color-text-muted)] font-semibold block mb-1">
            Duration (seconds)
          </label>
          <input
            type="number"
            min="0.2"
            max="600"
            step="0.5"
            value={parseFloat((clip.duration || 5).toFixed(2))}
            onChange={(e) => handleDurationChange(parseFloat(e.target.value) || 0.2)}
            className="input-field text-xs py-1 w-full font-mono font-bold text-indigo-300"
          />
        </div>

        <div>
          <label className="text-[0.625rem] text-[var(--color-text-muted)] font-semibold block mb-1">
            Start Time (seconds)
          </label>
          <input
            type="number"
            min="0"
            max="600"
            step="0.5"
            value={parseFloat((clip.startTime || 0).toFixed(2))}
            onChange={(e) => handleStartTimeChange(parseFloat(e.target.value) || 0)}
            className="input-field text-xs py-1 w-full font-mono font-bold text-indigo-300"
          />
        </div>
      </div>
    </div>
  );
}
