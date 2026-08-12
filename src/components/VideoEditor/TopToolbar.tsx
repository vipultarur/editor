import {
  FilePlus,
  Upload,
  RotateCcw,
  RotateCw,
  Save,
  Download,
  Settings,
  Keyboard,
  Monitor,
} from 'lucide-react';
import { useEditor } from '../../state/EditorContext';
import type { AspectRatio } from '../../types/editor';
import { exportProjectJSON } from '../../utils/projectStorage';

export default function TopToolbar() {
  const {
    project,
    dispatch,
    setShowExportModal,
    setShowShortcutsModal,
    setShowProjectSettingsModal,
  } = useEditor();

  const handleNewProject = () => {
    if (
      project.tracks.some((t) => t.clips.length > 0) &&
      !confirm('Start a new project? All unsaved timeline edits will be reset.')
    ) {
      return;
    }
    dispatch({ type: 'NEW_PROJECT' });
  };

  const handleSaveProject = () => {
    exportProjectJSON(project);
  };

  return (
    <header className="h-14 bg-[var(--color-bg-surface)] border-b border-[var(--color-glass-border)] flex items-center justify-between px-4 z-40 flex-shrink-0">
      {/* Left: Project title & New/Import */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white shadow-md">
            V
          </div>
          <input
            type="text"
            value={project.name}
            onChange={(e) => dispatch({ type: 'SET_PROJECT_NAME', payload: e.target.value })}
            className="bg-transparent text-sm font-bold text-[var(--color-text-primary)] hover:bg-white/5 px-2 py-1 rounded focus:bg-black/30 outline-none transition-colors border border-transparent focus:border-[var(--color-glass-border)]"
          />
        </div>

        <div className="h-4 w-[1px] bg-[var(--color-glass-border)] hidden sm:block" />

        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={handleNewProject}
            title="New Project"
            className="glass p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:border-indigo-500/50"
          >
            <FilePlus className="w-3.5 h-3.5 text-indigo-400" /> New
          </button>

          <button
            onClick={handleSaveProject}
            title="Export Project File (.json)"
            className="glass p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:border-emerald-500/50"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" /> Save
          </button>
        </div>
      </div>

      {/* Center: Undo/Redo & Aspect Ratio */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 glass p-1 rounded-lg">
          <button
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={project.history.past.length === 0}
            title="Undo (Ctrl+Z)"
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-white disabled:opacity-30"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => dispatch({ type: 'REDO' })}
            disabled={project.history.future.length === 0}
            title="Redo (Ctrl+Y)"
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-white disabled:opacity-30"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <div className="hidden md:flex items-center gap-1.5 glass px-2.5 py-1 rounded-xl text-xs border border-[var(--color-glass-border)]">
          <Monitor className="w-3.5 h-3.5 text-indigo-400" />
          <select
            value={project.canvas.aspectRatio}
            onChange={(e) =>
              dispatch({
                type: 'SET_CANVAS_SETTINGS',
                payload: { aspectRatio: e.target.value as AspectRatio },
              })
            }
            className="bg-[#101625] text-slate-100 font-semibold outline-none cursor-pointer border-none py-0.5"
          >
            <option value="16:9" className="bg-[#0f172a] text-slate-100">16:9 Widescreen</option>
            <option value="9:16" className="bg-[#0f172a] text-slate-100">9:16 Vertical</option>
            <option value="1:1" className="bg-[#0f172a] text-slate-100">1:1 Square</option>
            <option value="4:5" className="bg-[#0f172a] text-slate-100">4:5 Portrait</option>
            <option value="4:3" className="bg-[#0f172a] text-slate-100">4:3 Standard</option>
          </select>
        </div>
      </div>

      {/* Right: Export & Help Modals */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowShortcutsModal(true)}
          title="Keyboard Shortcuts"
          className="p-2 rounded-lg glass text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-glass-border)] transition-colors"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowProjectSettingsModal(true)}
          title="Project Settings"
          className="p-2 rounded-lg glass text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-glass-border)] transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowExportModal(true)}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold shadow-lg shadow-indigo-500/20 hover:scale-105 transition-transform"
        >
          <Download className="w-3.5 h-3.5" /> Export Video
        </button>
      </div>
    </header>
  );
}
