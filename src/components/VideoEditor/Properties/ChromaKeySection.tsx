import { Eye, Wand2 } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { VideoMediaClip, ImageClip } from '../../../types/editor';

interface ChromaKeySectionProps {
  clip: VideoMediaClip | ImageClip;
}

export default function ChromaKeySection({ clip }: ChromaKeySectionProps) {
  const { dispatch } = useEditor();

  const chromaKey = clip.chromaKey || {
    enabled: false,
    color: '#00ff00',
    tolerance: 40,
    smoothness: 20,
  };

  const updateChromaKey = (updates: Partial<typeof chromaKey>) => {
    dispatch({
      type: 'UPDATE_CLIP',
      payload: {
        id: clip.id,
        updates: {
          chromaKey: { ...chromaKey, ...updates },
        },
      },
    });
  };

  return (
    <div className="space-y-3 pt-3 border-t border-[var(--color-glass-border)] text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-slate-200">
          <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Chroma Key (Green Screen)</span>
        </div>

        {/* Enable Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={chromaKey.enabled}
            onChange={(e) => updateChromaKey({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500" />
        </label>
      </div>

      {chromaKey.enabled && (
        <div className="space-y-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 animate-fade-in">
          {/* Target Key Color */}
          <div className="flex items-center justify-between">
            <span className="text-[0.6875rem] font-semibold text-slate-300">Key Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={chromaKey.color}
                onChange={(e) => updateChromaKey({ color: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <span className="font-mono text-[0.625rem] text-slate-400 uppercase">{chromaKey.color}</span>
            </div>
          </div>

          {/* Quick Color Presets */}
          <div className="flex gap-1">
            <button
              onClick={() => updateChromaKey({ color: '#00ff00' })}
              className={`flex-1 py-1 rounded text-[0.625rem] font-bold border ${
                chromaKey.color.toLowerCase() === '#00ff00'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              🟢 Green
            </button>
            <button
              onClick={() => updateChromaKey({ color: '#0000ff' })}
              className={`flex-1 py-1 rounded text-[0.625rem] font-bold border ${
                chromaKey.color.toLowerCase() === '#0000ff'
                  ? 'border-blue-400 bg-blue-500/20 text-blue-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              🔵 Blue
            </button>
            <button
              onClick={() => updateChromaKey({ color: '#ff0000' })}
              className={`flex-1 py-1 rounded text-[0.625rem] font-bold border ${
                chromaKey.color.toLowerCase() === '#ff0000'
                  ? 'border-red-400 bg-red-500/20 text-red-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              🔴 Red
            </button>
          </div>

          {/* Color Tolerance Slider */}
          <div>
            <div className="flex items-center justify-between text-[0.625rem] text-slate-400 mb-1">
              <span>Tolerance</span>
              <span className="font-mono font-bold text-emerald-400">{chromaKey.tolerance}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={chromaKey.tolerance}
              onChange={(e) => updateChromaKey({ tolerance: parseInt(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Edge Smoothness Slider */}
          <div>
            <div className="flex items-center justify-between text-[0.625rem] text-slate-400 mb-1">
              <span>Edge Smoothness</span>
              <span className="font-mono font-bold text-emerald-400">{chromaKey.smoothness}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={chromaKey.smoothness}
              onChange={(e) => updateChromaKey({ smoothness: parseInt(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
