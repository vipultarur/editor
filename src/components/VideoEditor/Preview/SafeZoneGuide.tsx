import { useEditor } from '../../../state/EditorContext';

export default function SafeZoneGuide({ show }: { show: boolean }) {
  const { project } = useEditor();
  if (!show) return null;

  const isVertical = project.canvas.aspectRatio === '9:16';

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-4">
      {/* Outer Safe Margin Line */}
      <div className="absolute inset-4 border border-dashed border-cyan-400/40 rounded" />

      {isVertical ? (
        <>
          {/* TikTok / Reels Simulated UI Safe Area */}
          <div className="flex justify-between items-start text-[0.625rem] text-cyan-300/60 font-mono">
            <span className="bg-black/40 px-2 py-0.5 rounded">Header Safe Zone</span>
          </div>

          <div className="absolute right-4 bottom-24 flex flex-col items-center gap-3 text-cyan-300/40">
            <div className="w-8 h-8 rounded-full border border-current flex items-center justify-center text-[0.625rem]">Profile</div>
            <div className="w-7 h-7 rounded-full border border-current flex items-center justify-center text-[0.625rem]">Like</div>
            <div className="w-7 h-7 rounded-full border border-current flex items-center justify-center text-[0.625rem]">Comment</div>
            <div className="w-7 h-7 rounded-full border border-current flex items-center justify-center text-[0.625rem]">Share</div>
          </div>

          <div className="absolute left-4 bottom-8 right-16 bg-cyan-400/10 border border-cyan-400/30 p-2 rounded text-[0.625rem] text-cyan-300/70 font-mono">
            ⚠️ TikTok / Reels Caption & Username Area (Avoid Placing Text Here)
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-[90%] h-[90%] border border-cyan-400/30 border-dotted flex items-end p-2">
            <span className="text-[0.625rem] font-mono text-cyan-300/60 bg-black/40 px-2 py-0.5 rounded">
              16:9 Title Safe Zone (90%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
