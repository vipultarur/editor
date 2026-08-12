import { useRef, type MouseEvent } from 'react';
import { useEditor } from '../../../state/EditorContext';

interface TimeRulerProps {
  totalDuration: number;
}

export default function TimeRuler({ totalDuration }: TimeRulerProps) {
  const { project, dispatch } = useEditor();
  const rulerRef = useRef<HTMLDivElement>(null);

  const zoom = project.zoomLevel; // px per second
  const rulerWidth = Math.max(1000, totalDuration * zoom + 300);

  // Determine major tick step in seconds based on zoom
  const stepSec = zoom >= 120 ? 1 : zoom >= 60 ? 2 : zoom >= 30 ? 5 : 10;
  const numTicks = Math.ceil(totalDuration / stepSec) + 5;

  const handleRulerMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();

    const updateTime = (clientX: number) => {
      const clickX = clientX - rect.left;
      const newTime = Math.max(0, Math.min(totalDuration, clickX / zoom));
      dispatch({ type: 'SET_PLAYHEAD', payload: newTime });
    };

    updateTime(e.clientX);

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      updateTime(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={rulerRef}
      onMouseDown={handleRulerMouseDown}
      className="h-7 bg-[var(--color-bg-surface)] border-b border-[var(--color-glass-border)] relative cursor-ew-resize select-none flex-shrink-0"
      style={{ width: `${rulerWidth}px` }}
    >
      {Array.from({ length: numTicks }).map((_, idx) => {
        const timeVal = idx * stepSec;
        const leftPx = timeVal * zoom;

        return (
          <div key={idx} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${leftPx}px` }}>
            {/* Major tick line & time label */}
            <div className="border-l border-slate-700/80 h-full flex flex-col justify-between pl-1">
              <span className="text-[0.625rem] font-mono font-medium text-slate-400 leading-none mt-1">
                {formatRulerTime(timeVal)}
              </span>
              <div className="w-full h-1.5 bg-slate-600/60" />
            </div>

            {/* Sub-ticks for frames when zoomed in */}
            {zoom >= 80 && (
              <div className="absolute top-3 bottom-0 left-0 flex pointer-events-none" style={{ width: `${stepSec * zoom}px` }}>
                {Array.from({ length: 4 }).map((_, subIdx) => {
                  const subLeft = ((subIdx + 1) / 5) * stepSec * zoom;
                  return (
                    <div
                      key={subIdx}
                      className="absolute bottom-0 border-l border-slate-700/50 h-2"
                      style={{ left: `${subLeft}px` }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatRulerTime(sec: number): string {
  const mins = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${mins}:${String(s).padStart(2, '0')}`;
}
