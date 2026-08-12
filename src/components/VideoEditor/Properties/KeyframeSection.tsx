import { Bookmark, Plus, Trash2 } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { Keyframe, TimelineClip } from '../../../types/editor';

interface KeyframeSectionProps {
  clip: TimelineClip;
}

export default function KeyframeSection({ clip }: KeyframeSectionProps) {
  const { project, dispatch } = useEditor();

  const keyframes = clip.keyframes || [];

  const addKeyframeAtPlayhead = (property: Keyframe['property']) => {
    const relTime = Math.max(0, project.playheadTime - clip.startTime);
    let val = 0;
    if (property === 'x' && 'x' in clip) val = clip.x;
    else if (property === 'y' && 'y' in clip) val = clip.y;
    else if (property === 'scale' && 'scale' in clip) val = clip.scale;
    else if (property === 'rotation' && 'rotation' in clip) val = clip.rotation;
    else if (property === 'opacity' && 'opacity' in clip) val = clip.opacity;
    else if (property === 'volume' && 'volume' in clip) val = clip.volume;

    dispatch({
      type: 'ADD_KEYFRAME',
      payload: { clipId: clip.id, property, value: val },
    });
  };

  const removeKeyframe = (keyframeId: string) => {
    dispatch({
      type: 'REMOVE_KEYFRAME',
      payload: { clipId: clip.id, keyframeId },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1">
          <Bookmark className="w-3.5 h-3.5 text-cyan-400" /> Keyframe Interpolation
        </span>
        <span className="text-[0.625rem] font-mono text-cyan-400">{keyframes.length} keyframes</span>
      </div>

      <p className="text-[0.6875rem] text-[var(--color-text-muted)]">
        Add keyframes at current timestamp ({(project.playheadTime - clip.startTime).toFixed(2)}s relative to clip start).
      </p>

      {/* Quick Add Keyframe Buttons */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => addKeyframeAtPlayhead('x')}
          className="glass hover:border-cyan-400/50 rounded-lg p-1.5 text-[0.625rem] font-semibold text-cyan-300 flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" /> Position X
        </button>
        <button
          onClick={() => addKeyframeAtPlayhead('y')}
          className="glass hover:border-cyan-400/50 rounded-lg p-1.5 text-[0.625rem] font-semibold text-cyan-300 flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" /> Position Y
        </button>
        <button
          onClick={() => addKeyframeAtPlayhead('scale')}
          className="glass hover:border-cyan-400/50 rounded-lg p-1.5 text-[0.625rem] font-semibold text-cyan-300 flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" /> Scale
        </button>
        <button
          onClick={() => addKeyframeAtPlayhead('rotation')}
          className="glass hover:border-cyan-400/50 rounded-lg p-1.5 text-[0.625rem] font-semibold text-cyan-300 flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" /> Rotation
        </button>
        <button
          onClick={() => addKeyframeAtPlayhead('opacity')}
          className="glass hover:border-cyan-400/50 rounded-lg p-1.5 text-[0.625rem] font-semibold text-cyan-300 flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" /> Opacity
        </button>
        <button
          onClick={() => addKeyframeAtPlayhead('volume')}
          className="glass hover:border-cyan-400/50 rounded-lg p-1.5 text-[0.625rem] font-semibold text-cyan-300 flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" /> Volume
        </button>
      </div>

      {/* Keyframe List */}
      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
        {keyframes.map((kf) => (
          <div
            key={kf.id}
            className="glass rounded-lg p-2 flex items-center justify-between text-xs font-mono text-[var(--color-text-primary)]"
          >
            <div>
              <span className="text-cyan-400 capitalize">{kf.property}</span>
              <span className="text-[var(--color-text-muted)] mx-1 font-sans">=</span>
              <span>{kf.value}</span>
              <span className="text-[0.625rem] text-[var(--color-text-muted)] ml-2">({kf.time.toFixed(2)}s)</span>
            </div>
            <button onClick={() => removeKeyframe(kf.id)} className="text-red-400 hover:bg-red-500/20 p-1 rounded">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
