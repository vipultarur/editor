import { useSession } from '../state/SessionContext';
import type { ActiveTab } from '../state/sessionReducer';

const tabs: Array<{ id: ActiveTab; label: string; icon: string; description: string }> = [
  { id: 'editor', label: 'Pro Video Editor', icon: '🎥', description: 'Full CapCut/Canva Editor' },
  { id: 'downloader', label: 'YT & IG Downloader', icon: '📥', description: 'Download & trim YT/IG' },
  { id: 'match-short', label: 'Product Reveal', icon: '🎯', description: 'Match/No Match Shorts' },
  { id: 'shorts', label: 'Shorts', icon: '✂️', description: 'Split videos' },
  { id: 'voice', label: 'Voice', icon: '🎙️', description: 'Generate speech' },
  { id: 'merge', label: 'Merge', icon: '🎬', description: 'Combine clips' },
];

export default function Sidebar() {
  const { state, dispatch } = useSession();

  const itemCount =
    state.shortClips.length + state.generatedVoices.length + state.mergedVideos.length;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] min-h-screen border-r border-[var(--color-glass-border)] bg-[var(--color-bg-surface)]">
        {/* Logo */}
        <div className="p-5 border-b border-[var(--color-glass-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-lg font-bold shadow-lg shadow-[var(--color-accent-indigo)]/20">
              C
            </div>
            <div>
              <h1 className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">
                ClipVoice
              </h1>
              <p className="text-[0.625rem] text-[var(--color-text-muted)] font-medium tracking-wide uppercase">
                Studio
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {tabs.map((tab) => {
            const isActive = state.activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => dispatch({ type: 'SET_TAB', payload: tab.id })}
                className={`
                  relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-left
                  transition-all duration-200 cursor-pointer border-0 w-full font-[inherit]
                  ${
                    isActive
                      ? 'bg-[var(--color-accent-indigo)]/10 text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-hover)] hover:text-[var(--color-text-primary)]'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full gradient-primary" />
                )}
                <span className="text-lg">{tab.icon}</span>
                <div>
                  <div className="text-sm font-semibold">{tab.label}</div>
                  <div className="text-[0.6875rem] text-[var(--color-text-muted)]">
                    {tab.description}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Session Info */}
        <div className="p-4 border-t border-[var(--color-glass-border)]">
          <div className="glass rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.6875rem] text-[var(--color-text-muted)] font-medium uppercase tracking-wider">
                Session
              </span>
              <span className="badge badge-primary">{itemCount} items</span>
            </div>
            <div className="flex items-center gap-1.5 text-[0.6875rem] text-[var(--color-accent-success)]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent-success)] animate-pulse" />
              Client-side only
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-glass-border)] bg-[var(--color-bg-surface)]/95 backdrop-blur-xl flex">
        {tabs.map((tab) => {
          const isActive = state.activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => dispatch({ type: 'SET_TAB', payload: tab.id })}
              className={`
                flex-1 flex flex-col items-center gap-1 py-2.5 border-0 cursor-pointer font-[inherit]
                transition-colors duration-200 bg-transparent
                ${isActive ? 'text-[var(--color-accent-indigo)]' : 'text-[var(--color-text-muted)]'}
              `}
            >
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 rounded-full gradient-primary" />
              )}
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[0.625rem] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
