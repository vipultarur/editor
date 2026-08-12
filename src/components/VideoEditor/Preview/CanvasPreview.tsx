import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useEditor } from '../../../state/EditorContext';
import type { TimelineClip, VideoMediaClip, ImageClip, TextClip, CaptionClip, ElementClip, EffectClip } from '../../../types/editor';
import { getInterpolatedProperty } from '../../../utils/keyframeInterpolator';
import TransformOverlay from './TransformOverlay';
import SafeZoneGuide from './SafeZoneGuide';
import PlayerControls from './PlayerControls';

export default function CanvasPreview() {
  const { project, dispatch } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const offscreenFrameCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const isJustPausedRef = useRef<boolean>(false);

  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 800, height: 450 });
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);
  const [canvasZoom, setCanvasZoom] = useState<number>(1.0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // ResizeObserver for canvas stage container
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Stable list of all visible clips across tracks (does NOT depend on playheadTime)
  const allClips = useMemo(() => {
    const clips: TimelineClip[] = [];
    project.tracks.forEach((track) => {
      if (track.hidden) return;
      track.clips.forEach((clip) => {
        if (!clip.hidden) clips.push(clip);
      });
    });
    return clips.sort((a, b) => a.layer - b.layer);
  }, [project.tracks]);

  // Keep playheadTime ref up to date for smooth RAF rendering
  const playheadTimeRef = useRef(project.playheadTime);
  useEffect(() => {
    playheadTimeRef.current = project.playheadTime;
  }, [project.playheadTime]);

  // Track play/pause transition to sync exact frame without jumping
  const wasPlayingRef = useRef<boolean>(project.isPlaying);
  useEffect(() => {
    if (wasPlayingRef.current && !project.isPlaying) {
      isJustPausedRef.current = true;
    } else {
      isJustPausedRef.current = false;
    }
    wasPlayingRef.current = project.isPlaying;
  }, [project.isPlaying]);

  // Core Canvas Render Function (Preserves aspect ratio to prevent video stretching)
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: cW, height: cH } = project.canvas;
    if (canvas.width !== cW) canvas.width = cW;
    if (canvas.height !== cH) canvas.height = cH;

    const currentPlayhead = playheadTimeRef.current;

    // 1. Clear & Draw Canvas Background Color
    ctx.clearRect(0, 0, cW, cH);
    if (project.canvas.backgroundColor !== 'transparent') {
      ctx.fillStyle = project.canvas.backgroundColor;
      ctx.fillRect(0, 0, cW, cH);
    }

    // 2. Filter clips active at current playhead timestamp
    const activeClips = allClips.filter(
      (c) => currentPlayhead >= c.startTime && currentPlayhead <= (c.startTime + c.duration)
    );

    // 3. Render active layers
    activeClips.forEach((clip) => {
      const relTime = currentPlayhead - clip.startTime;

      const x = getInterpolatedProperty(clip, 'x', relTime);
      const y = getInterpolatedProperty(clip, 'y', relTime);
      const scale = getInterpolatedProperty(clip, 'scale', relTime);
      const rotation = getInterpolatedProperty(clip, 'rotation', relTime);
      const opacity = getInterpolatedProperty(clip, 'opacity', relTime);

      ctx.save();
      ctx.globalAlpha = opacity;

      // Apply transitionIn entrance effects (Fade, Slide, Zoom, Wipe, Dip Black/White)
      if ('transitionIn' in clip && clip.transitionIn && clip.transitionIn !== 'none') {
        const tDur = clip.transitionInDuration || 0.6;
        if (relTime < tDur) {
          const progress = Math.max(0, Math.min(1, relTime / tDur));
          const trType = clip.transitionIn;
          if (trType === 'fade' || trType === 'crossdissolve' || trType === 'diptoblack' || trType === 'diptowhite') {
            ctx.globalAlpha *= progress;
          } else if (trType === 'slideleft') {
            ctx.translate(cW * (1 - progress), 0);
          } else if (trType === 'slideright') {
            ctx.translate(-cW * (1 - progress), 0);
          } else if (trType === 'slideup') {
            ctx.translate(0, cH * (1 - progress));
          } else if (trType === 'slidedown') {
            ctx.translate(0, -cH * (1 - progress));
          } else if (trType === 'zoom') {
            ctx.scale(0.3 + 0.7 * progress, 0.3 + 0.7 * progress);
          } else if (trType === 'wipe') {
            ctx.beginPath();
            ctx.rect(-cW / 2, -cH / 2, cW * progress, cH);
            ctx.clip();
          }
        }
      }

      ctx.translate(cW / 2 + x, cH / 2 + y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);

      if (clip.type === 'video') {
        const vElem = videoElementsRef.current.get(clip.id);
        const boxW = clip.width || cW;
        const boxH = clip.height || cH;

        let frameDrawn = false;

        if (vElem && vElem.videoWidth > 0 && vElem.videoHeight > 0) {
          try {
            // Unstretched contain-fit calculation
            const videoAspect = vElem.videoWidth / vElem.videoHeight;
            const boxAspect = boxW / boxH;

            let finalW = boxW;
            let finalH = boxH;

            if (videoAspect > boxAspect) {
              finalH = boxW / videoAspect;
            } else {
              finalW = boxH * videoAspect;
            }

            applyFilterToCtx(ctx, clip.filters);
            if (clip.chromaKey?.enabled) {
              applyChromaKey(ctx, vElem, -finalW / 2, -finalH / 2, finalW, finalH, clip.chromaKey);
            } else {
              ctx.drawImage(vElem, -finalW / 2, -finalH / 2, finalW, finalH);
            }
            frameDrawn = true;

            // Cache current video frame into offscreen canvas for fallback zero-black buffering
            let offscreen = offscreenFrameCacheRef.current.get(clip.id);
            if (!offscreen) {
              offscreen = document.createElement('canvas');
              offscreenFrameCacheRef.current.set(clip.id, offscreen);
            }
            if (offscreen.width !== vElem.videoWidth) offscreen.width = vElem.videoWidth;
            if (offscreen.height !== vElem.videoHeight) offscreen.height = vElem.videoHeight;
            const offCtx = offscreen.getContext('2d');
            if (offCtx) {
              offCtx.drawImage(vElem, 0, 0);
            }
          } catch {
            frameDrawn = false;
          }
        }

        // Fallback: draw last cached frame if video element is buffering or seeking
        if (!frameDrawn) {
          const offscreen = offscreenFrameCacheRef.current.get(clip.id);
          if (offscreen && offscreen.width > 0) {
            applyFilterToCtx(ctx, clip.filters);
            const videoAspect = offscreen.width / offscreen.height;
            const boxAspect = boxW / boxH;

            let finalW = boxW;
            let finalH = boxH;

            if (videoAspect > boxAspect) {
              finalH = boxW / videoAspect;
            } else {
              finalW = boxH * videoAspect;
            }

            ctx.drawImage(offscreen, -finalW / 2, -finalH / 2, finalW, finalH);
          }
        }
      } else if (clip.type === 'image') {
        const img = getLoadedImage(clip.blobUrl);
        if (img) {
          const boxW = clip.width || cW;
          const boxH = clip.height || cH;
          const imgAspect = (img.naturalWidth || boxW) / (img.naturalHeight || boxH);
          const boxAspect = boxW / boxH;

          let finalW = boxW;
          let finalH = boxH;

          if (imgAspect > boxAspect) {
            finalH = boxW / imgAspect;
          } else {
            finalW = boxH * imgAspect;
          }

          applyFilterToCtx(ctx, clip.filters);
          ctx.drawImage(img, -finalW / 2, -finalH / 2, finalW, finalH);
        }
      } else if (clip.type === 'text') {
        renderTextOnCtx(ctx, clip as TextClip, relTime);
      } else if (clip.type === 'caption') {
        renderCaptionOnCtx(ctx, clip as CaptionClip, cW, cH);
      } else if (clip.type === 'element') {
        renderElementOnCtx(ctx, clip as ElementClip);
      } else if (clip.type === 'effect') {
        renderEffectOverlay(ctx, clip as EffectClip, cW, cH);
      }

      ctx.restore();
    });
  }, [allClips, project.canvas]);

  // Manage Video & Audio Elements across ALL tracks (handles play, pause, mute, fade-in/out, multi-track audio sync)
  useEffect(() => {
    // 1. Gather all clips across ALL project tracks (including hidden/muted tracks)
    const allProjectClips: TimelineClip[] = [];
    project.tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        allProjectClips.push(clip);
      });
    });

    const activeClipIds = new Set<string>();

    allProjectClips.forEach((clip) => {
      const parentTrack = project.tracks.find((t) => t.id === clip.trackId);
      const isTrackHidden = parentTrack?.hidden;
      const isTrackMuted = parentTrack?.muted || isTrackHidden;

      const isActive =
        !isTrackHidden &&
        project.playheadTime >= clip.startTime &&
        project.playheadTime < clip.startTime + clip.duration;

      if (isActive) {
        activeClipIds.add(clip.id);
      }

      const relTime = project.playheadTime - clip.startTime;
      const targetMediaTime = Math.max(0, relTime + clip.trimStart);

      // Compute dynamic Fade-In & Fade-Out Volume Multiplier
      let fadeMultiplier = 1.0;
      const fadeIn = 'fadeIn' in clip ? (clip as VideoMediaClip).fadeIn || 0 : 0;
      const fadeOut = 'fadeOut' in clip ? (clip as VideoMediaClip).fadeOut || 0 : 0;

      if (fadeIn > 0 && relTime < fadeIn) {
        fadeMultiplier *= Math.max(0, Math.min(1, relTime / fadeIn));
      }
      if (fadeOut > 0 && clip.duration - relTime < fadeOut) {
        fadeMultiplier *= Math.max(0, Math.min(1, (clip.duration - relTime) / fadeOut));
      }

      if (clip.type === 'video') {
        let vElem = videoElementsRef.current.get(clip.id);
        if (!vElem) {
          vElem = document.createElement('video');
          vElem.src = clip.blobUrl;
          vElem.crossOrigin = 'anonymous';
          vElem.playsInline = true;
          vElem.preload = 'auto';
          videoElementsRef.current.set(clip.id, vElem);
        }

        vElem.onseeked = () => {
          if (!project.isPlaying) renderCanvas();
        };
        vElem.onseeking = () => {
          if (!project.isPlaying) renderCanvas();
        };
        vElem.ontimeupdate = () => {
          if (!project.isPlaying) renderCanvas();
        };
        vElem.onloadeddata = () => {
          renderCanvas();
        };

        const clipMuted = clip.muted || project.muted || !!isTrackMuted;
        vElem.muted = clipMuted;
        const targetVol = Math.max(0, Math.min(1, (clip.volume ?? 1) * project.volume * fadeMultiplier));
        vElem.volume = targetVol;
        vElem.playbackRate = (clip.speed || 1.0) * playbackSpeed;

        if (project.isPlaying && isActive && !isTrackMuted) {
          if (vElem.paused) {
            vElem.currentTime = targetMediaTime;
            vElem.play().catch(() => {});
          } else if (Math.abs(vElem.currentTime - targetMediaTime) > 0.4) {
            vElem.currentTime = targetMediaTime;
          }
        } else {
          if (!vElem.paused) {
            vElem.pause();

            if (isJustPausedRef.current && isActive) {
              const exactPausedTime = clip.startTime + (vElem.currentTime - clip.trimStart);
              dispatch({ type: 'SET_PLAYHEAD', payload: Math.max(0, exactPausedTime) });
              isJustPausedRef.current = false;
            }
          }

          if (isActive && !isJustPausedRef.current && Math.abs(vElem.currentTime - targetMediaTime) > 0.001) {
            vElem.currentTime = targetMediaTime;
          }
        }
      } else if (clip.type === 'audio') {
        let aElem = audioElementsRef.current.get(clip.id);
        if (!aElem) {
          aElem = new Audio(clip.blobUrl);
          aElem.preload = 'auto';
          audioElementsRef.current.set(clip.id, aElem);
        }

        const clipMuted = clip.muted || project.muted || !!isTrackMuted;
        aElem.muted = clipMuted;
        const targetVol = Math.max(0, Math.min(1, (clip.volume ?? 1) * project.volume * fadeMultiplier));
        aElem.volume = targetVol;
        aElem.playbackRate = (clip.speed || 1.0) * playbackSpeed;

        if (project.isPlaying && isActive && !isTrackMuted) {
          if (aElem.paused) {
            aElem.currentTime = targetMediaTime;
            aElem.play().catch(() => {});
          } else if (Math.abs(aElem.currentTime - targetMediaTime) > 0.4) {
            aElem.currentTime = targetMediaTime;
          }
        } else {
          if (!aElem.paused) {
            aElem.pause();
          }

          if (isActive && Math.abs(aElem.currentTime - targetMediaTime) > 0.001) {
            aElem.currentTime = targetMediaTime;
          }
        }
      }
    });

    // 2. Pause & cleanup any video/audio elements that are not currently active or deleted
    videoElementsRef.current.forEach((vElem, id) => {
      if (!activeClipIds.has(id)) {
        if (!vElem.paused) vElem.pause();
      }
    });

    audioElementsRef.current.forEach((aElem, id) => {
      if (!activeClipIds.has(id)) {
        if (!aElem.paused) aElem.pause();
      }
    });

    // 3. Clean up unreferenced elements
    const validIds = new Set(allProjectClips.map((c) => c.id));
    videoElementsRef.current.forEach((vElem, id) => {
      if (!validIds.has(id)) {
        vElem.pause();
        vElem.onseeked = null;
        vElem.onseeking = null;
        vElem.ontimeupdate = null;
        vElem.onloadeddata = null;
        vElem.removeAttribute('src');
        vElem.load();
        videoElementsRef.current.delete(id);
        offscreenFrameCacheRef.current.delete(id);
      }
    });

    audioElementsRef.current.forEach((aElem, id) => {
      if (!validIds.has(id)) {
        aElem.pause();
        aElem.removeAttribute('src');
        aElem.load();
        audioElementsRef.current.delete(id);
      }
    });

    renderCanvas();
  }, [allClips, project.isPlaying, project.muted, project.volume, project.tracks, playbackSpeed, project.playheadTime, renderCanvas, dispatch]);

  // Main Canvas Render Loop - continuous RAF during playback
  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
      renderCanvas();
      if (project.isPlaying) {
        animId = requestAnimationFrame(renderLoop);
      }
    };

    renderLoop();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [project.isPlaying, renderCanvas]);

  // Selected clip for transform bounding box overlay
  const selectedClip = useMemo(() => {
    if (!project.selectedClipId) return null;
    for (const track of project.tracks) {
      const found = track.clips.find((c) => c.id === project.selectedClipId);
      if (found) return found;
    }
    return null;
  }, [project.tracks, project.selectedClipId]);

  // Calculate viewport display bounds inside stage
  const canvasAspect = project.canvas.width / project.canvas.height;
  const containerAspect = containerSize.width / containerSize.height;

  let displayWidth = containerSize.width;
  let displayHeight = containerSize.height;

  if (containerAspect > canvasAspect) {
    displayHeight = containerSize.height * 0.85 * canvasZoom;
    displayWidth = displayHeight * canvasAspect;
  } else {
    displayWidth = containerSize.width * 0.85 * canvasZoom;
    displayHeight = displayWidth / canvasAspect;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090d16] overflow-hidden select-none">
      {/* Canvas Viewport Stage */}
      <div ref={containerRef} className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
        <div
          className="relative bg-black rounded-lg shadow-2xl overflow-hidden border border-[var(--color-glass-border)] transition-all"
          style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
        >
          {/* Main Canvas Element */}
          <canvas ref={canvasRef} className="w-full h-full object-contain block" />

          {/* Interactive Bounding Box Transform Overlay */}
          {selectedClip && (
            <TransformOverlay
              clip={selectedClip}
              canvasWidth={project.canvas.width}
              canvasHeight={project.canvas.height}
              containerWidth={displayWidth}
              containerHeight={displayHeight}
            />
          )}

          {/* TikTok / Shorts Safe Area Guides Overlay */}
          <SafeZoneGuide show={showSafeZone} />
        </div>
      </div>

      {/* Bottom Player Controls */}
      <PlayerControls
        showSafeZone={showSafeZone}
        setShowSafeZone={setShowSafeZone}
        canvasZoom={canvasZoom}
        setCanvasZoom={setCanvasZoom}
        playbackSpeed={playbackSpeed}
        setPlaybackSpeed={setPlaybackSpeed}
        containerRef={containerRef}
      />
    </div>
  );
}

// Global image cache for canvas drawing
const imageCache = new Map<string, HTMLImageElement>();
function getLoadedImage(url: string): HTMLImageElement | null {
  if (imageCache.has(url)) return imageCache.get(url)!;
  const img = new Image();
  img.src = url;
  img.onload = () => imageCache.set(url, img);
  return null;
}

function applyFilterToCtx(ctx: CanvasRenderingContext2D, filters: VideoMediaClip['filters']) {
  if (!filters) {
    ctx.filter = 'none';
    return;
  }
  const b = filters.brightness ?? 100;
  const c = filters.contrast ?? 100;
  const s = filters.saturation ?? 100;
  const blur = filters.blur ?? 0;

  if (b === 100 && c === 100 && s === 100 && blur === 0) {
    ctx.filter = 'none';
  } else {
    ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) blur(${blur}px)`;
  }
}

function renderTextOnCtx(ctx: CanvasRenderingContext2D, clip: TextClip, relTime: number) {
  ctx.font = `${clip.fontWeight || 'bold'} ${clip.fontSize}px ${clip.fontFamily}, sans-serif`;
  ctx.textAlign = clip.align || 'center';
  ctx.textBaseline = 'middle';

  let textToRender = clip.text;
  if (clip.animation?.entrance === 'typewriter') {
    const dur = clip.animation.entranceDuration || 1.0;
    const progress = Math.min(1, relTime / dur);
    const count = Math.floor(clip.text.length * progress);
    textToRender = clip.text.slice(0, count);
  }

  if (clip.backgroundColor && clip.backgroundColor !== 'transparent') {
    const metrics = ctx.measureText(textToRender);
    const padding = 16;
    ctx.fillStyle = clip.backgroundColor;
    ctx.fillRect(
      -metrics.width / 2 - padding,
      -clip.fontSize / 2 - padding / 2,
      metrics.width + padding * 2,
      clip.fontSize + padding
    );
  }

  if (clip.shadowColor && clip.shadowColor !== 'transparent') {
    ctx.shadowColor = clip.shadowColor;
    ctx.shadowBlur = clip.shadowBlur || 10;
  }

  if (clip.strokeWidth > 0 && clip.strokeColor) {
    ctx.strokeStyle = clip.strokeColor;
    ctx.lineWidth = clip.strokeWidth;
    ctx.strokeText(textToRender, 0, 0);
  }

  ctx.fillStyle = clip.color;
  ctx.fillText(textToRender, 0, 0);
}

function renderCaptionOnCtx(ctx: CanvasRenderingContext2D, clip: CaptionClip, cW: number, cH: number) {
  ctx.font = `600 ${clip.fontSize}px ${clip.fontFamily}, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const metrics = ctx.measureText(clip.text);
  const padding = 12;

  let yPos = cH / 2 - 80;
  if (clip.position === 'top') yPos = -cH / 2 + 100;
  else if (clip.position === 'center') yPos = 0;

  if (clip.backgroundColor) {
    ctx.fillStyle = clip.backgroundColor;
    ctx.fillRect(
      -metrics.width / 2 - padding,
      yPos - clip.fontSize / 2 - padding / 2,
      metrics.width + padding * 2,
      clip.fontSize + padding
    );
  }

  ctx.fillStyle = clip.color;
  ctx.fillText(clip.text, 0, yPos);
}

function renderElementOnCtx(ctx: CanvasRenderingContext2D, clip: ElementClip) {
  const w = clip.width || 200;
  const h = clip.height || 200;

  if (clip.elementType === 'emoji') {
    ctx.font = `${w * 0.8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(clip.content || '✨', 0, 0);
    return;
  }

  ctx.fillStyle = clip.fillColor;
  ctx.strokeStyle = clip.strokeColor;
  ctx.lineWidth = clip.strokeWidth;

  if (clip.shapeType === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
    ctx.fill();
    if (clip.strokeWidth > 0) ctx.stroke();
  } else if (clip.shapeType === 'rounded-rectangle') {
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 20);
    ctx.fill();
    if (clip.strokeWidth > 0) ctx.stroke();
  } else {
    ctx.fillRect(-w / 2, -h / 2, w, h);
    if (clip.strokeWidth > 0) ctx.strokeRect(-w / 2, -h / 2, w, h);
  }
}

function renderEffectOverlay(ctx: CanvasRenderingContext2D, clip: EffectClip, cW: number, cH: number) {
  if (clip.effectType === 'vignette') {
    const grad = ctx.createRadialGradient(0, 0, cW * 0.3, 0, 0, cW * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${clip.intensity / 100})`);
    ctx.fillStyle = grad;
    ctx.fillRect(-cW / 2, -cH / 2, cW, cH);
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

let sharedChromaCanvas: HTMLCanvasElement | null = null;

function applyChromaKey(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  chromaKey: { enabled: boolean; color: string; tolerance: number; smoothness: number }
) {
  const reqW = Math.max(1, Math.floor(dw));
  const reqH = Math.max(1, Math.floor(dh));

  if (!sharedChromaCanvas) {
    sharedChromaCanvas = document.createElement('canvas');
  }
  if (sharedChromaCanvas.width !== reqW) sharedChromaCanvas.width = reqW;
  if (sharedChromaCanvas.height !== reqH) sharedChromaCanvas.height = reqH;

  const tempCtx = sharedChromaCanvas.getContext('2d');
  if (!tempCtx) {
    ctx.drawImage(source, dx, dy, dw, dh);
    return;
  }

  tempCtx.clearRect(0, 0, reqW, reqH);
  tempCtx.drawImage(source, 0, 0, reqW, reqH);
  const imgData = tempCtx.getImageData(0, 0, reqW, reqH);
  const data = imgData.data;

  const keyRgb = hexToRgb(chromaKey.color || '#00ff00');
  const tolerance = (chromaKey.tolerance || 40) * 2.55;
  const smoothness = (chromaKey.smoothness || 20) * 2.55;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dist = Math.sqrt((r - keyRgb.r) ** 2 + (g - keyRgb.g) ** 2 + (b - keyRgb.b) ** 2);

    if (dist < tolerance) {
      data[i + 3] = 0;
    } else if (dist < tolerance + smoothness) {
      const alpha = (dist - tolerance) / smoothness;
      data[i + 3] = Math.floor(data[i + 3] * alpha);
    }
  }

  tempCtx.putImageData(imgData, 0, 0);
  ctx.drawImage(sharedChromaCanvas, dx, dy, dw, dh);
}
