import { Wand2, Check } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { TransitionType, VideoMediaClip, ImageClip } from '../../../types/editor';

const TRANSITIONS_LIST: { type: TransitionType; name: string; icon: string }[] = [
  { type: 'fade', name: 'Fade In / Out', icon: '🌗' },
  { type: 'crossdissolve', name: 'Cross Dissolve', icon: '🌫️' },
  { type: 'diptoblack', name: 'Dip to Black', icon: '⬛' },
  { type: 'diptowhite', name: 'Dip to White', icon: '⬜' },
  { type: 'slideleft', name: 'Slide Left', icon: '⬅️' },
  { type: 'slideright', name: 'Slide Right', icon: '➡️' },
  { type: 'slideup', name: 'Slide Up', icon: '⬆️' },
  { type: 'slidedown', name: 'Slide Down', icon: '⬇️' },
  { type: 'zoom', name: 'Zoom Transition', icon: '🔍' },
  { type: 'push', name: 'Push', icon: '👉' },
  { type: 'wipe', name: 'Wipe', icon: '🧹' },
  { type: 'blur', name: 'Blur Transition', icon: '💧' },
];

export default function TransitionsTab() {
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

  const applyTransition = (transitionType: TransitionType) => {
    if (selectedClip) {
      dispatch({
        type: 'UPDATE_CLIP',
        payload: {
          id: selectedClip.id,
          updates: {
            transitionIn: transitionType,
            transitionInDuration: 0.8,
          },
        },
      });
    } else {
      // Apply transition to all media clips if none selected
      project.tracks.forEach((track) => {
        track.clips.forEach((clip) => {
          if (clip.type === 'video' || clip.type === 'image') {
            dispatch({
              type: 'UPDATE_CLIP',
              payload: {
                id: clip.id,
                updates: { transitionIn: transitionType, transitionInDuration: 0.8 },
              },
            });
          }
        });
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
      <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">Transitions</h3>
      <p className="text-[0.6875rem] text-[var(--color-text-muted)] mb-3">
        {selectedClip ? `Applying entrance transition to: ${selectedClip.name}` : 'Select a clip or click to apply transition to clips'}
      </p>

      <div className="grid grid-cols-2 gap-2 scrollable-y flex-1 pr-1">
        {TRANSITIONS_LIST.map((tr) => {
          const isCurrent = selectedClip?.transitionIn === tr.type;
          return (
            <div
              key={tr.type}
              onClick={() => applyTransition(tr.type)}
              className={`glass rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[var(--color-accent-primary)]/50 transition-all ${
                isCurrent ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10' : ''
              }`}
            >
              <span className="text-2xl mb-1">{tr.icon}</span>
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">{tr.name}</span>
              {isCurrent && <Check className="w-3.5 h-3.5 text-[var(--color-accent-primary)] mt-1" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
