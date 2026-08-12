import { Sparkles } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { ElementAnimation, TimelineClip } from '../../../types/editor';

interface AnimationSectionProps {
  clip: TimelineClip;
}

const ENTRANCE_ANIMATIONS: { id: ElementAnimation['entrance']; label: string }[] = [
  { id: undefined, label: 'None' },
  { id: 'fade', label: 'Fade In' },
  { id: 'slide', label: 'Slide In' },
  { id: 'zoom', label: 'Zoom In' },
  { id: 'pop', label: 'Pop' },
  { id: 'typewriter', label: 'Typewriter' },
  { id: 'bounce', label: 'Bounce In' },
];

const LOOP_ANIMATIONS: { id: ElementAnimation['loop']; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'bounce', label: 'Bounce Loop' },
  { id: 'shake', label: 'Shake' },
  { id: 'floating', label: 'Floating' },
];

export default function AnimationSection({ clip }: AnimationSectionProps) {
  const { dispatch } = useEditor();

  const anim = ('animation' in clip && clip.animation) ? clip.animation : {};

  const updateAnim = (key: string, val: any) => {
    dispatch({
      type: 'UPDATE_CLIP',
      payload: {
        id: clip.id,
        updates: {
          animation: { ...anim, [key]: val },
        },
      },
    });
  };

  return (
    <div className="space-y-3">
      <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Animations & Motion
      </span>

      {/* Entrance Animation */}
      <div>
        <label className="text-[0.625rem] text-[var(--color-text-muted)] font-semibold block mb-1">Entrance Animation</label>
        <select
          value={anim.entrance || ''}
          onChange={(e) => updateAnim('entrance', e.target.value || undefined)}
          className="input-field text-xs w-full py-1"
        >
          {ENTRANCE_ANIMATIONS.map((item) => (
            <option key={item.label} value={item.id || ''} className="bg-[#0f172a] text-slate-100">
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {/* Entrance Duration */}
      {anim.entrance && (
        <div>
          <div className="flex justify-between text-[0.6875rem] mb-1">
            <span className="text-[var(--color-text-muted)] font-semibold">Entrance Duration</span>
            <span className="font-mono text-[var(--color-text-primary)]">{(anim.entranceDuration || 0.5).toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={anim.entranceDuration || 0.5}
            onChange={(e) => updateAnim('entranceDuration', parseFloat(e.target.value))}
            className="w-full accent-[var(--color-accent-primary)] cursor-pointer"
          />
        </div>
      )}

      {/* Loop Animation */}
      <div>
        <label className="text-[0.625rem] text-[var(--color-text-muted)] font-semibold block mb-1">Continuous Loop Motion</label>
        <select
          value={anim.loop || 'none'}
          onChange={(e) => updateAnim('loop', e.target.value)}
          className="input-field text-xs w-full py-1"
        >
          {LOOP_ANIMATIONS.map((item) => (
            <option key={item.id} value={item.id} className="bg-[#0f172a] text-slate-100">
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
