import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { TextClip, CaptionClip } from '../../../types/editor';

interface TextSectionProps {
  clip: TextClip | CaptionClip;
}

const FONTS = ['Inter', 'Roboto', 'Impact', 'System-UI', 'Georgia', 'Courier New'];

export default function TextSection({ clip }: TextSectionProps) {
  const { dispatch } = useEditor();

  const update = (key: string, val: any) => {
    dispatch({
      type: 'UPDATE_CLIP',
      payload: { id: clip.id, updates: { [key]: val } },
    });
  };

  return (
    <div className="space-y-3">
      <span className="text-xs font-bold text-[var(--color-text-primary)] block">Text Properties</span>

      {/* Text String Content */}
      <div>
        <label className="text-[0.625rem] text-[var(--color-text-muted)] font-semibold block mb-1">Text Content</label>
        <textarea
          rows={2}
          value={clip.text}
          onChange={(e) => update('text', e.target.value)}
          className="input-field text-xs w-full resize-none font-medium"
        />
      </div>

      {/* Font Family & Size */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[0.625rem] text-[var(--color-text-muted)] font-semibold block mb-1">Font Family</label>
          <select
            value={clip.fontFamily}
            onChange={(e) => update('fontFamily', e.target.value)}
            className="input-field text-xs w-full py-1"
          >
            {FONTS.map((f) => (
              <option key={f} value={f} className="bg-[#0f172a] text-slate-100">
                {f}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[0.625rem] text-[var(--color-text-muted)] font-semibold block mb-1">Font Size (px)</label>
          <input
            type="number"
            min="12"
            max="200"
            value={clip.fontSize}
            onChange={(e) => update('fontSize', parseInt(e.target.value) || 24)}
            className="input-field text-xs w-full py-1 font-mono"
          />
        </div>
      </div>

      {/* Formatting & Alignment Toolbar */}
      <div className="flex items-center justify-between glass p-1.5 rounded-lg">
        <div className="flex items-center gap-1">
          <button
            onClick={() => update('align', 'left')}
            className={`p-1.5 rounded ${clip.align === 'left' ? 'bg-[var(--color-accent-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => update('align', 'center')}
            className={`p-1.5 rounded ${clip.align === 'center' ? 'bg-[var(--color-accent-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => update('align', 'right')}
            className={`p-1.5 rounded ${clip.align === 'right' ? 'bg-[var(--color-accent-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {'fontWeight' in clip && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => update('fontWeight', clip.fontWeight === 'bold' ? 'normal' : 'bold')}
              className={`p-1.5 rounded ${clip.fontWeight === 'bold' || clip.fontWeight === '900' ? 'bg-[var(--color-accent-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => update('fontStyle', clip.fontStyle === 'italic' ? 'normal' : 'italic')}
              className={`p-1.5 rounded ${clip.fontStyle === 'italic' ? 'bg-[var(--color-accent-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[0.625rem] text-[var(--color-text-muted)] font-semibold block mb-1">Text Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={clip.color}
              onChange={(e) => update('color', e.target.value)}
              className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={clip.color}
              onChange={(e) => update('color', e.target.value)}
              className="input-field text-xs py-1 flex-1 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-[0.625rem] text-[var(--color-text-muted)] font-semibold block mb-1">Background Box</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={clip.backgroundColor === 'transparent' ? '#000000' : clip.backgroundColor}
              onChange={(e) => update('backgroundColor', e.target.value)}
              className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
            />
            <button
              onClick={() => update('backgroundColor', clip.backgroundColor === 'transparent' ? 'rgba(0,0,0,0.7)' : 'transparent')}
              className="text-[0.625rem] text-indigo-400 hover:underline"
            >
              {clip.backgroundColor === 'transparent' ? '+ Add Box' : 'Clear Box'}
            </button>
          </div>
        </div>
      </div>

      {/* Text Stroke */}
      {'strokeWidth' in clip && (
        <div>
          <div className="flex justify-between text-[0.6875rem] mb-1">
            <span className="text-[var(--color-text-muted)] font-semibold">Text Outline / Stroke</span>
            <span className="font-mono text-[var(--color-text-primary)]">{clip.strokeWidth}px</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={clip.strokeColor || '#000000'}
              onChange={(e) => update('strokeColor', e.target.value)}
              className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
            />
            <input
              type="range"
              min="0"
              max="10"
              value={clip.strokeWidth || 0}
              onChange={(e) => update('strokeWidth', parseInt(e.target.value))}
              className="flex-1 accent-[var(--color-accent-primary)] cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
