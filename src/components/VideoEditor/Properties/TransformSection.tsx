import { RotateCcw, FlipHorizontal, FlipVertical } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { VideoMediaClip, ImageClip, TextClip, ElementClip } from '../../../types/editor';

interface TransformSectionProps {
  clip: VideoMediaClip | ImageClip | TextClip | ElementClip;
}

export default function TransformSection({ clip }: TransformSectionProps) {
  const { dispatch } = useEditor();

  const update = (key: string, val: any) => {
    dispatch({
      type: 'UPDATE_CLIP',
      payload: { id: clip.id, updates: { [key]: val } },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[var(--color-text-primary)]">Transform & Position</span>
        <button
          onClick={() =>
            dispatch({
              type: 'UPDATE_CLIP',
              payload: {
                id: clip.id,
                updates: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, flipH: false, flipV: false },
              },
            })
          }
          className="text-[0.6875rem] text-[var(--color-text-muted)] hover:text-white flex items-center gap-1"
          title="Reset transform"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* Position X & Y */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[0.625rem] text-[var(--color-text-muted)] font-semibold block mb-1">Position X</label>
          <input
            type="number"
            value={'x' in clip ? clip.x : 0}
            onChange={(e) => update('x', parseInt(e.target.value) || 0)}
            className="input-field text-xs py-1 w-full font-mono"
          />
        </div>

        <div>
          <label className="text-[0.625rem] text-[var(--color-text-muted)] font-semibold block mb-1">Position Y</label>
          <input
            type="number"
            value={'y' in clip ? clip.y : 0}
            onChange={(e) => update('y', parseInt(e.target.value) || 0)}
            className="input-field text-xs py-1 w-full font-mono"
          />
        </div>
      </div>

      {/* Scale Slider */}
      {'scale' in clip && (
        <div>
          <div className="flex justify-between text-[0.6875rem] mb-1">
            <span className="text-[var(--color-text-muted)] font-semibold">Scale</span>
            <span className="font-mono text-[var(--color-text-primary)]">{Math.round((clip.scale || 1) * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.05"
            value={clip.scale || 1}
            onChange={(e) => update('scale', parseFloat(e.target.value))}
            className="w-full accent-[var(--color-accent-primary)] cursor-pointer"
          />
        </div>
      )}

      {/* Rotation Slider */}
      {'rotation' in clip && (
        <div>
          <div className="flex justify-between text-[0.6875rem] mb-1">
            <span className="text-[var(--color-text-muted)] font-semibold">Rotation</span>
            <span className="font-mono text-[var(--color-text-primary)]">{clip.rotation || 0}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={clip.rotation || 0}
            onChange={(e) => update('rotation', parseInt(e.target.value))}
            className="w-full accent-[var(--color-accent-primary)] cursor-pointer"
          />
        </div>
      )}

      {/* Opacity Slider */}
      <div>
        <div className="flex justify-between text-[0.6875rem] mb-1">
          <span className="text-[var(--color-text-muted)] font-semibold">Opacity</span>
          <span className="font-mono text-[var(--color-text-primary)]">{Math.round((clip.opacity ?? 1) * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={clip.opacity ?? 1}
          onChange={(e) => update('opacity', parseFloat(e.target.value))}
          className="w-full accent-[var(--color-accent-primary)] cursor-pointer"
        />
      </div>

      {/* Flip H & V */}
      {('flipH' in clip || 'flipV' in clip) && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => update('flipH', !('flipH' in clip && clip.flipH))}
            className={`flex-1 glass p-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              'flipH' in clip && clip.flipH ? 'border-[var(--color-accent-primary)] text-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10' : 'text-[var(--color-text-muted)]'
            }`}
          >
            <FlipHorizontal className="w-3.5 h-3.5" /> Flip Horizontal
          </button>

          <button
            onClick={() => update('flipV', !('flipV' in clip && clip.flipV))}
            className={`flex-1 glass p-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              'flipV' in clip && clip.flipV ? 'border-[var(--color-accent-primary)] text-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10' : 'text-[var(--color-text-muted)]'
            }`}
          >
            <FlipVertical className="w-3.5 h-3.5" /> Flip Vertical
          </button>
        </div>
      )}
    </div>
  );
}
