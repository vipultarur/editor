import { X, Keyboard } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';

const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause Video' },
  { key: 'S', desc: 'Split selected clip at playhead' },
  { key: 'Delete / Backspace', desc: 'Delete selected clip' },
  { key: 'Ctrl + Z', desc: 'Undo last action' },
  { key: 'Ctrl + Y / Ctrl + Shift + Z', desc: 'Redo action' },
  { key: 'Ctrl + C', desc: 'Copy selected clip' },
  { key: 'Ctrl + V', desc: 'Paste copied clip' },
  { key: 'Ctrl + D', desc: 'Duplicate selected clip' },
  { key: 'Left / Right Arrow', desc: 'Step 1 frame backward / forward' },
  { key: 'Shift + Left / Right Arrow', desc: 'Step 1 second backward / forward' },
  { key: 'Home / End', desc: 'Jump to start / end of timeline' },
];

export default function ShortcutsModal() {
  const { showShortcutsModal, setShowShortcutsModal } = useEditor();

  if (!showShortcutsModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="glass rounded-2xl w-full max-w-md p-6 border border-[var(--color-glass-border)] shadow-2xl relative">
        <div className="flex items-center justify-between mb-4 border-b border-[var(--color-glass-border)] pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-[var(--color-accent-primary)]" />
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={() => setShowShortcutsModal(false)}
            className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {SHORTCUTS.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-2 rounded-lg bg-black/30 text-xs"
            >
              <span className="text-[var(--color-text-muted)]">{item.desc}</span>
              <kbd className="px-2 py-1 rounded bg-white/10 font-mono text-[0.6875rem] font-bold text-white border border-white/20">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
