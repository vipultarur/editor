import { useState } from 'react';
import { useSession } from '../state/SessionContext';
import ConfirmModal from './ConfirmModal';

export default function Header() {
  const { state, clearAll } = useSession();
  const [showClearModal, setShowClearModal] = useState(false);

  const totalItems =
    state.shortClips.length + state.generatedVoices.length + state.mergedVideos.length;

  return (
    <>
      <header className="flex items-center justify-between px-5 md:px-8 py-4 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-surface)]/60 backdrop-blur-xl sticky top-0 z-40">
        {/* Left: Mobile logo + Page title */}
        <div className="flex items-center gap-3">
          <div className="md:hidden w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-sm font-bold">
            C
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-[var(--color-text-primary)]">
              {state.activeTab === 'match-short' && '🎯 Product Reveal Short Maker'}
              {state.activeTab === 'shorts' && '✂️ Video to Shorts'}
              {state.activeTab === 'voice' && '🎙️ Script to Voice'}
              {state.activeTab === 'merge' && '🎬 Merge Studio'}
            </h2>
            <p className="text-[0.6875rem] text-[var(--color-text-muted)] hidden sm:block">
              {state.activeTab === 'match-short' && 'Create 3-item vertical reveal shorts with smooth animations & sound'}
              {state.activeTab === 'shorts' && 'Split and crop videos into short clips'}
              {state.activeTab === 'voice' && 'Generate voice from your script'}
              {state.activeTab === 'merge' && 'Combine voice with video clips'}
            </p>
          </div>
        </div>

        {/* Right: Privacy badge + Clear */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full glass text-[0.6875rem] text-[var(--color-accent-success)] font-medium">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            100% Client-Side
          </div>

          {totalItems > 0 && (
            <button
              onClick={() => setShowClearModal(true)}
              className="btn-danger text-xs"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Clear All
            </button>
          )}
        </div>
      </header>

      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={() => {
          clearAll();
          setShowClearModal(false);
        }}
        title="Clear All Session Data"
        message={`This will permanently delete ${totalItems} item(s) from memory. All clips, voices, and merged videos will be lost. This cannot be undone.`}
        confirmText="Clear Everything"
        variant="danger"
      />
    </>
  );
}
