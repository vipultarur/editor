import { useSession } from './state/SessionContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import VideoShortsPanel from './components/VideoShortsPanel';
import VoicePanel from './components/VoicePanel';
import MergePanel from './components/MergePanel';
import ProductMatchPanel from './components/ProductMatch/ProductMatchPanel';
import VideoEditorWorkspace from './components/VideoEditor/VideoEditorWorkspace';
import DownloaderPanel from './components/DownloaderPanel';

function AppContent() {
  const { state, dispatch } = useSession();

  if (state.activeTab === 'editor') {
    return (
      <div className="relative w-full h-screen overflow-hidden">
        {/* Top-right mode switch button to return to tools */}
        <button
          onClick={() => dispatch({ type: 'SET_TAB', payload: 'shorts' })}
          className="fixed bottom-4 right-4 z-50 glass hover:border-indigo-500 px-3 py-1.5 rounded-full text-[0.6875rem] font-bold text-indigo-300 shadow-xl flex items-center gap-1.5 transition-all"
        >
          <span>✂️ Switch to Quick Tools</span>
        </button>

        <VideoEditorWorkspace />
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen">
      <Sidebar />

      <main className="flex-1 min-h-screen flex flex-col pb-16 md:pb-0">
        <Header />

        <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {state.activeTab === 'downloader' && <DownloaderPanel />}
          {state.activeTab === 'match-short' && <ProductMatchPanel />}
          {state.activeTab === 'shorts' && <VideoShortsPanel />}
          {state.activeTab === 'voice' && <VoicePanel />}
          {state.activeTab === 'merge' && <MergePanel />}
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-[var(--color-glass-border)] text-center">
          <p className="text-[0.625rem] text-[var(--color-text-muted)]">
            ClipVoice Studio • 100% Client-Side • No data leaves your device •
            Built with FFmpeg.wasm + Web Speech API
          </p>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
