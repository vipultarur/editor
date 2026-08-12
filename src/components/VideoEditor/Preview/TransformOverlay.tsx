import { useRef, useState, type MouseEvent } from 'react';
import { useEditor } from '../../../state/EditorContext';
import type { TimelineClip } from '../../../types/editor';

interface TransformOverlayProps {
  clip: TimelineClip;
  canvasWidth: number;
  canvasHeight: number;
  containerWidth: number;
  containerHeight: number;
}

export default function TransformOverlay({
  clip,
  canvasWidth,
  canvasHeight,
  containerWidth,
  containerHeight,
}: TransformOverlayProps) {
  const { dispatch } = useEditor();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const startPosRef = useRef<{ x: number; y: number; initialClipX: number; initialClipY: number; initialScale: number; initialRot: number }>({
    x: 0,
    y: 0,
    initialClipX: 0,
    initialClipY: 0,
    initialScale: 1,
    initialRot: 0,
  });

  const scaleFactor = containerWidth / canvasWidth;

  const clipX = 'x' in clip ? clip.x : 0;
  const clipY = 'y' in clip ? clip.y : 0;
  const clipW = 'width' in clip ? clip.width : 400;
  const clipH = 'height' in clip ? clip.height : 200;
  const clipScale = 'scale' in clip ? clip.scale : 1.0;
  const clipRotation = 'rotation' in clip ? clip.rotation : 0;

  const renderedWidth = clipW * clipScale * scaleFactor;
  const renderedHeight = clipH * clipScale * scaleFactor;

  // Center alignment offsets
  const left = containerWidth / 2 + clipX * scaleFactor - renderedWidth / 2;
  const top = containerHeight / 2 + clipY * scaleFactor - renderedHeight / 2;

  const handleMouseDown = (e: MouseEvent, mode: 'move' | 'resize' | 'rotate') => {
    e.stopPropagation();
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialClipX: clipX,
      initialClipY: clipY,
      initialScale: clipScale,
      initialRot: clipRotation,
    };

    if (mode === 'move') setIsDragging(true);
    else if (mode === 'resize') setIsResizing(true);
    else if (mode === 'rotate') setIsRotating(true);

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const deltaX = (moveEvent.clientX - startPosRef.current.x) / scaleFactor;
      const deltaY = (moveEvent.clientY - startPosRef.current.y) / scaleFactor;

      if (mode === 'move') {
        dispatch({
          type: 'UPDATE_CLIP',
          payload: {
            id: clip.id,
            updates: {
              x: Math.round(startPosRef.current.initialClipX + deltaX),
              y: Math.round(startPosRef.current.initialClipY + deltaY),
            } as any,
          },
        });
      } else if (mode === 'resize') {
        const scaleDelta = (deltaX + deltaY) / 200;
        const nextScale = Math.max(0.1, Math.min(4.0, startPosRef.current.initialScale + scaleDelta));
        dispatch({
          type: 'UPDATE_CLIP',
          payload: {
            id: clip.id,
            updates: { scale: parseFloat(nextScale.toFixed(2)) } as any,
          },
        });
      } else if (mode === 'rotate') {
        const rotDelta = deltaX * 0.5;
        const nextRot = (startPosRef.current.initialRot + rotDelta) % 360;
        dispatch({
          type: 'UPDATE_CLIP',
          payload: {
            id: clip.id,
            updates: { rotation: Math.round(nextRot) } as any,
          },
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setIsRotating(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      onMouseDown={(e) => handleMouseDown(e, 'move')}
      className="absolute border-2 border-[var(--color-accent-primary)] cursor-move z-20 group transition-shadow"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${renderedWidth}px`,
        height: `${renderedHeight}px`,
        transform: `rotate(${clipRotation}deg)`,
      }}
    >
      {/* Corner Resize Handles */}
      <div
        onMouseDown={(e) => handleMouseDown(e, 'resize')}
        className="w-3 h-3 bg-white border-2 border-[var(--color-accent-primary)] rounded-full absolute -top-1.5 -left-1.5 cursor-nwse-resize hover:scale-125 transition-transform"
      />
      <div
        onMouseDown={(e) => handleMouseDown(e, 'resize')}
        className="w-3 h-3 bg-white border-2 border-[var(--color-accent-primary)] rounded-full absolute -top-1.5 -right-1.5 cursor-nesw-resize hover:scale-125 transition-transform"
      />
      <div
        onMouseDown={(e) => handleMouseDown(e, 'resize')}
        className="w-3 h-3 bg-white border-2 border-[var(--color-accent-primary)] rounded-full absolute -bottom-1.5 -left-1.5 cursor-nesw-resize hover:scale-125 transition-transform"
      />
      <div
        onMouseDown={(e) => handleMouseDown(e, 'resize')}
        className="w-3 h-3 bg-white border-2 border-[var(--color-accent-primary)] rounded-full absolute -bottom-1.5 -right-1.5 cursor-nwse-resize hover:scale-125 transition-transform"
      />

      {/* Top Rotation Handle */}
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div
          onMouseDown={(e) => handleMouseDown(e, 'rotate')}
          className="w-4 h-4 bg-indigo-500 border-2 border-white rounded-full cursor-grab active:cursor-grabbing shadow-lg hover:scale-125 transition-transform"
          title="Drag to rotate"
        />
        <div className="w-0.5 h-3 bg-[var(--color-accent-primary)]" />
      </div>
    </div>
  );
}
