import { Sliders, Check } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { FilterSettings, VideoMediaClip, ImageClip } from '../../../types/editor';

const FILTER_PRESETS: { id: string; name: string; settings: FilterSettings }[] = [
  {
    id: 'normal',
    name: 'Normal',
    settings: { preset: 'normal', brightness: 100, contrast: 100, saturation: 100, exposure: 0, temperature: 0, tint: 0, blur: 0, opacity: 100 },
  },
  {
    id: 'cinematic',
    name: '🎬 Cinematic',
    settings: { preset: 'cinematic', brightness: 95, contrast: 125, saturation: 110, exposure: -5, temperature: -15, tint: 10, blur: 0, opacity: 100 },
  },
  {
    id: 'vintage',
    name: '📻 Vintage',
    settings: { preset: 'vintage', brightness: 105, contrast: 90, saturation: 75, exposure: 5, temperature: 25, tint: -10, blur: 0, opacity: 100 },
  },
  {
    id: 'warm',
    name: '☀️ Warm Summer',
    settings: { preset: 'warm', brightness: 110, contrast: 105, saturation: 120, exposure: 5, temperature: 35, tint: 5, blur: 0, opacity: 100 },
  },
  {
    id: 'cool',
    name: '❄️ Cool Ice',
    settings: { preset: 'cool', brightness: 100, contrast: 110, saturation: 95, exposure: 0, temperature: -40, tint: -10, blur: 0, opacity: 100 },
  },
  {
    id: 'bw',
    name: '🖤 Black & White',
    settings: { preset: 'bw', brightness: 100, contrast: 130, saturation: 0, exposure: 0, temperature: 0, tint: 0, blur: 0, opacity: 100 },
  },
  {
    id: 'sepia',
    name: '📜 Sepia Nostalgia',
    settings: { preset: 'sepia', brightness: 105, contrast: 95, saturation: 50, exposure: 0, temperature: 40, tint: 20, blur: 0, opacity: 100 },
  },
  {
    id: 'dramatic',
    name: '⚡ Dramatic',
    settings: { preset: 'dramatic', brightness: 90, contrast: 150, saturation: 130, exposure: -10, temperature: 0, tint: 0, blur: 0, opacity: 100 },
  },
  {
    id: 'vibrant',
    name: '🌈 Vibrant Pop',
    settings: { preset: 'vibrant', brightness: 110, contrast: 115, saturation: 160, exposure: 10, temperature: 10, tint: 0, blur: 0, opacity: 100 },
  },
];

export default function FiltersTab() {
  const { project, dispatch } = useEditor();

  let selectedClip: VideoMediaClip | ImageClip | null = null;
  if (project.selectedClipId) {
    for (const track of project.tracks) {
      const c = track.clips.find((clip) => clip.id === project.selectedClipId);
      if (c && (c.type === 'video' || c.type === 'image')) {
        selectedClip = c as VideoMediaClip | ImageClip;
        break;
      }
    }
  }

  const applyFilter = (settings: FilterSettings) => {
    if (selectedClip) {
      dispatch({
        type: 'UPDATE_CLIP',
        payload: {
          id: selectedClip.id,
          updates: { filters: { ...settings } },
        },
      });
    } else {
      // Apply filter to all video/image clips if none selected
      project.tracks.forEach((track) => {
        track.clips.forEach((clip) => {
          if (clip.type === 'video' || clip.type === 'image') {
            dispatch({
              type: 'UPDATE_CLIP',
              payload: { id: clip.id, updates: { filters: { ...settings } } },
            });
          }
        });
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
      <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">Color Filters</h3>
      <p className="text-[0.6875rem] text-[var(--color-text-muted)] mb-3">
        {selectedClip ? `Applying to: ${selectedClip.name}` : 'Select a clip to apply, or click to apply to all media clips'}
      </p>

      <div className="space-y-2 scrollable-y flex-1 pr-1">
        {FILTER_PRESETS.map((preset) => {
          const isCurrent = selectedClip?.filters.preset === preset.id;
          return (
            <div
              key={preset.id}
              onClick={() => applyFilter(preset.settings)}
              className={`glass rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-[var(--color-accent-primary)]/50 transition-all ${
                isCurrent ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center font-bold text-xs"
                  style={{
                    background: preset.id === 'bw' ? '#333' : preset.id === 'sepia' ? '#78350f' : preset.id === 'warm' ? '#f97316' : '#6366f1',
                  }}
                >
                  Fx
                </div>
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">{preset.name}</span>
              </div>
              {isCurrent && <Check className="w-4 h-4 text-[var(--color-accent-primary)]" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
