import React, { useEffect, useRef, useState } from 'react';
import type { MatchGroup, RenderProgress } from '../../types/matchShort';
import {
  BACKGROUND_PRESETS,
  DEFAULT_VIDEO_BACKGROUND,
  DEFAULT_CHECK_AUDIO,
  DEFAULT_CROSS_AUDIO,
  DEFAULT_BACKGROUND_AUDIO,
  createSynthAudioSourceNode,
  playSynthSound,
} from '../../utils/matchShortPresets';

interface MatchCanvasPlayerProps {
  group: MatchGroup;
}

export default function MatchCanvasPlayer({ group }: MatchCanvasPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress>({
    isRendering: false,
    progress: 0,
    message: '',
  });

  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const loadedImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
  const audioBuffersRef = useRef<{ [key: string]: AudioBuffer }>({});
  const activeBgmSourceRef = useRef<AudioBufferSourceNode | HTMLAudioElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Track sub-step sounds already played in current round
  const playedStepSoundsRef = useRef<{ [key: string]: boolean }>({});

  // Helper to pre-decode audio URLs for zero-latency Web Audio playback
  const preloadAudio = async (url: string) => {
    if (!url || url.startsWith('synth:') || audioBuffersRef.current[url]) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const decoded = await audioCtxRef.current.decodeAudioData(buf);
      audioBuffersRef.current[url] = decoded;
    } catch (e) {
      console.warn('Failed to pre-decode audio:', url, e);
    }
  };

  // Preload group images and sound assets
  useEffect(() => {
    const urlsToLoad: string[] = [DEFAULT_VIDEO_BACKGROUND];

    BACKGROUND_PRESETS.forEach((preset: any) => {
      if (preset.imageUrl) urlsToLoad.push(preset.imageUrl);
    });

    if (group.matchImageUrl) urlsToLoad.push(group.matchImageUrl);
    if (group.matchCheckImageUrl) urlsToLoad.push(group.matchCheckImageUrl);
    if (group.noMatchImageUrl) urlsToLoad.push(group.noMatchImageUrl);
    if (group.crossImageUrl) urlsToLoad.push(group.crossImageUrl);

    group.items.forEach((item) => {
      if (item.targetImageUrl) urlsToLoad.push(item.targetImageUrl);
      if (item.revealImageUrl) urlsToLoad.push(item.revealImageUrl);
    });

    if (group.backgroundType === 'custom' && group.backgroundValue) {
      urlsToLoad.push(group.backgroundValue);
    }

    urlsToLoad.forEach((url) => {
      if (url && !loadedImagesRef.current[url]) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        img.onload = () => {
          loadedImagesRef.current[url] = img;
          drawStaticFrame();
        };
      }
    });

    // Sound asset preloader
    const soundUrlsToLoad: string[] = [
      DEFAULT_CHECK_AUDIO,
      DEFAULT_CROSS_AUDIO,
      DEFAULT_BACKGROUND_AUDIO,
    ];
    if (group.bgSoundUrl) soundUrlsToLoad.push(group.bgSoundUrl);
    if (group.matchSoundUrl) soundUrlsToLoad.push(group.matchSoundUrl);
    if (group.noMatchSoundUrl) soundUrlsToLoad.push(group.noMatchSoundUrl);
    group.items.forEach((item) => {
      if (item.matchSoundUrl) soundUrlsToLoad.push(item.matchSoundUrl);
    });

    soundUrlsToLoad.forEach((url) => preloadAudio(url));
  }, [group]);

  // Logical Resolution for 9:16 YouTube Short Video
  const W = 1080;
  const H = 1920;

  // Helper to resolve image URL for an item
  const getTargetImgUrl = (item: any) => item.targetImageUrl || group.matchImageUrl;
  const getRevealImgUrl = (item: any) =>
    item.revealImageUrl || (item.isMatch ? group.matchImageUrl : group.noMatchImageUrl);

  // Dynamic slot layout configuration with 4px vertical gaps between rounds to maximize height coverage
  const getSlotLayout = () => {
    const numRounds = group.items.length;
    const gap = 4; // 4px space between top and bottom of images

    if (numRounds >= 4) {
      // 4 Rounds Layout: Maximize vertical space with 4px gaps
      const imgWidth = 410;
      const imgHeight = 410;
      const slotXLeft = 60;
      const slotXRight = slotXLeft + imgWidth; // Direct edge-to-edge touch
      const topMargin = 140;

      // Slot 3 (Top) to Slot 0 (Bottom)
      const slot3Y = topMargin; // 140
      const slot2Y = slot3Y + imgHeight + gap; // 554
      const slot1Y = slot2Y + imgHeight + gap; // 968
      const slot0Y = slot1Y + imgHeight + gap; // 1382

      return {
        numRounds: 4,
        slotYPositions: [slot0Y, slot1Y, slot2Y, slot3Y],
        slotXLeft,
        slotXRight,
        imgWidth,
        imgHeight,
        badgeX: 960,
      };
    } else {
      // 3 Rounds Layout: Maximize vertical space with 4px gaps
      const imgWidth = 450;
      const imgHeight = 530;
      const slotXLeft = 60;
      const slotXRight = slotXLeft + imgWidth; // Direct edge-to-edge touch
      const topMargin = 160;

      // Slot 2 (Top) to Slot 0 (Bottom)
      const slot2Y = topMargin; // 160
      const slot1Y = slot2Y + imgHeight + gap; // 694
      const slot0Y = slot1Y + imgHeight + gap; // 1228

      return {
        numRounds: 3,
        slotYPositions: [slot0Y, slot1Y, slot2Y],
        slotXLeft,
        slotXRight,
        imgWidth,
        imgHeight,
        badgeX: 970,
      };
    }
  };

  // Render Scene Frame function
  const drawSceneFrame = (
    ctx: CanvasRenderingContext2D,
    roundState: {
      roundIndex: number;
      progress: number;
      revealedRounds: boolean[];
    }
  ) => {
    ctx.clearRect(0, 0, W, H);

    const layout = getSlotLayout();

    // 1. Draw Background Scene (Sky & Grass or Custom Preset)
    if (group.backgroundType === 'preset') {
      const preset: any = BACKGROUND_PRESETS.find((p) => p.id === group.backgroundValue) || BACKGROUND_PRESETS[0];
      const bgImg = preset.imageUrl ? loadedImagesRef.current[preset.imageUrl] : loadedImagesRef.current[DEFAULT_VIDEO_BACKGROUND];
      preset.drawCanvas(ctx, W, H, bgImg);
    } else if (group.backgroundType === 'custom' && loadedImagesRef.current[group.backgroundValue]) {
      ctx.drawImage(loadedImagesRef.current[group.backgroundValue], 0, 0, W, H);
    } else {
      const defaultBg = loadedImagesRef.current[DEFAULT_VIDEO_BACKGROUND];
      (BACKGROUND_PRESETS[0] as any).drawCanvas(ctx, W, H, defaultBg);
    }

    // 2. Draw Stacked Target Items on Left Side (Direct Image Contact, No Border Box!)
    group.items.forEach((item, idx) => {
      const slotY = layout.slotYPositions[idx];

      // Target Product Image on left side (Direct Touch)
      const targetImgUrl = getTargetImgUrl(item);
      const targetImg = loadedImagesRef.current[targetImgUrl];
      if (targetImg) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 15;
        ctx.drawImage(targetImg, layout.slotXLeft, slotY, layout.imgWidth, layout.imgHeight);
        ctx.restore();
      }

      // Draw completed reveal right item & result badge for past completed rounds
      if (roundState.revealedRounds[idx]) {
        const revealImgUrl = getRevealImgUrl(item);
        const revealImg = loadedImagesRef.current[revealImgUrl];
        if (revealImg) {
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 15;
          // Connects DIRECTLY to left image edge!
          ctx.drawImage(revealImg, layout.slotXRight, slotY, layout.imgWidth, layout.imgHeight);
          ctx.restore();
        }

        // Final Result Badge (Checkmark / Cross)
        drawBadge(ctx, item.isMatch, layout.badgeX, slotY + layout.imgHeight / 2, 1);
      }
    });

    // 3. Draw Active Round Motion & Step-by-Step Intermediate Non-Match ❌ Overlays
    const activeRound = roundState.roundIndex;
    if (activeRound >= 0 && activeRound < layout.numRounds) {
      const activeItem = group.items[activeRound];
      const topSlotIdx = layout.numRounds - 1;

      // Build slot sequence: from top slot down to target slot for active round
      const slotSequence: number[] = [];
      for (let s = topSlotIdx; s >= activeRound; s--) {
        slotSequence.push(s);
      }
      const totalSteps = slotSequence.length;

      const rawStep = roundState.progress * totalSteps;
      const stepIdx = Math.min(totalSteps - 1, Math.floor(rawStep));
      const stepP = rawStep - stepIdx; // 0.0 to 1.0 within stepIdx

      const targetSlot = slotSequence[stepIdx];
      const endX = layout.slotXRight;
      const endY = layout.slotYPositions[targetSlot];

      let startX = layout.slotXRight;
      let startY = layout.slotYPositions[slotSequence[stepIdx - 1]];
      if (stepIdx === 0) {
        startX = W * 0.90;
        startY = -layout.imgHeight;
      }

      let curX = endX;
      let curY = endY;

      if (stepP < 0.70) {
        const p = stepP / 0.70;
        const eased = Math.sin((p * Math.PI) / 2);
        curX = startX + (endX - startX) * eased;
        curY = startY + (endY - startY) * eased;
      } else {
        curX = endX;
        curY = endY;
      }

      // Draw sliding reveal image consistently for the active item
      const slidingImgUrl = getRevealImgUrl(activeItem);
      const revealImg = loadedImagesRef.current[slidingImgUrl];
      if (revealImg) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 20;
        ctx.drawImage(revealImg, curX, curY, layout.imgWidth, layout.imgHeight);
        ctx.restore();
      }

      // Draw Badge ONLY for the current active step
      if (stepP >= 0.70) {
        const slot = slotSequence[stepIdx];
        const isFinalStep = stepIdx === totalSteps - 1;
        const badgeP = Math.min(1, (stepP - 0.70) / 0.30);
        const badgeScale = badgeP >= 1 ? 1.0 : Math.sin((badgeP * Math.PI) / 2) * 1.15;

        if (isFinalStep) {
          drawBadge(
            ctx,
            activeItem.isMatch,
            layout.badgeX,
            layout.slotYPositions[slot] + layout.imgHeight / 2,
            badgeScale
          );
        } else {
          // Intermediate non-match testing slot
          drawBadge(
            ctx,
            false,
            layout.badgeX,
            layout.slotYPositions[slot] + layout.imgHeight / 2,
            badgeScale
          );
        }
      }
    }
  };

  // Draw Result Badge (Checkmark / Cross)
  const drawBadge = (
    ctx: CanvasRenderingContext2D,
    isMatch: boolean,
    x: number,
    y: number,
    scale: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const customBadgeUrl = isMatch ? group.matchCheckImageUrl : group.crossImageUrl;
    const badgeImg = customBadgeUrl ? loadedImagesRef.current[customBadgeUrl] : null;

    if (badgeImg) {
      ctx.shadowColor = isMatch ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
      ctx.shadowBlur = 25;
      ctx.drawImage(badgeImg, -80, -80, 160, 160);
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 130px sans-serif';
      ctx.shadowColor = isMatch ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)';
      ctx.shadowBlur = 25;
      ctx.fillText(isMatch ? '✅' : '❌', 0, 0);
    }

    ctx.restore();
  };

  const drawStaticFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawSceneFrame(ctx, { roundIndex: -1, progress: 0, revealedRounds: [false, false, false, false] });
  };

  useEffect(() => {
    drawStaticFrame();
  }, [group]);

  // Sound effect playback helper supporting pre-decoded AudioBuffer + Web Audio Synth fallback
  const playSoundEffect = (
    type: 'match' | 'nomatch' | 'finish',
    customUrl: string | undefined,
    destNode: MediaStreamAudioDestinationNode | null
  ) => {
    if (isMuted) return;
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;

    const url =
      customUrl ||
      (type === 'match'
        ? group.matchSoundUrl || DEFAULT_CHECK_AUDIO
        : group.noMatchSoundUrl || DEFAULT_CROSS_AUDIO);

    if (url && !url.startsWith('synth:') && audioBuffersRef.current[url]) {
      try {
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffersRef.current[url];
        const gain = audioCtx.createGain();
        gain.gain.value = type === 'match' ? 0.85 : 0.75;
        source.connect(gain);
        gain.connect(audioCtx.destination);
        if (destNode) gain.connect(destNode);
        source.start(0);
        return;
      } catch (e) {
        console.warn('Buffer play warning:', e);
      }
    }

    // Fallback: HTML5 Audio if buffer not pre-decoded
    if (url && !url.startsWith('synth:')) {
      try {
        const audio = new Audio(url);
        if (destNode) {
          const sourceNode = audioCtx.createMediaElementSource(audio);
          sourceNode.connect(destNode);
          sourceNode.connect(audioCtx.destination);
        }
        audio.play().catch(() => {});
        return;
      } catch (err) {}
    }

    // Fallback: Synthesized Web Audio sound effect
    if (destNode) createSynthAudioSourceNode(audioCtx, destNode, type);
    else playSynthSound(type, audioCtx);
  };

  // Continuous Background Music Player
  const startBgm = (destNode: MediaStreamAudioDestinationNode | null) => {
    if (isMuted || !group.bgSoundUrl) return;
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;

    const bgUrl = group.bgSoundUrl;
    if (audioBuffersRef.current[bgUrl]) {
      try {
        const bgSource = audioCtx.createBufferSource();
        bgSource.buffer = audioBuffersRef.current[bgUrl];
        bgSource.loop = true;
        const bgGain = audioCtx.createGain();
        bgGain.gain.value = 0.25;

        bgSource.connect(bgGain);
        bgGain.connect(audioCtx.destination);
        if (destNode) bgGain.connect(destNode);
        bgSource.start(0);
        activeBgmSourceRef.current = bgSource;
        return;
      } catch (e) {
        console.warn('BGM buffer play warning:', e);
      }
    }

    // HTML5 Audio fallback for BGM
    try {
      const bgAudio = new Audio(bgUrl);
      bgAudio.loop = true;
      bgAudio.volume = 0.25;
      if (destNode && audioCtx) {
        const sourceNode = audioCtx.createMediaElementSource(bgAudio);
        sourceNode.connect(destNode);
        sourceNode.connect(audioCtx.destination);
      }
      bgAudio.play().catch(() => {});
      activeBgmSourceRef.current = bgAudio;
    } catch (e) {}
  };

  const stopBgm = () => {
    if (activeBgmSourceRef.current) {
      try {
        if ('stop' in activeBgmSourceRef.current && typeof activeBgmSourceRef.current.stop === 'function') {
          activeBgmSourceRef.current.stop();
        } else if ('pause' in activeBgmSourceRef.current && typeof activeBgmSourceRef.current.pause === 'function') {
          (activeBgmSourceRef.current as HTMLAudioElement).pause();
        }
      } catch (e) {}
      activeBgmSourceRef.current = null;
    }
  };

  // Animation Loop Routine
  const startAnimation = async (isExportMode = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioCtx = audioCtxRef.current;
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    let destNode: MediaStreamAudioDestinationNode | null = null;
    if (isExportMode) {
      destNode = audioCtx.createMediaStreamDestination();
      recordedChunksRef.current = [];

      const canvasStream = canvas.captureStream(60);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destNode.stream.getAudioTracks(),
      ]);

      const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
        ? 'video/mp4;codecs=avc1'
        : MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : 'video/webm;codecs=vp9';

      const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 6000000 });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const downloadUrl = URL.createObjectURL(blob);
        setRenderProgress({
          isRendering: false,
          progress: 100,
          message: 'Short video creation complete!',
          downloadUrl,
        });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
    }

    setIsPlaying(true);
    playedStepSoundsRef.current = {};
    setRenderProgress({
      isRendering: isExportMode,
      progress: 0,
      message: isExportMode ? 'Rendering YouTube Shorts video...' : '',
    });

    // Start background audio music track
    startBgm(destNode);

    const totalRounds = group.items.length;
    const revealedRounds = new Array(totalRounds).fill(false);
    const totalVideoSec = group.videoDuration || 10;
    const durationPerRound = (totalVideoSec * 1000) / totalRounds;

    startTimeRef.current = performance.now();

    const loop = (now: number) => {
      const elapsedTotal = now - startTimeRef.current;
      const roundIndex = Math.min(totalRounds - 1, Math.floor(elapsedTotal / durationPerRound));
      const currentRoundElapsed = elapsedTotal - roundIndex * durationPerRound;
      const progress = Math.min(1, Math.max(0, currentRoundElapsed / durationPerRound));

      // Precise Step Sound Trigger
      if (roundIndex >= 0 && roundIndex < totalRounds) {
        const topSlotIdx = totalRounds - 1;
        const totalSteps = topSlotIdx - roundIndex + 1;
        const rawStep = progress * totalSteps;
        const stepIdx = Math.min(totalSteps - 1, Math.floor(rawStep));
        const stepP = rawStep - stepIdx;

        const soundKey = `r${roundIndex}_step${stepIdx}`;
        if (!isMuted && stepP >= 0.70 && !playedStepSoundsRef.current[soundKey]) {
          playedStepSoundsRef.current[soundKey] = true;
          const currentItem = group.items[roundIndex];
          const isFinalStep = stepIdx === totalSteps - 1;

          if (isFinalStep) {
            revealedRounds[roundIndex] = true;
            const soundType = currentItem.isMatch ? 'match' : 'nomatch';
            const customUrl =
              currentItem.matchSoundUrl || (currentItem.isMatch ? group.matchSoundUrl : group.noMatchSoundUrl);
            playSoundEffect(soundType, customUrl, destNode);
          } else {
            const soundType = 'nomatch';
            const customUrl = group.noMatchSoundUrl;
            playSoundEffect(soundType, customUrl, destNode);
          }
        }
      }

      if (isExportMode) {
        const overallProgress = Math.min(99, Math.round((elapsedTotal / (totalRounds * durationPerRound)) * 100));
        setRenderProgress((prev) => ({ ...prev, progress: overallProgress }));
      }

      drawSceneFrame(ctx, {
        roundIndex,
        progress,
        revealedRounds,
      });

      if (elapsedTotal < totalRounds * durationPerRound) {
        animFrameRef.current = requestAnimationFrame(loop);
      } else {
        // Victory fanfare chime upon complete video reveal
        if (!isMuted) {
          if (destNode) createSynthAudioSourceNode(audioCtx, destNode, 'finish');
          else playSynthSound('finish', audioCtx);
        }
        stopBgm();

        setTimeout(() => {
          setIsPlaying(false);
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, 800);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  const handleStop = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    stopBgm();
    setIsPlaying(false);
    if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
      audioCtxRef.current.suspend();
    }
    drawStaticFrame();
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* YouTube Shorts Frame Container (Phone Mockup Style 9:16) */}
      <div className="relative w-full max-w-[360px] aspect-[9/16] rounded-[36px] overflow-hidden shadow-2xl border-[6px] border-[var(--color-glass-border)] bg-black ring-1 ring-white/20">
        {/* Aspect ratio label badge */}
        <div className="absolute top-4 left-4 glass px-2.5 py-1 rounded-full text-[0.6875rem] font-extrabold text-indigo-300 flex items-center gap-1.5 z-10 shadow-md">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          <span>9:16 YOUTUBE SHORTS</span>
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => (isPlaying ? handleStop() : startAnimation(false))}
        />

        {isPlaying && (
          <div className="absolute bottom-4 left-4 glass px-3 py-1 rounded-full text-[0.6875rem] font-bold text-emerald-400 flex items-center gap-1.5 animate-pulse z-10">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>PLAYING 9:16 PREVIEW</span>
          </div>
        )}
      </div>

      {/* Buttons & Download Bar */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {!isPlaying ? (
          <button
            onClick={() => startAnimation(false)}
            className="btn-primary text-xs sm:text-sm font-bold px-6 py-3 rounded-full flex items-center gap-2 shadow-lg shadow-indigo-500/25 hover:scale-105 transition-all"
          >
            <span>▶️ Play Preview</span>
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="btn-secondary text-xs sm:text-sm font-bold px-6 py-3 rounded-full flex items-center gap-2 border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <span>⏹️ Stop Preview</span>
          </button>
        )}

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="btn-secondary text-xs sm:text-sm font-bold px-4 py-3 rounded-full flex items-center gap-2 border-white/20 hover:border-white/40"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          <span>{isMuted ? '🔇 Muted' : '🔊 Sound On'}</span>
        </button>

        <button
          onClick={() => startAnimation(true)}
          disabled={isPlaying || renderProgress.isRendering}
          className="btn-accent text-xs sm:text-sm font-bold px-6 py-3 rounded-full flex items-center gap-2 shadow-lg shadow-purple-500/25 hover:scale-105 transition-all disabled:opacity-50"
        >
          <span>🎬 Generate & Download Video</span>
        </button>
      </div>

      {/* Download Status Card */}
      {(renderProgress.isRendering || renderProgress.downloadUrl) && (
        <div className="w-full max-w-md p-4 rounded-2xl glass border border-indigo-500/30 space-y-3 bg-indigo-500/10 animate-fade-in">
          {renderProgress.isRendering ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-indigo-300">
                <span>{renderProgress.message}</span>
                <span>{renderProgress.progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full gradient-primary transition-all duration-200"
                  style={{ width: `${renderProgress.progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-emerald-400">🎉 Shorts Video Ready!</div>
                <div className="text-[0.6875rem] text-[var(--color-text-muted)]">
                  9:16 Vertical Short with sync sounds & overlays
                </div>
              </div>
              <a
                href={renderProgress.downloadUrl}
                download={`${group.name.toLowerCase().replace(/\s+/g, '-')}-match-short.mp4`}
                className="btn-success text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 font-bold shadow-lg whitespace-nowrap"
              >
                <span>⬇️ Download MP4</span>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
