import { Palette, Monitor, Smartphone, Square } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { AspectRatio } from '../../../types/editor';

const ASPECT_RATIOS: { ratio: AspectRatio; label: string; desc: string; icon: React.ElementType }[] = [
  { ratio: '16:9', label: '16:9 Widescreen', desc: 'YouTube, TV, Landscape', icon: Monitor },
  { ratio: '9:16', label: '9:16 Vertical', desc: 'TikTok, Shorts, IG Reels', icon: Smartphone },
  { ratio: '1:1', label: '1:1 Square', desc: 'Instagram Feed, Posts', icon: Square },
  { ratio: '4:5', label: '4:5 Portrait', desc: 'Instagram Mobile', icon: Smartphone },
  { ratio: '4:3', label: '4:3 Standard', desc: 'Classic Display', icon: Monitor },
];

const PRESET_COLORS = [
  '#000000',
  '#0f172a',
  '#1e1b4b',
  '#311b92',
  '#042f2e',
  '#3f6212',
  '#7c2d12',
  '#831843',
  '#18181b',
  'transparent',
];

export default function BackgroundTab() {
  const { project, dispatch } = useEditor();

  return (
    <div className="flex-1 flex flex-col h-full scrollable-y p-4">
      <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">Canvas & Background</h3>

      {/* Aspect Ratio Preset Selector */}
      <p className="text-xs font-bold text-[var(--color-text-primary)] mb-2">Canvas Aspect Ratio</p>
      <div className="space-y-2 mb-4">
        {ASPECT_RATIOS.map((item) => {
          const Icon = item.icon;
          const isSelected = project.canvas.aspectRatio === item.ratio;
          return (
            <button
              key={item.ratio}
              onClick={() => dispatch({ type: 'SET_CANVAS_SETTINGS', payload: { aspectRatio: item.ratio } })}
              className={`w-full glass p-2.5 rounded-xl flex items-center justify-between text-left transition-all ${
                isSelected ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isSelected ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-muted)]'}`} />
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text-primary)]">{item.label}</p>
                  <p className="text-[0.625rem] text-[var(--color-text-muted)]">{item.desc}</p>
                </div>
              </div>
              {isSelected && <span className="w-2 h-2 rounded-full bg-[var(--color-accent-primary)]" />}
            </button>
          );
        })}
      </div>

      {/* Canvas Background Color */}
      <p className="text-xs font-bold text-[var(--color-text-primary)] mb-2">Background Color</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => dispatch({ type: 'SET_CANVAS_SETTINGS', payload: { backgroundColor: color } })}
            className={`w-7 h-7 rounded-lg border border-white/20 transition-transform ${
              project.canvas.backgroundColor === color ? 'scale-125 ring-2 ring-[var(--color-accent-primary)]' : 'hover:scale-110'
            }`}
            style={{
              backgroundColor: color === 'transparent' ? '#1e293b' : color,
              backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)' : 'none',
              backgroundSize: '8px 8px',
            }}
            title={color}
          />
        ))}
      </div>

      <div className="glass p-3 rounded-xl">
        <label className="text-xs font-semibold text-[var(--color-text-primary)] block mb-1">Custom Color Code</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={project.canvas.backgroundColor === 'transparent' ? '#000000' : project.canvas.backgroundColor}
            onChange={(e) => dispatch({ type: 'SET_CANVAS_SETTINGS', payload: { backgroundColor: e.target.value } })}
            className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={project.canvas.backgroundColor}
            onChange={(e) => dispatch({ type: 'SET_CANVAS_SETTINGS', payload: { backgroundColor: e.target.value } })}
            className="input-field text-xs flex-1 py-1"
          />
        </div>
      </div>
    </div>
  );
}
