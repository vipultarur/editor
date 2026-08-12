import { Sparkles, Plus } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { EffectClip } from '../../../types/editor';

const EFFECTS_LIST: { type: EffectClip['effectType']; name: string; desc: string; icon: string }[] = [
  { type: 'blur', name: 'Gaussian Blur', desc: 'Soft Gaussian background blur effect', icon: '🌫️' },
  { type: 'vignette', name: 'Cinematic Vignette', desc: 'Darkened border focus vignette', icon: '🎬' },
  { type: 'grain', name: 'Film Grain', desc: 'Classic 35mm film noise grain', icon: '🍿' },
  { type: 'glitch', name: 'Digital Glitch', desc: 'Cyberpunk glitch distortion', icon: '⚡' },
  { type: 'pixelate', name: '8-Bit Pixelate', desc: 'Retro pixelated video effect', icon: '👾' },
  { type: 'rgbsplit', name: 'RGB Split', desc: 'Chromatic aberration color shift', icon: '🌈' },
  { type: 'vhs', name: 'VHS Tape', desc: 'Retro 90s analog VHS distortion', icon: '📼' },
];

export default function EffectsTab() {
  const { project, dispatch } = useEditor();

  const addEffectToTimeline = (effectType: EffectClip['effectType'], name: string) => {
    const targetTrack = project.tracks.find((t) => t.type === 'effect') || project.tracks[0];
    const clipId = 'clip-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    const effectClip: EffectClip = {
      id: clipId,
      trackId: targetTrack.id,
      type: 'effect',
      name: `Effect: ${name}`,
      startTime: project.playheadTime,
      duration: 5,
      trimStart: 0,
      trimEnd: 5,
      layer: 15,
      effectType,
      intensity: 50,
    };

    dispatch({ type: 'ADD_CLIP', payload: { clip: effectClip, trackId: targetTrack.id } });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
      <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">Visual Effects</h3>
      <p className="text-[0.6875rem] text-[var(--color-text-muted)] mb-3">Add overlay effect clips to the timeline</p>

      <div className="space-y-2 scrollable-y flex-1 pr-1">
        {EFFECTS_LIST.map((effect) => (
          <div
            key={effect.type}
            onClick={() => addEffectToTimeline(effect.type, effect.name)}
            className="glass rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-purple-500/50 group transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{effect.icon}</span>
              <div>
                <p className="text-xs font-semibold text-[var(--color-text-primary)]">{effect.name}</p>
                <p className="text-[0.625rem] text-[var(--color-text-muted)]">{effect.desc}</p>
              </div>
            </div>
            <button className="p-1.5 rounded-lg bg-[var(--color-accent-primary)] text-white group-hover:scale-110 transition-transform">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
