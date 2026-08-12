import { Square, Circle, Minus, ArrowRight, Star, Heart, CheckCircle, AlertTriangle, Sparkles, Plus } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { ElementClip } from '../../../types/editor';

export default function ElementsTab() {
  const { project, dispatch } = useEditor();

  const addShape = (shapeType: ElementClip['shapeType'], name: string) => {
    const targetTrack = project.tracks.find((t) => t.type === 'element') || project.tracks[0];
    const clipId = 'clip-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    const elementClip: ElementClip = {
      id: clipId,
      trackId: targetTrack.id,
      type: 'element',
      name: `Shape: ${name}`,
      startTime: project.playheadTime,
      duration: 5,
      trimStart: 0,
      trimEnd: 5,
      layer: 5,
      elementType: 'shape',
      shapeType,
      fillColor: '#6366f1',
      strokeColor: '#FFFFFF',
      strokeWidth: 2,
      x: 0,
      y: 0,
      width: 250,
      height: 250,
      rotation: 0,
      opacity: 1,
      animation: { entrance: 'pop', entranceDuration: 0.4 },
    };

    dispatch({ type: 'ADD_CLIP', payload: { clip: elementClip, trackId: targetTrack.id } });
  };

  const addEmoji = (emoji: string) => {
    const targetTrack = project.tracks.find((t) => t.type === 'element') || project.tracks[0];
    const clipId = 'clip-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    const elementClip: ElementClip = {
      id: clipId,
      trackId: targetTrack.id,
      type: 'element',
      name: `Emoji ${emoji}`,
      startTime: project.playheadTime,
      duration: 5,
      trimStart: 0,
      trimEnd: 5,
      layer: 12,
      elementType: 'emoji',
      content: emoji,
      fillColor: 'transparent',
      strokeColor: 'transparent',
      strokeWidth: 0,
      x: 0,
      y: 0,
      width: 150,
      height: 150,
      rotation: 0,
      opacity: 1,
      animation: { entrance: 'bounce', entranceDuration: 0.5, loop: 'floating' },
    };

    dispatch({ type: 'ADD_CLIP', payload: { clip: elementClip, trackId: targetTrack.id } });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
      <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">Shapes & Elements</h3>

      {/* Geometry Shapes */}
      <p className="text-xs font-bold text-[var(--color-text-primary)] mb-2">Basic Shapes</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => addShape('rectangle', 'Rectangle')}
          className="glass hover:border-[var(--color-accent-primary)]/50 rounded-xl p-3 flex flex-col items-center justify-center text-xs font-medium gap-1.5 transition-all"
        >
          <Square className="w-5 h-5 text-indigo-400" />
          <span>Rectangle</span>
        </button>

        <button
          onClick={() => addShape('circle', 'Circle')}
          className="glass hover:border-[var(--color-accent-primary)]/50 rounded-xl p-3 flex flex-col items-center justify-center text-xs font-medium gap-1.5 transition-all"
        >
          <Circle className="w-5 h-5 text-pink-400" />
          <span>Circle</span>
        </button>

        <button
          onClick={() => addShape('rounded-rectangle', 'Rounded Box')}
          className="glass hover:border-[var(--color-accent-primary)]/50 rounded-xl p-3 flex flex-col items-center justify-center text-xs font-medium gap-1.5 transition-all"
        >
          <div className="w-5 h-5 rounded-md border-2 border-emerald-400" />
          <span>Rounded</span>
        </button>

        <button
          onClick={() => addShape('line', 'Line')}
          className="glass hover:border-[var(--color-accent-primary)]/50 rounded-xl p-3 flex flex-col items-center justify-center text-xs font-medium gap-1.5 transition-all"
        >
          <Minus className="w-5 h-5 text-amber-400" />
          <span>Line</span>
        </button>

        <button
          onClick={() => addShape('arrow', 'Arrow')}
          className="glass hover:border-[var(--color-accent-primary)]/50 rounded-xl p-3 flex flex-col items-center justify-center text-xs font-medium gap-1.5 transition-all"
        >
          <ArrowRight className="w-5 h-5 text-sky-400" />
          <span>Arrow</span>
        </button>

        <button
          onClick={() => addShape('polygon', 'Badge')}
          className="glass hover:border-[var(--color-accent-primary)]/50 rounded-xl p-3 flex flex-col items-center justify-center text-xs font-medium gap-1.5 transition-all"
        >
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span>Badge</span>
        </button>
      </div>

      {/* Animated Emojis & Stickers */}
      <p className="text-xs font-bold text-[var(--color-text-primary)] mb-2">Emojis & Stickers</p>
      <div className="grid grid-cols-5 gap-2 scrollable-y flex-1 pr-1">
        {['🔥', '⚡', '✨', '🚀', '🎬', '💥', '💯', '🌟', '🎯', '💎', '❤️', '👑', '🎉', '🏆', '👀'].map((emoji) => (
          <button
            key={emoji}
            onClick={() => addEmoji(emoji)}
            className="glass hover:border-amber-400/50 rounded-xl p-3 text-2xl flex items-center justify-center hover:scale-110 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
