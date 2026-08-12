import { X, Settings } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { AspectRatio } from '../../../types/editor';

export default function ProjectSettingsModal() {
  const { project, dispatch, showProjectSettingsModal, setShowProjectSettingsModal } = useEditor();

  if (!showProjectSettingsModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="glass rounded-2xl w-full max-w-md p-6 border border-[var(--color-glass-border)] shadow-2xl relative">
        <div className="flex items-center justify-between mb-4 border-b border-[var(--color-glass-border)] pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--color-accent-primary)]" />
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">Project Settings</h3>
          </div>
          <button
            onClick={() => setShowProjectSettingsModal(false)}
            className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Project Name */}
          <div>
            <label className="text-[0.6875rem] font-semibold text-[var(--color-text-muted)] block mb-1">
              Project Title
            </label>
            <input
              type="text"
              value={project.name}
              onChange={(e) => dispatch({ type: 'SET_PROJECT_NAME', payload: e.target.value })}
              className="input-field w-full py-1.5"
            />
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="text-[0.6875rem] font-semibold text-[var(--color-text-muted)] block mb-1">
              Aspect Ratio Preset
            </label>
            <select
              value={project.canvas.aspectRatio}
              onChange={(e) =>
                dispatch({
                  type: 'SET_CANVAS_SETTINGS',
                  payload: { aspectRatio: e.target.value as AspectRatio },
                })
              }
              className="input-field w-full py-1.5"
            >
              <option value="16:9" className="bg-[#0f172a] text-slate-100">16:9 Widescreen (1920 x 1080)</option>
              <option value="9:16" className="bg-[#0f172a] text-slate-100">9:16 Vertical (1080 x 1920)</option>
              <option value="1:1" className="bg-[#0f172a] text-slate-100">1:1 Square (1080 x 1080)</option>
              <option value="4:5" className="bg-[#0f172a] text-slate-100">4:5 Portrait (1080 x 1350)</option>
              <option value="4:3" className="bg-[#0f172a] text-slate-100">4:3 Standard (1440 x 1080)</option>
            </select>
          </div>

          {/* Frame Rate (FPS) */}
          <div>
            <label className="text-[0.6875rem] font-semibold text-[var(--color-text-muted)] block mb-1">
              Target Frame Rate (FPS)
            </label>
            <select
              value={project.canvas.fps}
              onChange={(e) =>
                dispatch({
                  type: 'SET_CANVAS_SETTINGS',
                  payload: { fps: parseInt(e.target.value) },
                })
              }
              className="input-field w-full py-1.5"
            >
              <option value={24} className="bg-[#0f172a] text-slate-100">24 FPS (Cinematic)</option>
              <option value={25} className="bg-[#0f172a] text-slate-100">25 FPS (PAL Standard)</option>
              <option value={30} className="bg-[#0f172a] text-slate-100">30 FPS (Default Web)</option>
              <option value={60} className="bg-[#0f172a] text-slate-100">60 FPS (High Motion)</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setShowProjectSettingsModal(false)}
          className="btn-primary w-full mt-6 text-xs py-2"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
