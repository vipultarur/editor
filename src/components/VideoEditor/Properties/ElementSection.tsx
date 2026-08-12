import { Shapes } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { ElementClip } from '../../../types/editor';

interface ElementSectionProps {
  clip: ElementClip;
}

export default function ElementSection({ clip }: ElementSectionProps) {
  const { dispatch } = useEditor();

  const update = (key: string, val: any) => {
    dispatch({
      type: 'UPDATE_CLIP',
      payload: { id: clip.id, updates: { [key]: val } },
    });
  };

  return (
    <div className="space-y-3">
      <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1">
        <Shapes className="w-3.5 h-3.5 text-indigo-400" /> Shape & Element Style
      </span>

      {/* Fill Color */}
      <div>
        <label className="text-[0.625rem] text-[var(--color-text-muted)] font-semibold block mb-1">Fill Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={clip.fillColor === 'transparent' ? '#6366f1' : clip.fillColor}
            onChange={(e) => update('fillColor', e.target.value)}
            className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={clip.fillColor}
            onChange={(e) => update('fillColor', e.target.value)}
            className="input-field text-xs py-1 flex-1 font-mono"
          />
        </div>
      </div>

      {/* Stroke Color & Width */}
      <div>
        <div className="flex justify-between text-[0.6875rem] mb-1">
          <span className="text-[var(--color-text-muted)] font-semibold">Stroke Outline</span>
          <span className="font-mono text-[var(--color-text-primary)]">{clip.strokeWidth || 0}px</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={clip.strokeColor || '#FFFFFF'}
            onChange={(e) => update('strokeColor', e.target.value)}
            className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
          />
          <input
            type="range"
            min="0"
            max="12"
            value={clip.strokeWidth || 0}
            onChange={(e) => update('strokeWidth', parseInt(e.target.value))}
            className="flex-1 accent-[var(--color-accent-primary)] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
