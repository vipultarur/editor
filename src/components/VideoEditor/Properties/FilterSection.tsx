import { Sliders, RotateCcw } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import { DEFAULT_FILTER_SETTINGS } from '../../../types/editor';
import type { VideoMediaClip, ImageClip, FilterSettings } from '../../../types/editor';

interface FilterSectionProps {
  clip: VideoMediaClip | ImageClip;
}

export default function FilterSection({ clip }: FilterSectionProps) {
  const { dispatch } = useEditor();

  const filters = clip.filters || { ...DEFAULT_FILTER_SETTINGS };

  const updateFilter = (key: string, val: number) => {
    dispatch({
      type: 'UPDATE_CLIP',
      payload: {
        id: clip.id,
        updates: {
          filters: { ...filters, [key]: val },
        },
      },
    });
  };

  const resetFilters = () => {
    dispatch({
      type: 'UPDATE_CLIP',
      payload: {
        id: clip.id,
        updates: { filters: { ...DEFAULT_FILTER_SETTINGS } },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Manual Color Adjustments
        </span>
        <button
          onClick={resetFilters}
          className="text-[0.6875rem] text-[var(--color-text-muted)] hover:text-white flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* Brightness */}
      <div>
        <div className="flex justify-between text-[0.6875rem] mb-1">
          <span className="text-[var(--color-text-muted)] font-semibold">Brightness</span>
          <span className="font-mono text-[var(--color-text-primary)]">{filters.brightness}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="200"
          value={filters.brightness}
          onChange={(e) => updateFilter('brightness', parseInt(e.target.value))}
          className="w-full accent-[var(--color-accent-primary)] cursor-pointer"
        />
      </div>

      {/* Contrast */}
      <div>
        <div className="flex justify-between text-[0.6875rem] mb-1">
          <span className="text-[var(--color-text-muted)] font-semibold">Contrast</span>
          <span className="font-mono text-[var(--color-text-primary)]">{filters.contrast}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="200"
          value={filters.contrast}
          onChange={(e) => updateFilter('contrast', parseInt(e.target.value))}
          className="w-full accent-[var(--color-accent-primary)] cursor-pointer"
        />
      </div>

      {/* Saturation */}
      <div>
        <div className="flex justify-between text-[0.6875rem] mb-1">
          <span className="text-[var(--color-text-muted)] font-semibold">Saturation</span>
          <span className="font-mono text-[var(--color-text-primary)]">{filters.saturation}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="200"
          value={filters.saturation}
          onChange={(e) => updateFilter('saturation', parseInt(e.target.value))}
          className="w-full accent-[var(--color-accent-primary)] cursor-pointer"
        />
      </div>

      {/* Blur */}
      <div>
        <div className="flex justify-between text-[0.6875rem] mb-1">
          <span className="text-[var(--color-text-muted)] font-semibold">Blur</span>
          <span className="font-mono text-[var(--color-text-primary)]">{filters.blur}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="20"
          value={filters.blur}
          onChange={(e) => updateFilter('blur', parseInt(e.target.value))}
          className="w-full accent-[var(--color-accent-primary)] cursor-pointer"
        />
      </div>
    </div>
  );
}
