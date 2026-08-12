import { Layers, Check } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import { STARTER_PROJECT_TEMPLATES } from '../../../utils/sampleAssets';

export default function TemplatesTab() {
  const { project, dispatch } = useEditor();

  const applyTemplate = (template: typeof STARTER_PROJECT_TEMPLATES[0]) => {
    if (
      project.tracks.some((t) => t.clips.length > 0) &&
      !confirm('Applying a template will replace your current timeline clips. Do you want to continue?')
    ) {
      return;
    }

    const newTracks = template.createTracks();
    dispatch({
      type: 'SET_CANVAS_SETTINGS',
      payload: { aspectRatio: template.aspectRatio },
    });

    dispatch({
      type: 'LOAD_PROJECT',
      payload: {
        ...project,
        tracks: newTracks,
        playheadTime: 0,
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
      <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">Project Templates</h3>
      <p className="text-[0.6875rem] text-[var(--color-text-muted)] mb-3">One-click complete video project setups</p>

      <div className="space-y-3 scrollable-y flex-1 pr-1">
        {STARTER_PROJECT_TEMPLATES.map((tmpl) => (
          <div
            key={tmpl.id}
            onClick={() => applyTemplate(tmpl)}
            className="glass rounded-xl p-3.5 cursor-pointer hover:border-[var(--color-accent-primary)]/50 group transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[var(--color-text-primary)]">{tmpl.name}</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[0.625rem] font-bold">
                {tmpl.aspectRatio}
              </span>
            </div>
            <p className="text-[0.6875rem] text-[var(--color-text-muted)] mb-3">{tmpl.description}</p>
            <button className="btn-primary w-full text-xs py-1.5 flex items-center justify-center gap-1.5 group-hover:scale-[1.02] transition-transform">
              <Layers className="w-3.5 h-3.5" /> Apply Template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
