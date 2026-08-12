import {
  FileVideo,
  Download,
  Music,
  Type,
  Subtitles,
  Shapes,
  Sparkles,
  Wand2,
  Sliders,
  Layers,
  Palette,
} from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import { useSession } from '../../../state/SessionContext';

interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const TABS: TabItem[] = [
  { id: 'media', label: 'Media', icon: FileVideo },
  { id: 'downloader', label: 'Downloader', icon: Download },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'captions', label: 'Captions', icon: Subtitles },
  { id: 'elements', label: 'Elements', icon: Shapes },
  { id: 'filters', label: 'Filters', icon: Sliders },
  { id: 'effects', label: 'Effects', icon: Sparkles },
  { id: 'transitions', label: 'Transitions', icon: Wand2 },
  { id: 'templates', label: 'Templates', icon: Layers },
  { id: 'background', label: 'Canvas', icon: Palette },
];

export default function SidebarNav() {
  const { activeSidebarTab, setActiveSidebarTab } = useEditor();
  const { dispatch: sessionDispatch } = useSession();

  return (
    <div className="w-16 md:w-20 bg-[var(--color-bg-surface)] border-r border-[var(--color-glass-border)] flex flex-col items-center py-4 gap-2 flex-shrink-0 z-10 overflow-y-auto max-h-full scrollbar-thin overscroll-contain touch-pan-y">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeSidebarTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'downloader') {
                sessionDispatch({ type: 'SET_TAB', payload: 'downloader' });
              } else {
                setActiveSidebarTab(tab.id);
              }
            }}
            title={tab.label}
            className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex flex-col items-center justify-center text-[0.625rem] font-medium transition-all ${
              isActive
                ? 'bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/40 shadow-lg shadow-indigo-500/10 scale-105'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5'
            }`}
          >
            <Icon className="w-5 h-5 mb-1" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
