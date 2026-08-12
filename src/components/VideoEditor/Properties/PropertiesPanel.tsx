import { Trash2, Copy, Layers, ArrowUp, ArrowDown } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { VideoMediaClip, ImageClip, AudioClip, TextClip, CaptionClip, ElementClip, EffectClip } from '../../../types/editor';
import TransformSection from './TransformSection';
import VideoAudioSection from './VideoAudioSection';
import FilterSection from './FilterSection';
import ChromaKeySection from './ChromaKeySection';
import TextSection from './TextSection';
import AnimationSection from './AnimationSection';
import KeyframeSection from './KeyframeSection';
import ElementSection from './ElementSection';
import ClipTimingSection from './ClipTimingSection';

export default function PropertiesPanel() {
  const { project, dispatch } = useEditor();

  let selectedClip: any = null;
  if (project.selectedClipId) {
    for (const track of project.tracks) {
      const found = track.clips.find((c) => c.id === project.selectedClipId);
      if (found) {
        selectedClip = found;
        break;
      }
    }
  }

  if (!selectedClip) {
    return (
      <div className="w-72 bg-[var(--color-bg-surface)] border-l border-[var(--color-glass-border)] flex flex-col items-center justify-center p-6 text-center text-[var(--color-text-muted)] flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 text-[var(--color-text-muted)]">
          <Layers className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold text-[var(--color-text-primary)]">No Element Selected</p>
        <p className="text-[0.6875rem] mt-1 text-[var(--color-text-muted)]">
          Click any clip on the canvas or timeline to customize properties, transform, filters, and animations.
        </p>
      </div>
    );
  }

  const handleLayerOrder = (action: 'front' | 'back' | 'forward' | 'backward') => {
    dispatch({
      type: 'REORDER_CLIP_LAYER',
      payload: { clipId: selectedClip.id, action },
    });
  };

  return (
    <div className="w-72 bg-[var(--color-bg-surface)] border-l border-[var(--color-glass-border)] flex flex-col h-full flex-shrink-0 z-10">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-[var(--color-glass-border)] flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{selectedClip.name}</p>
          <span className="text-[0.625rem] text-[var(--color-accent-primary)] capitalize font-mono font-semibold">
            {selectedClip.type} Clip • {selectedClip.duration.toFixed(1)}s
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => dispatch({ type: 'DUPLICATE_CLIP', payload: selectedClip.id })}
            title="Duplicate Clip (Ctrl+D)"
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => dispatch({ type: 'DELETE_CLIP', payload: selectedClip.id })}
            title="Delete Clip (Delete)"
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Layer Ordering Controls */}
      <div className="px-4 py-2 bg-black/20 border-b border-[var(--color-glass-border)] flex items-center justify-between text-[0.625rem] text-[var(--color-text-muted)]">
        <span className="font-semibold">Layer Order ({selectedClip.layer})</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleLayerOrder('forward')}
            title="Bring Forward"
            className="p-1 rounded glass hover:text-white"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleLayerOrder('backward')}
            title="Send Backward"
            className="p-1 rounded glass hover:text-white"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleLayerOrder('front')}
            title="Bring to Front"
            className="px-1.5 py-0.5 rounded glass font-bold hover:text-white"
          >
            Top
          </button>
          <button
            onClick={() => handleLayerOrder('back')}
            title="Send to Back"
            className="px-1.5 py-0.5 rounded glass font-bold hover:text-white"
          >
            Bottom
          </button>
        </div>
      </div>

      {/* Dynamic Inspector Sections */}
      <div className="flex-1 scrollable-y p-4 space-y-5">
        <ClipTimingSection clip={selectedClip} />

        {(selectedClip.type === 'video' || selectedClip.type === 'image' || selectedClip.type === 'text' || selectedClip.type === 'element') && (
          <TransformSection clip={selectedClip} />
        )}

        {(selectedClip.type === 'video' || selectedClip.type === 'audio') && (
          <VideoAudioSection clip={selectedClip} />
        )}

        {(selectedClip.type === 'video' || selectedClip.type === 'image') && (
          <FilterSection clip={selectedClip} />
        )}

        {(selectedClip.type === 'video' || selectedClip.type === 'image') && (
          <ChromaKeySection clip={selectedClip} />
        )}

        {(selectedClip.type === 'text' || selectedClip.type === 'caption') && (
          <TextSection clip={selectedClip} />
        )}

        {selectedClip.type === 'element' && <ElementSection clip={selectedClip} />}

        <AnimationSection clip={selectedClip} />

        <KeyframeSection clip={selectedClip} />
      </div>
    </div>
  );
}
