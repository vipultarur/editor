import { Type, Sparkles, Plus } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { TextClip, ElementAnimation } from '../../../types/editor';
import { SAMPLE_TEXT_PRESETS } from '../../../utils/sampleAssets';

export default function TextTab() {
  const { project, dispatch } = useEditor();

  const addTextClip = (preset?: typeof SAMPLE_TEXT_PRESETS[0] | { text: string; fontSize: number; fontWeight: string }) => {
    const selectedTrack = project.tracks.find((t) => t.id === project.selectedTrackId);
    const targetTrack = selectedTrack && selectedTrack.type === 'text'
      ? selectedTrack
      : project.tracks.find((t) => t.type === 'text');

    const clipId = 'clip-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    const baseText: TextClip = {
      id: clipId,
      trackId: targetTrack ? targetTrack.id : '',
      type: 'text',
      name: preset ? ('name' in preset ? preset.name : preset.text) : 'Custom Text',
      startTime: project.playheadTime,
      duration: 5,
      trimStart: 0,
      trimEnd: 5,
      layer: 10,
      text: preset ? preset.text : 'Your Text Here',
      fontFamily: preset && 'fontFamily' in preset ? preset.fontFamily : 'Inter',
      fontSize: preset ? preset.fontSize : 48,
      fontWeight: preset ? preset.fontWeight : 'bold',
      fontStyle: 'normal',
      underline: false,
      align: 'center',
      color: preset && 'color' in preset ? preset.color : '#FFFFFF',
      backgroundColor: preset && 'backgroundColor' in preset ? preset.backgroundColor : 'transparent',
      opacity: 1,
      letterSpacing: 1,
      lineHeight: 1.2,
      strokeColor: preset && 'strokeColor' in preset ? preset.strokeColor : '#000000',
      strokeWidth: preset && 'strokeWidth' in preset ? preset.strokeWidth : 2,
      shadowColor: preset && 'shadowColor' in preset ? preset.shadowColor : 'rgba(0,0,0,0.5)',
      shadowBlur: preset && 'shadowBlur' in preset ? preset.shadowBlur : 8,
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      animation: preset && 'animation' in preset ? (preset.animation as ElementAnimation) : { entrance: 'fade', entranceDuration: 0.4 },
    };

    dispatch({ type: 'ADD_CLIP', payload: { clip: baseText, trackId: targetTrack?.id } });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
      <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">Text & Titles</h3>

      {/* Quick Add Buttons */}
      <div className="space-y-2 mb-4">
        <button
          onClick={() => addTextClip({ text: 'ADD A HEADING', fontSize: 64, fontWeight: '900' })}
          className="w-full glass hover:border-[var(--color-accent-primary)]/50 rounded-xl p-3 flex items-center justify-between text-left transition-all"
        >
          <span className="text-base font-black text-white">Add a Heading</span>
          <Plus className="w-4 h-4 text-[var(--color-accent-primary)]" />
        </button>

        <button
          onClick={() => addTextClip({ text: 'Add a Subheading', fontSize: 40, fontWeight: '700' })}
          className="w-full glass hover:border-[var(--color-accent-primary)]/50 rounded-xl p-3 flex items-center justify-between text-left transition-all"
        >
          <span className="text-sm font-bold text-slate-200">Add a Subheading</span>
          <Plus className="w-4 h-4 text-[var(--color-accent-primary)]" />
        </button>

        <button
          onClick={() => addTextClip({ text: 'Add body text...', fontSize: 28, fontWeight: 'normal' })}
          className="w-full glass hover:border-[var(--color-accent-primary)]/50 rounded-xl p-3 flex items-center justify-between text-left transition-all"
        >
          <span className="text-xs font-normal text-slate-400">Add body text</span>
          <Plus className="w-4 h-4 text-[var(--color-accent-primary)]" />
        </button>
      </div>

      {/* Text Presets */}
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <p className="text-xs font-bold text-[var(--color-text-primary)]">Stylized Text Templates</p>
      </div>

      <div className="space-y-2 scrollable-y flex-1 pr-1">
        {SAMPLE_TEXT_PRESETS.map((preset) => (
          <div
            key={preset.name}
            onClick={() => addTextClip(preset)}
            className="glass rounded-xl p-3 cursor-pointer hover:border-amber-500/50 group transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-amber-300">{preset.name}</span>
              <Plus className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div
              className="p-2 rounded bg-black/40 text-center text-xs truncate"
              style={{
                fontFamily: preset.fontFamily,
                color: preset.color,
                backgroundColor: preset.backgroundColor !== 'transparent' ? preset.backgroundColor : 'rgba(0,0,0,0.5)',
                textShadow: `${preset.shadowColor} 0px 0px ${preset.shadowBlur}px`,
              }}
            >
              {preset.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
